'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  title: string
  description?: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

export function SettingsCard({ title, description, icon, defaultOpen = true, children }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className="max-w-2xl">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-4 text-left"
        aria-expanded={isOpen}
      >
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-base font-medium">
            {icon}
            {title}
          </span>
          {description && (
            <span className="text-sm text-muted-foreground">{description}</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        className={`grid transition-all duration-200 ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <CardContent className="pt-0">{children}</CardContent>
        </div>
      </div>
    </Card>
  )
}
