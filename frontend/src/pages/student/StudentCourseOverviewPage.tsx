import { Link, useParams } from 'react-router-dom'
import { ArrowRight, BookOpen, Calendar, Globe2, User } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { SectionContainer } from '@/shared/components/containers/section-container'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import { UserAvatar } from '@/shared/components/data-display/user-avatar'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { CardSkeleton } from '@/shared/components/feedback/skeletons'
import { ApiClientError } from '@/shared/lib/api-error'
import { CourseProgressBar } from '@/features/student-portal/components/CourseProgressBar'
import { CurriculumAccordion, useStudentCourse } from '@/features/student-portal'
import { accessStateLabel, accessStateTone } from '@/features/student-portal/utils/access-state'

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  ALL_LEVELS: 'All levels',
}

export default function StudentCourseOverviewPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { data: course, isLoading, isError, error, refetch } = useStudentCourse(courseId)

  if (isLoading) {
    return (
      <PageContainer title="Loading course…">
        <CardSkeleton />
      </PageContainer>
    )
  }

  if (isError) {
    const notFound = error instanceof ApiClientError && error.statusCode === 404

    return (
      <PageContainer title="Course">
        <ErrorState
          title={notFound ? 'Course not found' : "Couldn't load this course"}
          description={
            notFound
              ? "This course doesn't exist, or you don't have access to it."
              : 'Something went wrong. Please try again.'
          }
          onRetry={notFound ? undefined : () => void refetch()}
        />
      </PageContainer>
    )
  }

  if (!course) return null

  return (
    <PageContainer title={course.title} description={course.courseCode}>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row">
          <div className="bg-muted flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-lg sm:w-56">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt="" className="size-full object-cover" />
            ) : (
              <BookOpen className="text-muted-foreground size-8" aria-hidden="true" />
            )}
          </div>

          <div className="flex flex-1 flex-col gap-3">
            {course.shortDescription && (
              <p className="text-body-sm text-muted-foreground">{course.shortDescription}</p>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge
                label={accessStateLabel(course.accessState)}
                tone={accessStateTone(course.accessState)}
              />
              <Badge variant="outline">{LEVEL_LABELS[course.level] ?? course.level}</Badge>
              <Badge variant="outline">{course.deliveryMode}</Badge>
              {course.certificateEnabled && <Badge variant="outline">Certificate</Badge>}
            </div>

            <div className="text-body-sm text-muted-foreground flex flex-wrap gap-x-5 gap-y-1.5">
              <span className="flex items-center gap-1.5">
                <Globe2 className="size-4" aria-hidden="true" />
                {course.language}
              </span>
              {course.batch && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4" aria-hidden="true" />
                  {course.batch.name}
                </span>
              )}
              {course.trainer && (
                <span className="flex items-center gap-1.5">
                  <User className="size-4" aria-hidden="true" />
                  {course.trainer.name}
                </span>
              )}
            </div>

            {course.trainer && (
              <div className="flex items-center gap-2 pt-1">
                <UserAvatar
                  name={course.trainer.name}
                  avatarUrl={course.trainer.profilePhotoUrl ?? undefined}
                  size="sm"
                />
                <span className="text-body-sm">{course.trainer.name}</span>
              </div>
            )}

            {course.hasAccess && (
              <div className="mt-auto flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <CourseProgressBar progress={course.courseProgress} className="sm:max-w-xs" />
                <Button asChild className="shrink-0 gap-2">
                  <Link to={`/student/courses/${course.id}/learn`}>
                    {course.courseProgress.lastAccessedLessonId
                      ? 'Continue Learning'
                      : 'Start Learning'}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!course.hasAccess && (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={BookOpen}
              title={
                course.accessState === 'SUSPENDED'
                  ? 'Your course access is currently paused'
                  : course.accessState === 'ENDED'
                    ? 'Your access to this course has ended'
                    : 'You do not currently have access to this course'
              }
              description={
                course.accessState === 'SUSPENDED'
                  ? 'Contact support if you think this is a mistake — your curriculum will be back as soon as access resumes.'
                  : 'Reach out to support if you believe this is incorrect.'
              }
            />
          </CardContent>
        </Card>
      )}

      {course.hasAccess && (
        <SectionContainer title="Curriculum">
          <CurriculumAccordion courseId={course.id} modules={course.modules} />
        </SectionContainer>
      )}
    </PageContainer>
  )
}
