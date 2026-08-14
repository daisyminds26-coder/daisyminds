import { Progress } from '@/shared/components/ui/progress'
import { cn } from '@/shared/lib/utils'
import type { CourseProgressSummary } from '@/features/student-portal/types'

interface CourseProgressBarProps {
  progress: CourseProgressSummary
  className?: string
  compact?: boolean
}

/**
 * The one progress-bar component every view (My Courses cards, Dashboard,
 * Course Overview, the player header) renders — always backend-computed
 * `percentage`, never re-derived. Always pairs the bar with real text (task
 * spec: "never communicate progress by color/bar alone").
 */
export function CourseProgressBar({
  progress,
  className,
  compact = false,
}: CourseProgressBarProps) {
  const label = progress.isComplete
    ? 'Course complete'
    : `${String(progress.completedMandatoryLessons)} of ${String(progress.mandatoryLessons)} required lessons completed`

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-caption text-muted-foreground">{label}</span>
          <span className="text-caption font-medium">{progress.percentage}%</span>
        </div>
      )}
      <Progress
        value={progress.percentage}
        aria-label={`Course progress: ${String(progress.percentage)}%, ${label}`}
        className={compact ? 'h-1.5' : undefined}
      />
    </div>
  )
}
