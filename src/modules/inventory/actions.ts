'use server'

import { db } from '@/lib/db'
import { products, inventoryStock, stockMovements, movementReasons } from './schema'
import { requireTenant } from '@/lib/auth/session'
import { and, eq, gte, lte, ne, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: true } | null

const MAX_INT = 2147483647

// Aceita pt-BR ("1.234,56", "1234,56", "1234") e decimal com ponto ("1234.56"); retorna centavos ou null se inválido.
function parsePrice(raw: string | null): number | null {
  const value = (raw ?? '').trim()
  if (value === '') return 0

  let normalized: string
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(value)) {
    normalized = value.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+(,\d{1,2})?$/.test(value)) {
    normalized = value.replace(',', '.')
  } else if (/^\d+\.\d{1,2}$/.test(value)) {
    normalized = value
  } else {
    return null
  }

  const cents = Math.round(Number(normalized) * 100)
  return Number.isSafeInteger(cents) && cents <= MAX_INT ? cents : null
}

function parseId(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim())
  return Number.isInteger(n) && n > 0 ? n : null
}

function parseQuantity(raw: unknown): number | null {
  const n = Number(String(raw ?? '').trim())
  return Number.isInteger(n) && n >= 0 && n <= MAX_INT ? n : null
}

type ProductFields = {
  name: string
  sku: string | null
  basePrice: number
  quantity: number
  location: string | null
}

type ProductFieldsResult =
  | { ok: true; data: ProductFields }
  | { ok: false; error: string }

function readProductFields(formData: FormData): ProductFieldsResult {
  const name = String(formData.get('name') ?? '').trim()
  const sku = String(formData.get('sku') ?? '').trim() || null
  const basePrice = parsePrice(formData.get('basePrice') as string | null)
  const quantity = parseQuantity(formData.get('quantity'))
  const location = String(formData.get('location') ?? '').trim() || null

  if (!name) return { ok: false, error: 'Nome é obrigatório' }
  if (name.length > 255) return { ok: false, error: 'Nome muito longo' }
  if (sku && sku.length > 255) return { ok: false, error: 'SKU muito longo' }
  if (basePrice === null) return { ok: false, error: 'Preço inválido' }
  if (quantity === null) return { ok: false, error: 'Quantidade inválida' }

  return { ok: true, data: { name, sku, basePrice, quantity, location } }
}

// O Drizzle encapsula o erro do Postgres em DrizzleQueryError.cause.
function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: unknown; cause?: { code?: unknown; constraint_name?: unknown } } | null
  const code =
    typeof e?.code === 'string'
      ? e.code
      : typeof e?.cause?.code === 'string'
        ? e.cause.code
        : undefined
  if (code !== '23505') return false
  const constraint =
    typeof e?.cause?.constraint_name === 'string' ? e.cause.constraint_name : undefined
  return constraint === undefined || constraint === 'products_tenant_sku_unique'
}

export async function createProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { tenant } = await requireTenant()
  const tenantId = tenant.id

  const fields = readProductFields(formData)
  if (!fields.ok) return { error: fields.error }
  const { name, sku, basePrice, quantity, location } = fields.data

  try {
    const result = await db.transaction(async (tx): Promise<ActionState> => {
      if (sku) {
        const [dup] = await tx
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.tenantId, tenantId), eq(products.sku, sku)))
          .limit(1)
        if (dup) return { error: 'SKU já cadastrado nesta empresa' }
      }

      const [product] = await tx
        .insert(products)
        .values({ tenantId, name, sku, basePrice })
        .returning({ id: products.id })
      await tx
        .insert(inventoryStock)
        .values({ tenantId, productId: product.id, quantity, location })

      return { success: true }
    })
    if (result && 'error' in result) return result
  } catch (err) {
    if (isUniqueViolation(err)) return { error: 'SKU já cadastrado nesta empresa' }
    throw err
  }

  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateProduct(
  id: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { tenant } = await requireTenant()
  const tenantId = tenant.id

  if (!Number.isInteger(id) || id <= 0) return { error: 'Produto inválido' }

  const fields = readProductFields(formData)
  if (!fields.ok) return { error: fields.error }
  const { name, sku, basePrice, quantity, location } = fields.data

  try {
    const result = await db.transaction(async (tx): Promise<ActionState> => {
      const [product] = await tx
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
        .limit(1)
      if (!product) return { error: 'Produto não encontrado' }

      if (sku) {
        const [dup] = await tx
          .select({ id: products.id })
          .from(products)
          .where(
            and(
              eq(products.tenantId, tenantId),
              eq(products.sku, sku),
              ne(products.id, id),
            ),
          )
          .limit(1)
        if (dup) return { error: 'SKU já cadastrado nesta empresa' }
      }

      await tx
        .update(products)
        .set({ name, sku, basePrice, updatedAt: new Date() })
        .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))

      const [existing] = await tx
        .select({ id: inventoryStock.id })
        .from(inventoryStock)
        .where(and(eq(inventoryStock.productId, id), eq(inventoryStock.tenantId, tenantId)))
        .limit(1)

      if (existing) {
        await tx
          .update(inventoryStock)
          .set({ quantity, location, updatedAt: new Date() })
          .where(and(eq(inventoryStock.id, existing.id), eq(inventoryStock.tenantId, tenantId)))
      } else {
        await tx
          .insert(inventoryStock)
          .values({ tenantId, productId: id, quantity, location })
      }

      return { success: true }
    })
    if (result && 'error' in result) return result
  } catch (err) {
    if (isUniqueViolation(err)) return { error: 'SKU já cadastrado nesta empresa' }
    throw err
  }

  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteProduct(id: number): Promise<void> {
  const { tenant } = await requireTenant()
  const tenantId = tenant.id
  if (!Number.isInteger(id) || id <= 0) return

  await db.transaction(async (tx) => {
    await tx
      .delete(stockMovements)
      .where(and(eq(stockMovements.productId, id), eq(stockMovements.tenantId, tenantId)))
    await tx
      .delete(inventoryStock)
      .where(and(eq(inventoryStock.productId, id), eq(inventoryStock.tenantId, tenantId)))
    await tx
      .delete(products)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
  })

  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard')
}

export async function registerStockMovement(
  productId: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { tenant } = await requireTenant()
  const tenantId = tenant.id

  const type = String(formData.get('type') ?? '')
  const quantity = parseQuantity(formData.get('quantity'))
  const reasonIdRaw = String(formData.get('reasonId') ?? '').trim()
  const reasonId = reasonIdRaw ? parseId(reasonIdRaw) : null

  if (parseId(productId) === null) return { error: 'Produto inválido' }
  if (type !== 'entry' && type !== 'exit') return { error: 'Tipo inválido' }
  if (quantity === null || quantity <= 0) return { error: 'Quantidade deve ser maior que zero' }
  if (reasonIdRaw && reasonId === null) return { error: 'Motivo inválido' }

  const result = await db.transaction(async (tx): Promise<ActionState> => {
    const [product] = await tx
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
      .limit(1)
    if (!product) return { error: 'Produto não encontrado' }

    const [stock] = await tx
      .select({ id: inventoryStock.id, quantity: inventoryStock.quantity })
      .from(inventoryStock)
      .where(and(eq(inventoryStock.productId, productId), eq(inventoryStock.tenantId, tenantId)))
      .limit(1)
    if (!stock) return { error: 'Produto sem registro de estoque' }

    if (reasonId !== null) {
      const [reason] = await tx
        .select({ id: movementReasons.id })
        .from(movementReasons)
        .where(
          and(
            eq(movementReasons.id, reasonId),
            eq(movementReasons.tenantId, tenantId),
            eq(movementReasons.type, type),
          ),
        )
        .limit(1)
      if (!reason) return { error: 'Motivo inválido' }
    }

    if (type === 'exit') {
      // Baixa atômica: o WHERE garante que o estoque nunca fica negativo,
      // mesmo com saídas concorrentes.
      const updated = await tx
        .update(inventoryStock)
        .set({
          quantity: sql`${inventoryStock.quantity} - ${quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryStock.id, stock.id),
            eq(inventoryStock.tenantId, tenantId),
            gte(inventoryStock.quantity, quantity),
          ),
        )
        .returning({ id: inventoryStock.id })
      if (updated.length === 0) {
        const [current] = await tx
          .select({ quantity: inventoryStock.quantity })
          .from(inventoryStock)
          .where(and(eq(inventoryStock.id, stock.id), eq(inventoryStock.tenantId, tenantId)))
          .limit(1)
        const available = current?.quantity ?? 0
        return {
          error: `Estoque insuficiente. Disponível: ${available} unidade${available !== 1 ? 's' : ''}`,
        }
      }
    } else {
      const updated = await tx
        .update(inventoryStock)
        .set({
          quantity: sql`${inventoryStock.quantity} + ${quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryStock.id, stock.id),
            eq(inventoryStock.tenantId, tenantId),
            lte(inventoryStock.quantity, MAX_INT - quantity),
          ),
        )
        .returning({ id: inventoryStock.id })
      if (updated.length === 0) {
        return { error: 'Quantidade excede o limite de estoque' }
      }
    }

    await tx
      .insert(stockMovements)
      .values({ tenantId, productId, type, quantity, reasonId })

    return { success: true }
  })

  if (result && 'error' in result) return result
  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard')
  return { success: true }
}
