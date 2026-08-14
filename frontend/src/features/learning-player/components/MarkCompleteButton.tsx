import { CheckCircle2 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { useMarkLessonComplete } from '@/features/learning-player/hooks/use-mark-lesson-complete'
import type { LessonProgressStatus } from '@/features/student-portal/types'

interface MarkCompleteButtonProps {
  courseId: string
  lessonId: string
  status: LessonProgressStatus | undefined
}

/** TEXT/DOCUMENT/EXTERNAL_LINK lessons complete manually — VIDEO never shows this (it auto-completes at the watch threshold). The mutation is idempotent server-side, so a double-click is harmless. */
export function MarkCompleteButton({ courseId, lessonId, status }: MarkCompleteButtonProps) {
  const markComplete = useMarkLessonComplete(courseId, lessonId)
  const isComplete = status === 'COMPLETED' || markComplete.isSuccess

  if (isComplete) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <CheckCircle2 className="text-success size-4" aria-hidden="true" />
        Completed
      </Button>
    )
  }

  return (
    <Button
      onClick={() => {
        markComplete.mutate()
      }}
      disabled={markComplete.isPending}
    >
      {markComplete.isPending ? 'Marking complete…' : 'Mark as complete'}
    </Button>
  )
}
