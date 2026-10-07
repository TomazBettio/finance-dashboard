'use client'

import { useActionState } from 'react'
import { createTenant } from '@/lib/auth/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function OnboardingForm({ userName }: { userName: string }) {
  const [state, formAction, pending] = useActionState(createTenant, null)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Crie sua empresa</CardTitle>
        <CardDescription>
          Olá, {userName}. Cadastre a empresa que você vai gerenciar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state && 'error' in state && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Nome da empresa *
            </label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: Padaria do Zé"
              required
            />
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? 'Criando...' : 'Criar empresa'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
