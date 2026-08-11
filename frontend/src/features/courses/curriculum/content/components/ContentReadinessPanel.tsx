import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import type { ContentReadiness } from '@/features/courses/curriculum/content/types'

interface ContentReadinessPanelProps {
  readiness: ContentReadiness | undefined
  isLoading: boolean
}

/** Lesson-level content readiness — distinct from curriculum structural readiness and course launch readiness (ARCHITECTURE.md §21). */
export function ContentReadinessPanel({ readiness, isLoading }: ContentReadinessPanelProps) {
  if (isLoading || !readiness) {
    return <ListSkeleton rows={1} />
  }

  return readiness.ready ? (
    <div className="border-success/30 bg-success/5 flex items-center gap-2 rounded-lg border p-3">
      <CheckCircle2 className="text-success size-4 shrink-0" aria-hidden="true" />
      <p className="text-body-sm font-medium">Content ready</p>
    </div>
  ) : (
    <div className="border-warning/30 bg-warning/5 flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-warning size-4 shrink-0" aria-hidden="true" />
        <p className="text-body-sm font-medium">Not ready yet</p>
      </div>
      <ul className="text-caption text-muted-foreground list-inside list-disc pl-6">
        {readiness.blockers.map((blocker) => (
          <li key={blocker}>{blocker}</li>
        ))}
      </ul>
    </div>
  )
}
