'use client'

import { useActionState, useEffect } from 'react'
import { createProduct, updateProduct } from '@/modules/inventory/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export type ProductRow = {
  id: number
  name: string
  sku: string | null
  basePrice: number
  quantity: number | null
  location: string | null
}

type Props = {
  product?: ProductRow | null
  onSuccess: () => void
}

export function ProductForm({ product, onSuccess }: Props) {
  const action = product ? updateProduct.bind(null, product.id) : createProduct
  const [state, formAction, pending] = useActionState(action, null)

  useEffect(() => {
    if (state && 'success' in state) onSuccess()
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={formAction} className="flex flex-col gap-4 p-4 overflow-y-auto">
      {state && 'error' in state && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Nome *</label>
        <Input
          name="name"
          defaultValue={product?.name ?? ''}
          placeholder="Ex: Camiseta Branca"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">SKU</label>
        <Input
          name="sku"
          defaultValue={product?.sku ?? ''}
          placeholder="Ex: CAM-001"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Preço (R$)</label>
        <Input
          name="basePrice"
          type="number"
          step="0.01"
          min="0"
          defaultValue={product ? (product.basePrice / 100).toFixed(2) : ''}
          placeholder="0.00"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Quantidade</label>
          <Input
            name="quantity"
            type="number"
            min="0"
            defaultValue={product?.quantity ?? 0}
            placeholder="0"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Localização</label>
          <Input
            name="location"
            defaultValue={product?.location ?? ''}
            placeholder="Ex: Prateleira A"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Salvando...' : product ? 'Salvar Alterações' : 'Criar Produto'}
      </Button>
    </form>
  )
}
