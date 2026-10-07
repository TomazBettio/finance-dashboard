import { db } from '@/lib/db'
import { products, inventoryStock, movementReasons } from '@/modules/inventory/schema'
import { requireModule } from '@/lib/modules'
import { getProductFieldDefs } from '@/modules/custom-fields/queries'
import { and, eq } from 'drizzle-orm'
import { ProductTable } from '@/components/inventory/product-table'

export default async function InventoryPage() {
  const { tenant } = await requireModule('inventory')

  const [rows, reasons, fieldDefs] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        basePrice: products.basePrice,
        quantity: inventoryStock.quantity,
        location: inventoryStock.location,
        metadata: products.metadata,
      })
      .from(products)
      .leftJoin(
        inventoryStock,
        and(eq(products.id, inventoryStock.productId), eq(inventoryStock.tenantId, tenant.id)),
      )
      .where(eq(products.tenantId, tenant.id)),
    db
      .select({
        id: movementReasons.id,
        name: movementReasons.name,
        type: movementReasons.type,
      })
      .from(movementReasons)
      .where(eq(movementReasons.tenantId, tenant.id)),
    getProductFieldDefs(tenant.id),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
        <p className="text-muted-foreground">
          {rows.length} produto{rows.length !== 1 ? 's' : ''} cadastrado{rows.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ProductTable products={rows} reasons={reasons} fieldDefs={fieldDefs} />
    </div>
  )
}
