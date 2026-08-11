import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import type { CurriculumReadiness } from '@/features/courses/curriculum/types'

interface CurriculumReadinessPanelProps {
  readiness: CurriculumReadiness | undefined
  isLoading: boolean
}

/**
 * "Curriculum structure ready" — deliberately never "course ready to
 * launch" (task's own explicit terminology requirement). This is
 * structural readiness only; actual learning content completeness is a
 * later phase's concern (ARCHITECTURE.md §20).
 */
export function CurriculumReadinessPanel({ readiness, isLoading }: CurriculumReadinessPanelProps) {
  if (isLoading || !readiness) {
    return <ListSkeleton rows={2} />
  }

  const { summary } = readiness

  return (
    <div className="flex flex-col gap-3">
      <div className="text-caption text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
        <span>
          <strong className="text-foreground font-semibold">{summary.moduleCount}</strong> module
          {summary.moduleCount === 1 ? '' : 's'}
        </span>
        <span>
          <strong className="text-foreground font-semibold">{summary.lessonCount}</strong> lesson
          {summary.lessonCount === 1 ? '' : 's'}
        </span>
        <span>{summary.publishedLessonCount} published</span>
        <span>{summary.draftLessonCount} draft</span>
      </div>

      {readiness.ready ? (
        <div className="border-success/30 bg-success/5 flex items-center gap-2 rounded-lg border p-3">
          <CheckCircle2 className="text-success size-4 shrink-0" aria-hidden="true" />
          <p className="text-body-sm font-medium">Curriculum structure ready</p>
        </div>
      ) : (
        <div className="border-warning/30 bg-warning/5 flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-warning size-4 shrink-0" aria-hidden="true" />
            <p className="text-body-sm font-medium">
              Needs attention — {readiness.blockers.length.toString()} item
              {readiness.blockers.length === 1 ? '' : 's'}
            </p>
          </div>
          <ul className="text-caption text-muted-foreground list-inside list-disc pl-6">
            {readiness.blockers.map((blocker) => (
              <li key={blocker.field}>{blocker.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
