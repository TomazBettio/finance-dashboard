import { db } from '@/lib/db'
import { customFieldDefinitions } from './schema'
import { and, asc, eq } from 'drizzle-orm'

export async function getProductFieldDefs(tenantId: number) {
  return db
    .select()
    .from(customFieldDefinitions)
    .where(
      and(
        eq(customFieldDefinitions.tenantId, tenantId),
        eq(customFieldDefinitions.entity, 'product'),
      ),
    )
    .orderBy(asc(customFieldDefinitions.position), asc(customFieldDefinitions.id))
}
