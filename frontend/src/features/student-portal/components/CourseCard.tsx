import { Link } from 'react-router-dom'
import { Award, BookOpen } from 'lucide-react'

import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import { CourseProgressBar } from '@/features/student-portal/components/CourseProgressBar'
import { accessStateLabel, accessStateTone } from '@/features/student-portal/utils/access-state'
import type { StudentEnrollment } from '@/features/student-portal/types'
import { cn } from '@/shared/lib/utils'

const LEVEL_LABELS: Record<StudentEnrollment['courseLevel'], string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  ALL_LEVELS: 'All levels',
}

function learningCtaLabel(enrollment: StudentEnrollment): string {
  const progress = enrollment.courseProgress
  if (!progress) return 'Start Learning'
  if (progress.isComplete) return 'Review Course'
  if (progress.lastAccessedLessonId) return 'Continue Learning'
  return 'Start Learning'
}

interface CourseCardProps {
  enrollment: StudentEnrollment
  className?: string
}

/** The premium course card used on both the Dashboard's "My Courses" strip and the full My Courses page — one card, two contexts, never two implementations. */
export function CourseCard({ enrollment, className }: CourseCardProps) {
  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <Link
        to={`/student/courses/${enrollment.courseId}`}
        className="focus-visible:ring-ring group rounded-t-xl outline-none focus-visible:ring-2"
      >
        <div className="bg-muted flex aspect-[16/9] items-center justify-center overflow-hidden">
          {enrollment.courseThumbnailUrl ? (
            <img
              src={enrollment.courseThumbnailUrl}
              alt=""
              className="size-full object-cover transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <BookOpen className="text-muted-foreground size-8" aria-hidden="true" />
          )}
        </div>
      </Link>
      <CardContent className="flex flex-1 flex-col gap-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <Link
              to={`/student/courses/${enrollment.courseId}`}
              className="hover:text-primary text-body font-semibold"
            >
              {enrollment.courseTitle}
            </Link>
            <p className="text-caption text-muted-foreground">{enrollment.courseCode}</p>
          </div>
          {enrollment.certificateEnabled && (
            <Award className="text-primary size-4 shrink-0" aria-label="Certificate available" />
          )}
        </div>

        {enrollment.batch && (
          <p className="text-body-sm text-muted-foreground">{enrollment.batch.name}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge
            label={accessStateLabel(enrollment.accessState)}
            tone={accessStateTone(enrollment.accessState)}
          />
          <Badge variant="outline">{LEVEL_LABELS[enrollment.courseLevel]}</Badge>
          <Badge variant="outline">{enrollment.courseDeliveryMode}</Badge>
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-1">
          {enrollment.courseProgress && (
            <CourseProgressBar progress={enrollment.courseProgress} compact />
          )}
          {enrollment.hasAccess && (
            <Button asChild size="sm" className="w-full">
              <Link to={`/student/courses/${enrollment.courseId}/learn`}>
                {learningCtaLabel(enrollment)}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
