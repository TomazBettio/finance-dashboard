import { db } from '@/lib/db'
import { products, inventoryStock, stockMovements, movementReasons } from '@/modules/inventory/schema'
import { requireTenant } from '@/lib/auth/session'
import { eq, sum, count, sql, desc, and, gte } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, AlertCircle, ArrowDownToLine, ArrowUpFromLine, Layers } from 'lucide-react'
import { MovementsChart, type ChartPoint } from '@/components/dashboard/movements-chart'

export const dynamic = 'force-dynamic'

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'agora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.floor(hours / 24)}d`
}

function buildChartData(
  rows: Array<{ day: string; type: 'entry' | 'exit'; total: string | null }>,
): ChartPoint[] {
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

  const days: string[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    days.push(d.toISOString().split('T')[0])
  }

  const map = new Map<string, { entrada: number; saida: number }>()
  for (const row of rows) {
    if (!map.has(row.day)) map.set(row.day, { entrada: 0, saida: 0 })
    const point = map.get(row.day)!
    if (row.type === 'entry') point.entrada += Number(row.total ?? 0)
    else point.saida += Number(row.total ?? 0)
  }

  return days.map((day) => {
    const [, m, d] = day.split('-')
    return {
      date: `${parseInt(d)} ${months[parseInt(m) - 1]}`,
      ...(map.get(day) ?? { entrada: 0, saida: 0 }),
    }
  })
}

export default async function DashboardPage() {
  const { tenant } = await requireTenant()
  const tenantId = tenant.id

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14)

  const [
    [productCountRow],
    [stockSummaryRow],
    [zeroStockRow],
    recentMovements,
    movementsByDay,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(products)
      .where(eq(products.tenantId, tenantId)),

    db
      .select({
        totalUnits: sum(inventoryStock.quantity),
        totalValue: sql<string>`coalesce(sum(${products.basePrice}::bigint * ${inventoryStock.quantity}), 0)::bigint`,
      })
      .from(inventoryStock)
      .innerJoin(products, eq(inventoryStock.productId, products.id))
      .where(and(eq(inventoryStock.tenantId, tenantId), eq(products.tenantId, tenantId))),

    db
      .select({ count: count() })
      .from(inventoryStock)
      .innerJoin(products, eq(inventoryStock.productId, products.id))
      .where(
        and(
          eq(inventoryStock.tenantId, tenantId),
          eq(products.tenantId, tenantId),
          eq(inventoryStock.quantity, 0),
        ),
      ),

    db
      .select({
        id: stockMovements.id,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        reason: movementReasons.name,
        productName: products.name,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(movementReasons, eq(stockMovements.reasonId, movementReasons.id))
      .where(eq(stockMovements.tenantId, tenantId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(8),

    db
      .select({
        day: sql<string>`(date_trunc('day', ${stockMovements.createdAt})::date)::text`,
        type: stockMovements.type,
        total: sum(stockMovements.quantity),
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenantId, tenantId),
          gte(stockMovements.createdAt, fourteenDaysAgo),
        ),
      )
      .groupBy(
        sql`date_trunc('day', ${stockMovements.createdAt})`,
        stockMovements.type,
      )
      .orderBy(sql`date_trunc('day', ${stockMovements.createdAt})`),
  ])

  const productCount = productCountRow.count
  const totalUnits = Number(stockSummaryRow.totalUnits ?? 0)
  const totalValue = Number(stockSummaryRow.totalValue ?? 0)
  const zeroStockCount = zeroStockRow.count
  const chartData = buildChartData(movementsByDay)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu estoque.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Cadastrados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount}</div>
            <p className="text-xs text-muted-foreground">
              {productCount === 1 ? 'produto ativo' : 'produtos ativos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Estoque</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnits.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">unidades disponíveis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor do Estoque</CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">preço base × quantidade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${zeroStockCount > 0 ? 'text-destructive' : ''}`}>
              Sem Estoque
            </CardTitle>
            <AlertCircle className={`h-4 w-4 ${zeroStockCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${zeroStockCount > 0 ? 'text-destructive' : ''}`}>
              {zeroStockCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {zeroStockCount === 0
                ? 'nenhum produto zerado'
                : `produto${zeroStockCount !== 1 ? 's' : ''} sem unidades`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Movimentações — últimos 14 dias</CardTitle>
            <CardDescription>Entradas e baixas de estoque por dia.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <MovementsChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Movimentações Recentes</CardTitle>
            <CardDescription>Últimas entradas e baixas registradas.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentMovements.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma movimentação registrada ainda.
              </p>
            ) : (
              <div className="space-y-4">
                {recentMovements.map((mov) => (
                  <div key={mov.id} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        mov.type === 'exit'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {mov.type === 'exit' ? (
                        <ArrowDownToLine className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpFromLine className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-medium leading-none">{mov.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {mov.reason ?? (mov.type === 'exit' ? 'Baixa' : 'Entrada')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${mov.type === 'exit' ? 'text-destructive' : 'text-primary'}`}>
                        {mov.type === 'exit' ? '−' : '+'}{mov.quantity}
                      </p>
                      <p className="text-xs text-muted-foreground">{timeAgo(mov.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
