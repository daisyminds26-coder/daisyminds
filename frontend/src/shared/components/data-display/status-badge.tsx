import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  info: 'bg-info/10 text-info border-info/20',
  neutral: 'bg-muted text-muted-foreground border-border',
}

interface StatusBadgeProps {
  label: string
  tone: StatusTone
  className?: string
}

/**
 * Status indicators (enrollment/payment/attendance status, etc. —
 * UI-DESIGN-SYSTEM.md §6). Color is never the only signal: the label text
 * always renders alongside the tone (§9 — color-blind accessibility).
 */
export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn('font-medium', toneClasses[tone], className)}>
      {label}
    </Badge>
  )
}
