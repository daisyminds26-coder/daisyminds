import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import type { CourseLaunchReadiness } from '@/features/courses/curriculum/content/types'

interface LaunchReadinessPanelProps {
  readiness: CourseLaunchReadiness | undefined
  isLoading: boolean
}

/**
 * The third, distinct readiness concept — composes course metadata
 * readiness (Phase 9A) + curriculum structural readiness (Phase 9B) +
 * learning content readiness (Phase 9C). Copy deliberately says "Learning
 * content ready"/"Launch readiness", never that the course can accept
 * students — no enrolment/batch/payment module exists yet (ARCHITECTURE.md
 * §21).
 */
export function LaunchReadinessPanel({ readiness, isLoading }: LaunchReadinessPanelProps) {
  if (isLoading || !readiness) {
    return <ListSkeleton rows={2} />
  }

  const layers = [
    { label: 'Course metadata', ready: readiness.courseMetadataReady },
    { label: 'Curriculum structure', ready: readiness.curriculumStructureReady },
    { label: 'Learning content', ready: readiness.contentReady },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {layers.map((layer) => (
          <span
            key={layer.label}
            className="text-caption border-border flex items-center gap-1.5 rounded-full border px-2.5 py-1"
          >
            {layer.ready ? (
              <CheckCircle2 className="text-success size-3.5" aria-hidden="true" />
            ) : (
              <AlertTriangle className="text-warning size-3.5" aria-hidden="true" />
            )}
            {layer.label}
          </span>
        ))}
      </div>

      {readiness.ready ? (
        <div className="border-success/30 bg-success/5 flex items-center gap-2 rounded-lg border p-3">
          <CheckCircle2 className="text-success size-4 shrink-0" aria-hidden="true" />
          <p className="text-body-sm font-medium">Launch readiness — this course is ready</p>
        </div>
      ) : (
        <div className="border-warning/30 bg-warning/5 flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-warning size-4 shrink-0" aria-hidden="true" />
            <p className="text-body-sm font-medium">
              Launch readiness — {readiness.blockers.length.toString()} item
              {readiness.blockers.length === 1 ? '' : 's'} remaining
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
