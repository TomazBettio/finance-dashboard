'use server'

import { db } from '@/lib/db'
import { movementReasons } from '@/modules/inventory/schema'
import { tenantModules } from '@/modules/core/schema'
import { requireRole } from '@/lib/auth/session'
import { requireModule, getEnabledModuleKeys } from '@/lib/modules'
import { MODULES, getModule, isModuleKey, type ModuleKey } from '@/modules/registry'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: true } | null

type TenantCtx = Awaited<ReturnType<typeof requireRole>>

// requireRole lança Error('Sem permissão'); converte para null mantendo redirects (NEXT_REDIRECT) intactos.
async function tryRequireRole(roles: ('owner' | 'admin' | 'member')[]): Promise<TenantCtx | null> {
  try {
    return await requireRole(roles)
  } catch (err) {
    if (err instanceof Error && err.message === 'Sem permissão') return null
    throw err
  }
}

async function requireModuleAdmin(key: ModuleKey): Promise<TenantCtx | null> {
  await requireModule(key)
  return tryRequireRole(['owner', 'admin'])
}

export async function setModuleEnabled(
  moduleKey: string,
  enabled: boolean,
): Promise<{ error: string } | { success: true }> {
  const ctx = await tryRequireRole(['owner', 'admin'])
  if (!ctx) return { error: 'Você não tem permissão para alterar módulos' }

  if (!isModuleKey(moduleKey)) return { error: 'Módulo inválido' }
  if (typeof enabled !== 'boolean') return { error: 'Parâmetro inválido' }

  const mod = getModule(moduleKey)
  if (!mod || mod.status === 'coming_soon') return { error: 'Módulo ainda não disponível' }

  const enabledModules = await getEnabledModuleKeys(ctx.tenant.id)

  if (enabled) {
    const missing = mod.dependsOn.filter((dep) => !enabledModules.has(dep))
    if (missing.length > 0) {
      return { error: `Ative antes: ${missing.map((d) => getModule(d)?.name ?? d).join(', ')}` }
    }
  } else {
    const dependents = MODULES.filter(
      (m) => m.dependsOn.includes(moduleKey) && enabledModules.has(m.key),
    )
    if (dependents.length > 0) {
      return { error: `Desative antes: ${dependents.map((m) => m.name).join(', ')}` }
    }
  }

  await db
    .insert(tenantModules)
    .values({ tenantId: ctx.tenant.id, moduleKey, enabled })
    .onConflictDoUpdate({
      target: [tenantModules.tenantId, tenantModules.moduleKey],
      set: { enabled, updatedAt: new Date() },
    })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function createMovementReason(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireModuleAdmin('inventory')
  if (!ctx) return { error: 'Você não tem permissão para alterar motivos' }
  const tenantId = ctx.tenant.id

  const name = String(formData.get('name') ?? '').trim()
  const type = String(formData.get('type') ?? '')

  if (!name) return { error: 'Nome é obrigatório' }
  if (name.length > 255) return { error: 'Nome muito longo' }
  if (type !== 'entry' && type !== 'exit') return { error: 'Tipo inválido' }

  const [existing] = await db
    .select({ id: movementReasons.id })
    .from(movementReasons)
    .where(
      and(
        eq(movementReasons.tenantId, tenantId),
        eq(movementReasons.name, name),
        eq(movementReasons.type, type),
      ),
    )
    .limit(1)

  if (existing) return { error: 'Motivo já cadastrado para este tipo' }

  await db.insert(movementReasons).values({ tenantId, name, type })

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/inventory')
  return { success: true }
}

export async function deleteMovementReason(id: number): Promise<void> {
  const ctx = await requireModuleAdmin('inventory')
  if (!ctx) return
  if (!Number.isInteger(id) || id <= 0) return

  await db
    .delete(movementReasons)
    .where(and(eq(movementReasons.id, id), eq(movementReasons.tenantId, ctx.tenant.id)))

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/inventory')
}
