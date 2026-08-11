import type { ComponentType, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/**
 * Required "empty" state for data-bearing views (UI-DESIGN-SYSTEM.md §8) —
 * always paired with a clear next action where one exists, never a bare
 * "no data" message.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-10 text-center', className)}>
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground size-6" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-body font-semibold">{title}</p>
        {description && (
          <p className="text-body-sm text-muted-foreground max-w-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
