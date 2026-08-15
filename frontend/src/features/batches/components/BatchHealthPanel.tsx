import { CheckCircle2, CircleAlert, XCircle } from 'lucide-react'

import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import { useBatchReadiness } from '@/features/batches/hooks/use-batch-readiness'
import { useBatchConflicts } from '@/features/batches/hooks/use-batch-conflicts'
import { useCourseReadiness } from '@/features/courses/hooks/use-course-readiness'
import { useCourseLaunchReadiness } from '@/features/courses/curriculum/content/hooks/use-launch-readiness'
import type { AdminBatch } from '@/features/batches/types'

type HealthLevel = 'ok' | 'attention' | 'blocked'

interface HealthItem {
  label: string
  level: HealthLevel
}

const ICONS: Record<HealthLevel, typeof CheckCircle2> = {
  ok: CheckCircle2,
  attention: CircleAlert,
  blocked: XCircle,
}
const ICON_CLASSES: Record<HealthLevel, string> = {
  ok: 'text-success',
  attention: 'text-warning',
  blocked: 'text-destructive',
}
const OVERALL_LABEL: Record<HealthLevel, string> = {
  ok: 'Ready',
  attention: 'Attention',
  blocked: 'Blocked',
}
const OVERALL_TONE: Record<HealthLevel, 'success' | 'warning' | 'error'> = {
  ok: 'success',
  attention: 'warning',
  blocked: 'error',
}

/**
 * Operational configuration health — never an academic-success or
 * learning-outcome score. Every check is composed from existing,
 * already-verified readiness/conflict services (batch readiness, trainer
 * conflicts, course readiness, content launch readiness); capacity/dates/
 * lifecycle are trivial presence/format checks on data already fetched for
 * this page, not a re-derivation of any business rule.
 */
export function BatchHealthPanel({ batch }: { batch: AdminBatch }) {
  const readinessQuery = useBatchReadiness(batch.id)
  const conflictsQuery = useBatchConflicts(batch.id)
  const courseReadinessQuery = useCourseReadiness(batch.courseId)
  const launchReadinessQuery = useCourseLaunchReadiness(batch.courseId)

  const isLoading =
    readinessQuery.isLoading ||
    conflictsQuery.isLoading ||
    courseReadinessQuery.isLoading ||
    launchReadinessQuery.isLoading

  if (isLoading) {
    return <ListSkeleton rows={4} />
  }

  const items: HealthItem[] = []

  items.push({
    label: courseReadinessQuery.data?.ready
      ? 'Course Publish-Ready'
      : `Course not publish-ready (${(courseReadinessQuery.data?.blockers.length ?? 0).toString()} item(s))`,
    level: courseReadinessQuery.data?.ready ? 'ok' : 'attention',
  })
  items.push({
    label: launchReadinessQuery.data?.ready
      ? 'Learning Content Launch-Ready'
      : `Learning content not launch-ready (${(launchReadinessQuery.data?.blockers.length ?? 0).toString()} item(s))`,
    level: launchReadinessQuery.data?.ready ? 'ok' : 'attention',
  })

  if (readinessQuery.data?.ready) {
    items.push({ label: 'Trainer & Timetable Ready', level: 'ok' })
  } else {
    for (const blocker of readinessQuery.data?.blockers ?? []) {
      items.push({ label: blocker.message, level: 'blocked' })
    }
  }

  const conflicts = conflictsQuery.data ?? []
  if (conflicts.length === 0) {
    items.push({ label: 'No Trainer Conflicts', level: 'ok' })
  } else {
    for (const conflict of conflicts) {
      items.push({ label: conflict.message, level: 'blocked' })
    }
  }

  if (batch.startDate && batch.endDate) {
    items.push({ label: 'Batch Dates Set', level: 'ok' })
  } else {
    items.push({ label: 'Start/end dates not set', level: 'attention' })
  }

  if (batch.availableSeats === 0) {
    items.push({ label: 'No seats remaining', level: 'attention' })
  } else if (batch.availableSeats <= 3) {
    items.push({ label: `${batch.availableSeats.toString()} seats remaining`, level: 'attention' })
  } else {
    items.push({ label: `${batch.availableSeats.toString()} seats available`, level: 'ok' })
  }

  if (batch.status === 'CANCELLED') {
    items.push({ label: 'Batch is cancelled', level: 'blocked' })
  }

  const overall: HealthLevel = items.some((item) => item.level === 'blocked')
    ? 'blocked'
    : items.some((item) => item.level === 'attention')
      ? 'attention'
      : 'ok'

  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <p className="text-body-sm font-medium">Operational health</p>
        <StatusBadge label={OVERALL_LABEL[overall]} tone={OVERALL_TONE[overall]} />
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, index) => {
          const Icon = ICONS[item.level]
          return (
            <li key={index} className="flex items-start gap-2">
              <Icon
                className={`${ICON_CLASSES[item.level]} mt-0.5 size-4 shrink-0`}
                aria-hidden="true"
              />
              <span className="text-body-sm">{item.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
