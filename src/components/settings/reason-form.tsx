'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createMovementReason } from '@/modules/settings/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowUpFromLine, ArrowDownToLine } from 'lucide-react'

export function ReasonForm({ disabled }: { disabled?: boolean }) {
  const [type, setType] = useState<'entry' | 'exit'>('exit')
  const [state, formAction, pending] = useActionState(createMovementReason, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state && 'success' in state) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setType('entry')}
          className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            type === 'entry'
              ? 'border-[#818cf8] bg-[#818cf8]/10 text-[#818cf8]'
              : 'border-border bg-transparent text-muted-foreground hover:bg-muted/40'
          }`}
        >
          <ArrowUpFromLine className="h-3.5 w-3.5" />
          Entrada
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setType('exit')}
          className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            type === 'exit'
              ? 'border-[#f87171] bg-[#f87171]/10 text-[#f87171]'
              : 'border-border bg-transparent text-muted-foreground hover:bg-muted/40'
          }`}
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Saída
        </button>
      </div>

      {state && 'error' in state && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}

      <div className="flex gap-2">
        <Input
          name="name"
          placeholder={type === 'entry' ? 'Ex: Compra, Devolução…' : 'Ex: Venda, Avaria, Perda…'}
          className="flex-1"
          disabled={disabled}
        />
        <Button type="submit" size="sm" disabled={pending || disabled}>
          {pending ? '…' : 'Adicionar'}
        </Button>
      </div>
    </form>
  )
}
