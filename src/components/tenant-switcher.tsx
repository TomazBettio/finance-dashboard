'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { switchTenant } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'

export type TenantOption = { id: number; name: string }

type Props = {
  tenants: TenantOption[]
  currentTenantId: number
}

export function TenantSwitcher({ tenants, currentTenantId }: Props) {
  const [pending, startTransition] = useTransition()
  const current = tenants.find((t) => t.id === currentTenantId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" disabled={pending} />}
      >
        <Building2 />
        <span className="max-w-48 truncate">{current?.name ?? 'Empresa'}</span>
        <ChevronsUpDown className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Empresas</DropdownMenuLabel>
          {tenants.map((tenant) => (
            <DropdownMenuItem
              key={tenant.id}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await switchTenant(tenant.id)
                })
              }
            >
              <Check
                className={tenant.id === currentTenantId ? 'opacity-100' : 'opacity-0'}
              />
              <span className="truncate">{tenant.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/onboarding" />}>
          <Plus />
          Nova empresa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
