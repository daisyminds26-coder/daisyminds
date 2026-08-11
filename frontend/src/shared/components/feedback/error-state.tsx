import { AlertTriangle, RotateCw } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface ErrorStateProps {
  title?: string
  /** Human message from the API envelope's `error.message` (API-STANDARDS.md §3) once wired to real data. */
  description?: string
  onRetry?: () => void
  className?: string
}

/** Required "error" state for data-bearing views (UI-DESIGN-SYSTEM.md §8) — always offers a retry affordance. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We couldn’t load this data. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-10 text-center', className)}>
      <div className="bg-destructive/10 flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive size-6" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-body font-semibold">{title}</p>
        <p className="text-body-sm text-muted-foreground max-w-sm">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RotateCw className="size-3.5" />
          Try again
        </Button>
      )}
    </div>
  )
}
