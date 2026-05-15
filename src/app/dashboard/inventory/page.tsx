import { db } from '@/lib/db'
import { products, inventoryStock, movementReasons } from '@/modules/inventory/schema'
import { getOrCreateTenant } from '@/lib/tenant'
import { eq } from 'drizzle-orm'
import { ProductTable } from '@/components/inventory/product-table'

export default async function InventoryPage() {
  const tenant = await getOrCreateTenant()

  const [rows, reasons] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        basePrice: products.basePrice,
        quantity: inventoryStock.quantity,
        location: inventoryStock.location,
      })
      .from(products)
      .leftJoin(inventoryStock, eq(products.id, inventoryStock.productId))
      .where(eq(products.tenantId, tenant.id)),
    db
      .select({
        id: movementReasons.id,
        name: movementReasons.name,
        type: movementReasons.type,
      })
      .from(movementReasons)
      .where(eq(movementReasons.tenantId, tenant.id)),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
        <p className="text-muted-foreground">
          {rows.length} produto{rows.length !== 1 ? 's' : ''} cadastrado{rows.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ProductTable products={rows} reasons={reasons} />
    </div>
  )
}
