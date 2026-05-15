import { db } from './db'
import { tenants } from '@/modules/core/schema'

export async function getOrCreateTenant() {
  const rows = await db.select().from(tenants).limit(1)
  if (rows.length > 0) return rows[0]
  const [tenant] = await db
    .insert(tenants)
    .values({ name: 'Minha Empresa', slug: 'minha-empresa' })
    .returning()
  return tenant
}
