import { Navigate, useParams } from 'react-router-dom'

import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { useCourseProgress } from '@/features/learning-player/hooks/use-course-progress'

/**
 * `/student/courses/:courseId/learn` (no lesson id) — real "resume
 * learning," not a fake one: routes to `lastAccessedLessonId` if the
 * student has ever opened a lesson in this course, otherwise the first
 * published lesson. Both come from the backend-computed course-progress
 * summary, never guessed client-side.
 */
export default function StudentLearningRedirectPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { data, isLoading, isError, refetch } = useCourseProgress(courseId)

  if (isLoading) return <PageLoader />
  if (isError || !data) {
    return <ErrorState title="Couldn't load this course" onRetry={() => void refetch()} />
  }

  const targetLessonId = data.lastAccessedLessonId ?? data.firstLessonId
  if (!targetLessonId) {
    return (
      <ErrorState
        title="No lessons available yet"
        description="This course doesn't have any published lessons to start."
      />
    )
  }

  return <Navigate to={`/student/courses/${courseId ?? ''}/learn/${targetLessonId}`} replace />
}
