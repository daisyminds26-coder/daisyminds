import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

interface SectionContainerProps {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** Groups related content within a page (a card grid, a table + its filters, etc.). */
export function SectionContainer({
  title,
  description,
  actions,
  children,
  className,
}: SectionContainerProps) {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      {(title ?? actions) && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            {title && <h2 className="text-h2 font-semibold">{title}</h2>}
            {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
