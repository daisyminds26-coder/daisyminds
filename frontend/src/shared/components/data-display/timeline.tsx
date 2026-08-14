import type { ComponentType } from 'react'
import { Circle } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

export interface TimelineEntry {
  id: string
  title: string
  description?: string
  timestamp: string
  icon?: ComponentType<{ className?: string }>
}

/** Vertical activity/audit-style timeline (e.g. an Enrollllment history or audit log detail view). */
export function Timeline({ entries }: { entries: readonly TimelineEntry[] }) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => {
        const Icon = entry.icon ?? Circle
        const isLast = index === entries.length - 1

        return (
          <li key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="bg-accent text-foreground flex size-7 shrink-0 items-center justify-center rounded-full">
                <Icon className="size-3.5" />
              </div>
              {!isLast && <div className="bg-border w-px flex-1" />}
            </div>
            <div className={cn('flex flex-1 flex-col gap-0.5', !isLast && 'pb-6')}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-body-sm font-medium">{entry.title}</p>
                <p className="text-caption text-muted-foreground shrink-0">{entry.timestamp}</p>
              </div>
              {entry.description && (
                <p className="text-body-sm text-muted-foreground">{entry.description}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
