import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { cn } from '@/shared/lib/utils'
import type { DashboardAlert } from '@/features/dashboard/types'

const SEVERITY_STYLES: Record<DashboardAlert['severity'], { border: string; icon: typeof Info }> = {
  info: { border: 'border-info/30 bg-info/5', icon: Info },
  warning: { border: 'border-warning/30 bg-warning/5', icon: AlertTriangle },
  critical: { border: 'border-destructive/30 bg-destructive/5', icon: AlertTriangle },
}

/**
 * Allowlisted routes only — every `alert.actionRoute` value originates from
 * the backend's own `ALERT_ROUTES` constant (SECURITY.md §4), never built
 * client-side from request input, so this `Link` can never be an open
 * redirect.
 */
export function AlertsPanel({
  alerts,
  isLoading,
}: {
  alerts: DashboardAlert[] | undefined
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h3 font-semibold">Operational alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : !alerts || alerts.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All clear"
            description="No operational alerts right now."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {alerts.map((alert) => {
              const style = SEVERITY_STYLES[alert.severity]
              const Icon = style.icon
              return (
                <li
                  key={alert.type}
                  className={cn('flex items-start gap-3 rounded-lg border p-3', style.border)}
                >
                  <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div className="flex flex-1 flex-col gap-0.5">
                    <p className="text-body-sm font-medium">{alert.title}</p>
                    <p className="text-caption text-muted-foreground">{alert.description}</p>
                    <Link
                      to={alert.actionRoute}
                      className="text-body-sm text-primary mt-1 font-medium hover:underline"
                    >
                      {alert.actionLabel}
                    </Link>
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
