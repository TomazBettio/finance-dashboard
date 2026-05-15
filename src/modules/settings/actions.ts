'use server'

import { db } from '@/lib/db'
import { movementReasons } from '@/modules/inventory/schema'
import { getOrCreateTenant } from '@/lib/tenant'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: true } | null

export async function createMovementReason(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenantId = (await getOrCreateTenant()).id
  const name = (formData.get('name') as string)?.trim()
  const type = formData.get('type') as 'entry' | 'exit'

  if (!name) return { error: 'Nome é obrigatório' }
  if (!['entry', 'exit'].includes(type)) return { error: 'Tipo inválido' }

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
  await db.delete(movementReasons).where(eq(movementReasons.id, id))
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/inventory')
}
