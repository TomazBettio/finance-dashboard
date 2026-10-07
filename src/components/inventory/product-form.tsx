'use client'

import { useActionState, useEffect } from 'react'
import { createProduct, updateProduct } from '@/modules/inventory/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatNumberForInput, type CustomFieldRow } from '@/modules/custom-fields/validation'

export type ProductRow = {
  id: number
  name: string
  sku: string | null
  basePrice: number
  quantity: number | null
  location: string | null
  metadata: Record<string, unknown> | null
}

type Props = {
  product?: ProductRow | null
  fieldDefs: CustomFieldRow[]
  onSuccess: () => void
}

const selectClass =
  'h-8 w-full cursor-pointer rounded-lg border border-input bg-card px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function ProductForm({ product, fieldDefs, onSuccess }: Props) {
  const action = product ? updateProduct.bind(null, product.id) : createProduct
  const [state, formAction, pending] = useActionState(action, null)

  useEffect(() => {
    if (state && 'success' in state) onSuccess()
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  function metaValue(key: string) {
    const v = product?.metadata?.[key]
    return v === null || v === undefined ? '' : String(v)
  }

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
          type="text"
          inputMode="decimal"
          defaultValue={product ? (product.basePrice / 100).toFixed(2).replace('.', ',') : ''}
          placeholder="0,00"
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

      {fieldDefs.length > 0 && (
        <div className="flex flex-col gap-4 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">Campos personalizados</p>
          {fieldDefs.map((def) => (
            <div key={def.key} className="flex flex-col gap-1.5">
              {def.type === 'boolean' ? (
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name={`cf_${def.key}`}
                    defaultChecked={product?.metadata?.[def.key] === true}
                    className="size-4 accent-primary"
                  />
                  {def.label}
                  {def.required ? ' *' : ''}
                </label>
              ) : def.type === 'select' ? (
                <>
                  <label className="text-sm font-medium">
                    {def.label}
                    {def.required ? ' *' : ''}
                  </label>
                  <select name={`cf_${def.key}`} defaultValue={metaValue(def.key)} className={selectClass}>
                    <option value="">—</option>
                    {def.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label className="text-sm font-medium">
                    {def.label}
                    {def.required ? ' *' : ''}
                  </label>
                  <Input
                    name={`cf_${def.key}`}
                    type={def.type === 'date' ? 'date' : 'text'}
                    inputMode={def.type === 'number' ? 'decimal' : undefined}
                    defaultValue={
                      def.type === 'number' && typeof product?.metadata?.[def.key] === 'number'
                        ? formatNumberForInput(product.metadata[def.key] as number)
                        : metaValue(def.key)
                    }
                  />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Salvando...' : product ? 'Salvar Alterações' : 'Criar Produto'}
      </Button>
    </form>
  )
}
