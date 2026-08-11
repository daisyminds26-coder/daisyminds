import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

export function StatPill({
  icon,
  children,
  className,
}: {
  icon: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-border-soft bg-surface/80 text-ink-muted flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm backdrop-blur-sm',
        className,
      )}
    >
      <span className="text-primary-dark flex size-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      {children}
    </div>
  )
}
