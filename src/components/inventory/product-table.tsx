'use client'

import { useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ProductForm, type ProductRow } from './product-form'
import { StockMovementForm } from './stock-movement-form'
import { deleteProduct } from '@/modules/inventory/actions'
import { Plus, Pencil, Trash2, Package, ArrowDownUp } from 'lucide-react'

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

type ReasonRow = { id: number; name: string; type: 'entry' | 'exit' }

export function ProductTable({ products, reasons }: { products: ProductRow[]; reasons: ReasonRow[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const [movingProduct, setMovingProduct] = useState<ProductRow | null>(null)
  const [isMovementOpen, setIsMovementOpen] = useState(false)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setIsOpen(true)
  }

  function openEdit(product: ProductRow) {
    setEditing(product)
    setIsOpen(true)
  }

  function openMovement(product: ProductRow) {
    setMovingProduct(product)
    setIsMovementOpen(true)
  }

  function handleDelete(id: number) {
    if (confirmingId === id) {
      setConfirmingId(null)
      startTransition(async () => {
        await deleteProduct(id)
      })
    } else {
      setConfirmingId(id)
      setTimeout(() => setConfirmingId((cur) => (cur === id ? null : cur)), 3000)
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus />
          Novo Produto
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Package className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhum produto cadastrado</p>
            <Button variant="outline" size="sm" onClick={openCreate}>
              Cadastrar primeiro produto
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Preço</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Estoque</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Localização</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{product.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(product.basePrice)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={(product.quantity ?? 0) === 0 ? 'font-medium text-destructive' : 'font-medium'}>
                      {product.quantity ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{product.location ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openMovement(product)}>
                        <ArrowDownUp />
                        <span className="sr-only">Movimentar estoque</span>
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(product)}>
                        <Pencil />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant={confirmingId === product.id ? 'destructive' : 'ghost'}
                        size={confirmingId === product.id ? 'sm' : 'icon-sm'}
                        onClick={() => handleDelete(product.id)}
                        disabled={isPending}
                      >
                        {confirmingId === product.id ? 'Confirmar exclusão' : <Trash2 />}
                        {confirmingId !== product.id && <span className="sr-only">Excluir</span>}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Sheet open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Editar Produto' : 'Novo Produto'}</SheetTitle>
            <SheetDescription>
              {editing ? 'Atualize os dados do produto.' : 'Preencha os dados para cadastrar um novo produto.'}
            </SheetDescription>
          </SheetHeader>
          <ProductForm
            key={editing?.id ?? 'new'}
            product={editing}
            onSuccess={() => setIsOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={isMovementOpen} onOpenChange={(open) => setIsMovementOpen(open)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Movimentar Estoque</SheetTitle>
            <SheetDescription>
              Registre uma entrada ou baixa no estoque do produto.
            </SheetDescription>
          </SheetHeader>
          {movingProduct && (
            <StockMovementForm
              key={movingProduct.id}
              product={movingProduct}
              reasons={reasons}
              onSuccess={() => setIsMovementOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
