'use server'

import { db } from '@/lib/db'
import { customFieldDefinitions } from './schema'
import { requireRole } from '@/lib/auth/session'
import { requireModule } from '@/lib/modules'
import { slugifyFieldKey } from './validation'
import { and, asc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

const ENTITY = 'product'

// Namespace do advisory lock (2 inteiros) que serializa create/move por tenant.
const CUSTOM_FIELDS_LOCK_NS = 420002

type ActionState = { error: string } | { success: true } | null

type TenantCtx = Awaited<ReturnType<typeof requireRole>>

async function requireModuleAdmin(): Promise<TenantCtx | null> {
  await requireModule('inventory')
  try {
    return await requireRole(['owner', 'admin'])
  } catch (err) {
    if (err instanceof Error && err.message === 'Sem permissão') return null
    throw err
  }
}

function parseOptions(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function validateOptions(options: string[]): string | null {
  if (options.length === 0) return 'Informe ao menos uma opção'
  if (options.length > 50) return 'Máximo de 50 opções'
  if (new Set(options).size !== options.length) return 'Opções duplicadas'
  if (options.some((o) => o.length > 100)) return 'Opção com mais de 100 caracteres'
  return null
}

function validateType(type: string): type is 'text' | 'number' | 'date' | 'boolean' | 'select' {
  return ['text', 'number', 'date', 'boolean', 'select'].includes(type)
}

export async function createCustomField(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireModuleAdmin()
  if (!ctx) return { error: 'Você não tem permissão para alterar campos' }
  const tenantId = ctx.tenant.id

  const label = String(formData.get('label') ?? '').trim()
  const type = String(formData.get('type') ?? '')
  const required = formData.get('required') !== null
  const showInTable = formData.get('showInTable') !== null
  const options = parseOptions(String(formData.get('options') ?? ''))

  if (!label) return { error: 'Rótulo é obrigatório' }
  if (label.length > 255) return { error: 'Rótulo muito longo' }
  if (!validateType(type)) return { error: 'Tipo inválido' }
  if (type === 'select') {
    const err = validateOptions(options)
    if (err) return { error: err }
  }

  const baseKey = slugifyFieldKey(label)
  if (!baseKey) return { error: 'Rótulo não gera um identificador válido' }

  const result = await db.transaction(async (tx): Promise<ActionState> => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${CUSTOM_FIELDS_LOCK_NS}, ${tenantId})`)

    const [maxPos] = await tx
      .select({ max: sql<number>`coalesce(max(${customFieldDefinitions.position}), -1)` })
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.tenantId, tenantId),
          eq(customFieldDefinitions.entity, ENTITY),
        ),
      )
    const position = (maxPos?.max ?? -1) + 1

    for (let i = 0; i < 10; i++) {
      const suffix = i === 0 ? '' : `_${i + 1}`
      const key = `${baseKey.slice(0, 64 - suffix.length)}${suffix}`
      const [created] = await tx
        .insert(customFieldDefinitions)
        .values({
          tenantId,
          entity: ENTITY,
          key,
          label,
          type,
          options: type === 'select' ? options : [],
          required,
          showInTable,
          position,
        })
        .onConflictDoNothing()
        .returning({ id: customFieldDefinitions.id })
      if (created) return { success: true }
    }

    return { error: 'Já existem muitos campos com nomes parecidos' }
  })

  if (result && 'error' in result) return result
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/inventory')
  return { success: true }
}

export async function updateCustomField(
  id: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireModuleAdmin()
  if (!ctx) return { error: 'Você não tem permissão para alterar campos' }
  const tenantId = ctx.tenant.id

  if (!Number.isInteger(id) || id <= 0) return { error: 'Campo inválido' }

  const label = String(formData.get('label') ?? '').trim()
  const required = formData.get('required') !== null
  const showInTable = formData.get('showInTable') !== null

  if (!label) return { error: 'Rótulo é obrigatório' }
  if (label.length > 255) return { error: 'Rótulo muito longo' }

  const [def] = await db
    .select({ type: customFieldDefinitions.type })
    .from(customFieldDefinitions)
    .where(
      and(
        eq(customFieldDefinitions.id, id),
        eq(customFieldDefinitions.tenantId, tenantId),
        eq(customFieldDefinitions.entity, ENTITY),
      ),
    )
    .limit(1)
  if (!def) return { error: 'Campo não encontrado' }

  let options: string[] = []
  if (def.type === 'select') {
    options = parseOptions(String(formData.get('options') ?? ''))
    const err = validateOptions(options)
    if (err) return { error: err }
  }

  await db
    .update(customFieldDefinitions)
    .set({ label, options, required, showInTable, updatedAt: new Date() })
    .where(
      and(
        eq(customFieldDefinitions.id, id),
        eq(customFieldDefinitions.tenantId, tenantId),
        eq(customFieldDefinitions.entity, ENTITY),
      ),
    )

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/inventory')
  return { success: true }
}

export async function deleteCustomField(id: number): Promise<void> {
  const ctx = await requireModuleAdmin()
  if (!ctx) return
  if (!Number.isInteger(id) || id <= 0) return

  await db
    .delete(customFieldDefinitions)
    .where(
      and(
        eq(customFieldDefinitions.id, id),
        eq(customFieldDefinitions.tenantId, ctx.tenant.id),
        eq(customFieldDefinitions.entity, ENTITY),
      ),
    )

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/inventory')
}

export async function moveCustomField(
  id: number,
  direction: 'up' | 'down',
): Promise<ActionState> {
  const ctx = await requireModuleAdmin()
  if (!ctx) return { error: 'Você não tem permissão para alterar campos' }
  const tenantId = ctx.tenant.id

  if (!Number.isInteger(id) || id <= 0) return { error: 'Campo inválido' }
  if (direction !== 'up' && direction !== 'down') return { error: 'Direção inválida' }

  const result = await db.transaction(async (tx): Promise<ActionState> => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${CUSTOM_FIELDS_LOCK_NS}, ${tenantId})`)

    const defs = await tx
      .select()
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.tenantId, tenantId),
          eq(customFieldDefinitions.entity, ENTITY),
        ),
      )
      .orderBy(asc(customFieldDefinitions.position), asc(customFieldDefinitions.id))

    const index = defs.findIndex((d) => d.id === id)
    if (index === -1) return { error: 'Campo não encontrado' }

    const swapWith = direction === 'up' ? index - 1 : index + 1
    if (swapWith < 0 || swapWith >= defs.length) return { success: true }

    const reordered = [...defs]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(swapWith, 0, moved)

    // Regrava position = índice apenas onde mudou (normaliza empates existentes).
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].position !== i) {
        await tx
          .update(customFieldDefinitions)
          .set({ position: i, updatedAt: new Date() })
          .where(eq(customFieldDefinitions.id, reordered[i].id))
      }
    }

    return { success: true }
  })

  if (result && 'error' in result) return result
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/inventory')
  return { success: true }
}
