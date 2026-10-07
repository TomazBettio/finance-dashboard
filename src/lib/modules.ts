import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tenantModules } from '@/modules/core/schema'
import { MODULES, isModuleKey, type ModuleKey } from '@/modules/registry'
import { requireTenant } from '@/lib/auth/session'

export async function getEnabledModuleKeys(tenantId: number): Promise<Set<ModuleKey>> {
  const rows = await db
    .select({ moduleKey: tenantModules.moduleKey, enabled: tenantModules.enabled })
    .from(tenantModules)
    .where(eq(tenantModules.tenantId, tenantId))

  const overrides = new Map<ModuleKey, boolean>()
  for (const row of rows) {
    if (isModuleKey(row.moduleKey)) overrides.set(row.moduleKey, row.enabled)
  }

  const enabled = new Set<ModuleKey>()
  for (const mod of MODULES) {
    if (mod.status === 'coming_soon') continue
    const on = overrides.get(mod.key) ?? mod.defaultEnabled
    if (on && mod.dependsOn.every((dep) => enabled.has(dep))) enabled.add(mod.key)
  }
  return enabled
}

export async function requireModule(key: ModuleKey) {
  const ctx = await requireTenant()
  const enabledModules = await getEnabledModuleKeys(ctx.tenant.id)
  if (!enabledModules.has(key)) notFound()
  return { ...ctx, enabledModules }
}
