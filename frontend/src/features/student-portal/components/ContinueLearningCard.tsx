import { Link } from 'react-router-dom'
import { ArrowRight, GraduationCap } from 'lucide-react'

import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { CourseProgressBar } from '@/features/student-portal/components/CourseProgressBar'
import type { StudentEnrollment } from '@/features/student-portal/types'

interface ContinueLearningCardProps {
  enrollment: StudentEnrollment | null
}

/**
 * The dashboard's primary, featured action — routes into the Learning
 * Player's resume endpoint (`/learn`, no lesson id), which server-side
 * resolves the student's real `lastAccessedLessonId` (or the first
 * published lesson if they've never opened one). Progress shown here is
 * always the backend-computed `courseProgress`, never a client guess.
 */
export function ContinueLearningCard({ enrollment }: ContinueLearningCardProps) {
  if (!enrollment) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={GraduationCap}
            title="You don't have an active course yet"
            description="Once you're enrolled in a batch, it will show up here so you can jump straight back in."
          />
        </CardContent>
      </Card>
    )
  }

  const ctaLabel = enrollment.courseProgress?.lastAccessedLessonId
    ? 'Continue course'
    : 'Start course'

  return (
    <Card className="from-primary/10 via-card to-card overflow-hidden bg-gradient-to-br">
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-sm flex-1 flex-col gap-1.5">
          <p className="text-caption text-primary font-semibold tracking-wide uppercase">
            Continue learning
          </p>
          <p className="text-h2 font-semibold">{enrollment.courseTitle}</p>
          {enrollment.batch && (
            <p className="text-body-sm text-muted-foreground">{enrollment.batch.name}</p>
          )}
          {enrollment.courseProgress && (
            <CourseProgressBar progress={enrollment.courseProgress} className="mt-2" />
          )}
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link to={`/student/courses/${enrollment.courseId}/learn`}>
            {ctaLabel}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
