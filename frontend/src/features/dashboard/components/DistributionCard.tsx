import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import type { StatusTone } from '@/shared/components/data-display/status-badge'
import type { ComponentType } from 'react'
import type { CountByKey } from '@/features/dashboard/types'

const TONE_BAR_CLASS: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
  info: 'bg-info',
  neutral: 'bg-muted-foreground/40',
}

interface DistributionCardProps {
  title: string
  data: CountByKey[]
  toneForKey: (key: string) => StatusTone
  labelForKey: (key: string) => string
  emptyIcon: ComponentType<{ className?: string }>
  emptyMessage: string
}

/**
 * A small, accessible bar-list — deliberately not a pie/donut chart. No
 * charting library is installed in this app (the only prior "chart"
 * artifact is `ChartPlaceholder`, reserved for the future analytics phase
 * once real course/attendance/revenue data exists — ARCHITECTURE.md/
 * ROADMAP.md), and per the phase spec, a real distribution this small (2-5
 * buckets) reads better as labeled bars than a library dependency would
 * justify. Every value is rendered as visible text next to its bar, so
 * meaning never depends on color or bar length alone (UI-DESIGN-SYSTEM.md
 * §9) — a screen reader gets the same "label: count (percentage)" a sighted
 * user sees.
 */
export function DistributionCard({
  title,
  data,
  toneForKey,
  labelForKey,
  emptyIcon,
  emptyMessage,
}: DistributionCardProps) {
  const total = data.reduce((sum, row) => sum + row.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h3 font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState icon={emptyIcon} title={emptyMessage} />
        ) : (
          <ul className="flex flex-col gap-3">
            {data
              .filter((row) => row.count > 0)
              .map((row) => {
                const percentage = Math.round((row.count / total) * 100)
                return (
                  <li key={row.key} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{labelForKey(row.key)}</span>
                      <span className="text-muted-foreground text-caption">
                        {row.count} ({percentage}%)
                      </span>
                    </div>
                    <div
                      className="bg-muted h-2 w-full overflow-hidden rounded-full"
                      role="img"
                      aria-label={`${labelForKey(row.key)}: ${String(row.count)} of ${String(total)}, ${String(percentage)} percent`}
                    >
                      <div
                        className={`h-full rounded-full ${TONE_BAR_CLASS[toneForKey(row.key)]}`}
                        style={{ width: `${String(percentage)}%` }}
                      />
                    </div>
                  </li>
                )
              })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
