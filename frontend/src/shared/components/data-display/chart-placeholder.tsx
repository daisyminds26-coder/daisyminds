import { BarChart3 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

interface ChartPlaceholderProps {
  title: string
  description?: string
  /** Fixed aspect keeps dashboard grids from jumping once a real chart library replaces this. */
  heightClassName?: string
}

/**
 * No charting library is installed yet (ROADMAP.md — Reports & Analytics is
 * Phase 18). This reserves the exact layout slot a real chart will occupy
 * so dashboards can be built against a stable shape today.
 */
export function ChartPlaceholder({
  title,
  description,
  heightClassName = 'h-64',
}: ChartPlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h3 font-semibold">{title}</CardTitle>
        {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        <div
          className={`border-border bg-muted/40 text-muted-foreground flex ${heightClassName} flex-col items-center justify-center gap-2 rounded-lg border border-dashed`}
        >
          <BarChart3 className="size-8" />
          <p className="text-body-sm">Chart will render here once analytics data is connected</p>
        </div>
      </CardContent>
    </Card>
  )
}
