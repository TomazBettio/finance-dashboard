'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import {
  createCustomField,
  updateCustomField,
  deleteCustomField,
  moveCustomField,
} from '@/modules/custom-fields/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import type { CustomFieldRow } from '@/modules/custom-fields/validation'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'

const TYPE_LABELS: Record<CustomFieldRow['type'], string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  boolean: 'Sim/Não',
  select: 'Seleção',
}

const selectClass =
  'h-8 w-full cursor-pointer rounded-lg border border-input bg-card px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function CustomFieldForm({
  def,
  onSuccess,
}: {
  def?: CustomFieldRow | null
  onSuccess: () => void
}) {
  const action = def ? updateCustomField.bind(null, def.id) : createCustomField
  const [state, formAction, pending] = useActionState(action, null)
  const [type, setType] = useState<CustomFieldRow['type']>(def?.type ?? 'text')

  useEffect(() => {
    if (state && 'success' in state) onSuccess()
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={formAction} className="flex flex-col gap-4 p-4">
      {state && 'error' in state && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Rótulo *</label>
        <Input name="label" defaultValue={def?.label ?? ''} placeholder="Ex: Cor" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Tipo</label>
        {def ? (
          <input type="hidden" name="type" value={def.type} />
        ) : (
          <select
            name="type"
            className={selectClass}
            value={type}
            onChange={(e) => setType(e.target.value as CustomFieldRow['type'])}
          >
            <option value="text">Texto</option>
            <option value="number">Número</option>
            <option value="date">Data</option>
            <option value="boolean">Sim/Não</option>
            <option value="select">Seleção</option>
          </select>
        )}
        {def && <p className="text-xs text-muted-foreground">{TYPE_LABELS[def.type]} (não pode ser alterado)</p>}
      </div>

      {(def?.type === 'select' || (!def && type === 'select')) && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Opções (uma por linha) *</label>
          <textarea
            name="options"
            rows={4}
            defaultValue={def?.options.join('\n') ?? ''}
            placeholder={'Azul\nVerde\nVermelho'}
            className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="required"
          defaultChecked={def?.required ?? false}
          className="size-4 accent-primary"
        />
        Obrigatório
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="showInTable"
          defaultChecked={def?.showInTable ?? false}
          className="size-4 accent-primary"
        />
        Exibir na tabela de produtos
      </label>

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Salvando...' : def ? 'Salvar Alterações' : 'Criar Campo'}
      </Button>
    </form>
  )
}

export function CustomFieldsManager({
  defs,
  canManage,
}: {
  defs: CustomFieldRow[]
  canManage: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<CustomFieldRow | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setIsOpen(true)
  }

  function openEdit(def: CustomFieldRow) {
    setEditing(def)
    setIsOpen(true)
  }

  function handleDelete(id: number) {
    if (confirmingId === id) {
      setConfirmingId(null)
      startTransition(async () => {
        await deleteCustomField(id)
      })
    } else {
      setConfirmingId(id)
      setTimeout(() => setConfirmingId((cur) => (cur === id ? null : cur)), 3000)
    }
  }

  function handleMove(id: number, direction: 'up' | 'down') {
    setError(null)
    startTransition(async () => {
      const result = await moveCustomField(id, direction)
      if (result && 'error' in result) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border">
        {defs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhum campo personalizado
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Rótulo</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Obrigatório</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Na tabela</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {defs.map((def) => (
                <tr key={def.id} className="group border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{def.label}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{TYPE_LABELS[def.type]}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{def.required ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{def.showInTable ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-2.5">
                    {canManage && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isPending}
                          onClick={() => handleMove(def.id, 'up')}
                        >
                          <ArrowUp />
                          <span className="sr-only">Mover para cima</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isPending}
                          onClick={() => handleMove(def.id, 'down')}
                        >
                          <ArrowDown />
                          <span className="sr-only">Mover para baixo</span>
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(def)}>
                          <Pencil />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant={confirmingId === def.id ? 'destructive' : 'ghost'}
                          size={confirmingId === def.id ? 'sm' : 'icon-sm'}
                          disabled={isPending}
                          onClick={() => handleDelete(def.id)}
                        >
                          {confirmingId === def.id ? 'Confirmar exclusão' : <Trash2 />}
                          {confirmingId !== def.id && <span className="sr-only">Excluir</span>}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {canManage ? (
        <div className="border-t pt-4">
          <Button size="sm" onClick={openCreate}>
            <Plus />
            Novo campo
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Somente owner/admin podem gerenciar campos personalizados.
        </p>
      )}

      <Sheet open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Editar Campo' : 'Novo Campo'}</SheetTitle>
            <SheetDescription>
              {editing
                ? 'Atualize o campo personalizado.'
                : 'Crie um campo extra para os produtos desta empresa.'}
            </SheetDescription>
          </SheetHeader>
          <CustomFieldForm
            key={editing?.id ?? 'new'}
            def={editing}
            onSuccess={() => setIsOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
