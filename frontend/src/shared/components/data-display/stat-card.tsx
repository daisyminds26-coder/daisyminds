import type { ComponentType } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'

import { Card, CardContent } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: ComponentType<{ className?: string }>
  trend?: {
    direction: 'up' | 'down'
    value: string
    /** Whether an "up" trend is good news for this metric — a rising dropout rate isn't. */
    isPositive?: boolean
  }
  className?: string
}

/**
 * A single dashboard statistic. UI-DESIGN-SYSTEM.md §11 explicitly warns
 * against "a dozen equally-weighted stat cards" — pages using this should
 * group and prioritize (e.g. 3–4 headline stats, not a wall of them).
 */
export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  const isPositive = trend?.isPositive ?? trend?.direction === 'up'
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown

  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between gap-4 pt-6">
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm text-muted-foreground">{label}</p>
          <p className="text-h1 font-semibold">{value}</p>
          {trend && (
            <p
              className={cn(
                'text-caption flex items-center gap-1 font-medium',
                isPositive ? 'text-success' : 'text-destructive',
              )}
            >
              <TrendIcon className="size-3.5" />
              {trend.value}
            </p>
          )}
        </div>
        <div className="bg-accent flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="text-foreground size-5" />
        </div>
      </CardContent>
    </Card>
  )
}
