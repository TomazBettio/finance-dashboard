'use client'

import { useActionState, useEffect, useState } from 'react'
import { registerStockMovement } from '@/modules/inventory/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import Link from 'next/link'
import type { ProductRow } from './product-form'

type ReasonRow = { id: number; name: string; type: 'entry' | 'exit' }

type Props = {
  product: ProductRow
  reasons: ReasonRow[]
  onSuccess: () => void
}

export function StockMovementForm({ product, reasons, onSuccess }: Props) {
  const [type, setType] = useState<'entry' | 'exit'>('exit')
  const action = registerStockMovement.bind(null, product.id)
  const [state, formAction, pending] = useActionState(action, null)

  useEffect(() => {
    if (state && 'success' in state) onSuccess()
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredReasons = reasons.filter((r) => r.type === type)

  return (
    <form action={formAction} className="flex flex-col gap-5 p-4">
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <p className="text-muted-foreground">Produto</p>
        <p className="font-medium">{product.name}</p>
        <p className="mt-1 text-muted-foreground">
          Estoque atual:{' '}
          <span className={(product.quantity ?? 0) === 0 ? 'font-semibold text-destructive' : 'font-semibold'}>
            {product.quantity ?? 0} unidade{(product.quantity ?? 0) !== 1 ? 's' : ''}
          </span>
        </p>
      </div>

      {state && 'error' in state && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Tipo de movimentação</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('exit')}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              type === 'exit'
                ? 'border-destructive bg-destructive/10 text-destructive'
                : 'border-border bg-transparent text-muted-foreground hover:bg-muted/40'
            }`}
          >
            <ArrowDownToLine className="h-4 w-4" />
            Baixa (Saída)
          </button>
          <button
            type="button"
            onClick={() => setType('entry')}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              type === 'entry'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-transparent text-muted-foreground hover:bg-muted/40'
            }`}
          >
            <ArrowUpFromLine className="h-4 w-4" />
            Entrada
          </button>
        </div>
        <input type="hidden" name="type" value={type} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Quantidade *</label>
        <Input name="quantity" type="number" min="1" placeholder="0" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Motivo</label>
        {filteredReasons.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum motivo cadastrado para este tipo.{' '}
            <Link href="/dashboard/settings" className="underline underline-offset-2 hover:text-foreground">
              Cadastrar em Configurações
            </Link>
          </p>
        ) : (
          <select
            name="reasonId"
            className="h-8 w-full cursor-pointer rounded-lg border border-input bg-card px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">— Sem motivo —</option>
            {filteredReasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <Button type="submit" disabled={pending} variant={type === 'exit' ? 'destructive' : 'default'}>
        {pending
          ? 'Registrando...'
          : type === 'exit'
            ? 'Registrar Baixa'
            : 'Registrar Entrada'}
      </Button>
    </form>
  )
}
