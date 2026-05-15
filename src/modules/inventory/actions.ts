'use server'

import { db } from '@/lib/db'
import { products, inventoryStock } from './schema'
import { getOrCreateTenant } from '@/lib/tenant'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: true } | null

function parsePrice(raw: string | null): number {
  return Math.round(parseFloat((raw ?? '0').replace(',', '.')) * 100)
}

export async function createProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenantId = (await getOrCreateTenant()).id
  const name = (formData.get('name') as string)?.trim()
  const sku = (formData.get('sku') as string)?.trim() || null
  const basePrice = parsePrice(formData.get('basePrice') as string)
  const quantity = parseInt(formData.get('quantity') as string) || 0
  const location = (formData.get('location') as string)?.trim() || null

  if (!name) return { error: 'Nome é obrigatório' }
  if (isNaN(basePrice) || basePrice < 0) return { error: 'Preço inválido' }

  const [product] = await db
    .insert(products)
    .values({ tenantId, name, sku, basePrice })
    .returning({ id: products.id })

  await db.insert(inventoryStock).values({ tenantId, productId: product.id, quantity, location })

  revalidatePath('/dashboard/inventory')
  return { success: true }
}

export async function updateProduct(
  id: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenantId = (await getOrCreateTenant()).id
  const name = (formData.get('name') as string)?.trim()
  const sku = (formData.get('sku') as string)?.trim() || null
  const basePrice = parsePrice(formData.get('basePrice') as string)
  const quantity = parseInt(formData.get('quantity') as string) || 0
  const location = (formData.get('location') as string)?.trim() || null

  if (!name) return { error: 'Nome é obrigatório' }
  if (isNaN(basePrice) || basePrice < 0) return { error: 'Preço inválido' }

  await db
    .update(products)
    .set({ name, sku, basePrice, updatedAt: new Date() })
    .where(eq(products.id, id))

  const [existing] = await db
    .select({ id: inventoryStock.id })
    .from(inventoryStock)
    .where(eq(inventoryStock.productId, id))
    .limit(1)

  if (existing) {
    await db
      .update(inventoryStock)
      .set({ quantity, location, updatedAt: new Date() })
      .where(eq(inventoryStock.productId, id))
  } else {
    await db.insert(inventoryStock).values({ tenantId, productId: id, quantity, location })
  }

  revalidatePath('/dashboard/inventory')
  return { success: true }
}

export async function deleteProduct(id: number): Promise<void> {
  await db.delete(inventoryStock).where(eq(inventoryStock.productId, id))
  await db.delete(products).where(eq(products.id, id))
  revalidatePath('/dashboard/inventory')
}
