import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

interface PageContainerProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Standard page-level wrapper: title + optional description/actions row,
 * then content. UI-DESIGN-SYSTEM.md's "spacious" default (generous
 * section spacing over dense packing) lives here so every page gets it for
 * free.
 */
export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('mx-auto flex w-full max-w-7xl flex-col gap-6', className)}>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 font-semibold">{title}</h1>
          {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
