import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import type { ReadinessResult } from '@/features/assessments/types'

/** Backend readiness response is the source of truth — this only renders it, never re-derives blockers client-side. Mirrors `features/batches/components/ReadinessPanel.tsx`'s own shape. */
export function ReadinessPanel({ readiness }: { readiness: ReadinessResult }) {
  if (readiness.ready) {
    return (
      <div className="border-success/30 bg-success/5 flex items-center gap-2 rounded-lg border p-3">
        <CheckCircle2 className="text-success size-4 shrink-0" aria-hidden="true" />
        <p className="text-body-sm font-medium">Ready to publish</p>
      </div>
    )
  }

  return (
    <div className="border-warning/30 bg-warning/5 flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-warning size-4 shrink-0" aria-hidden="true" />
        <p className="text-body-sm font-medium">
          Not ready to publish — {readiness.blockers.length} item
          {readiness.blockers.length === 1 ? '' : 's'} remaining
        </p>
      </div>
      <ul className="text-caption text-muted-foreground list-inside list-disc pl-6">
        {readiness.blockers.map((blocker, index) => (
          <li key={`${blocker.field}-${String(index)}`}>{blocker.message}</li>
        ))}
      </ul>
    </div>
  )
}
