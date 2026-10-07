'use client'

import { useState, useTransition } from 'react'
import { setModuleEnabled } from '@/modules/settings/actions'
import { Button } from '@/components/ui/button'
import type { ModuleKey } from '@/modules/registry'

type Props = {
  moduleKey: ModuleKey
  enabled: boolean
  disabled?: boolean
}

export function ModuleToggle({ moduleKey, enabled, disabled }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle() {
    setError(null)
    startTransition(async () => {
      const result = await setModuleEnabled(moduleKey, !enabled)
      if (result && 'error' in result) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        role="switch"
        aria-checked={enabled}
        variant={enabled ? 'outline' : 'default'}
        size="sm"
        onClick={toggle}
        disabled={disabled || pending}
      >
        {pending ? '…' : enabled ? 'Desativar' : 'Ativar'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
