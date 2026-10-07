'use server'

import { db } from '@/lib/db'
import { movementReasons } from '@/modules/inventory/schema'
import { requireTenant } from '@/lib/auth/session'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: true } | null

export async function createMovementReason(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { tenant } = await requireTenant()
  const tenantId = tenant.id

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
  const { tenant } = await requireTenant()
  if (!Number.isInteger(id) || id <= 0) return

  await db
    .delete(movementReasons)
    .where(and(eq(movementReasons.id, id), eq(movementReasons.tenantId, tenant.id)))

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/inventory')
}
