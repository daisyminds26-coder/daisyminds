import { Link } from 'react-router-dom'
import { Award, BookOpen, CalendarCheck, ClipboardList, FileQuestion, Video } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { SectionContainer } from '@/shared/components/containers/section-container'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { CardSkeleton, ListSkeleton } from '@/shared/components/feedback/skeletons'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useCurrentUser } from '@/features/auth/hooks/use-current-user'
import { ContinueLearningCard, CourseCard, useStudentDashboard } from '@/features/student-portal'
import { LiveClassCard } from '@/features/student-live-classes/components/LiveClassCard'
import { useStudentLiveClasses } from '@/features/student-live-classes/hooks/use-student-live-classes'
import { useJoinLiveClass } from '@/features/student-live-classes/hooks/use-join-live-class'
import type { StudentLiveClass } from '@/features/student-live-classes/types'
import { useMyAssignments } from '@/features/student-assignments/hooks/use-my-assignments'
import { useMyAssessments } from '@/features/student-assessments/hooks/use-my-assessments'

const DASHBOARD_LIVE_CLASS_LIMIT = 3
const DASHBOARD_ASSIGNMENT_LIMIT = 3
const DASHBOARD_ASSESSMENT_LIMIT = 3

function displayFirstName(email: string): string {
  const localPart = email.split('@')[0] ?? email
  const firstWord = localPart.split(/[._-]/)[0] ?? localPart
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1)
}

export default function StudentDashboardPage() {
  const { data: authUser } = useCurrentUser()
  const { data, isLoading, isError, refetch } = useStudentDashboard()
  const liveClassesQuery = useStudentLiveClasses()
  const joinLiveClass = useJoinLiveClass()
  const assignmentsQuery = useMyAssignments()
  const assessmentsQuery = useMyAssessments()

  const greetingName = authUser ? displayFirstName(authUser.email) : ''

  const upcomingLiveClasses = (liveClassesQuery.data ?? [])
    .filter((session) => session.status === 'SCHEDULED' || session.status === 'LIVE')
    .slice(0, DASHBOARD_LIVE_CLASS_LIMIT)

  const dueSoonAssignments = (assignmentsQuery.data ?? [])
    .filter((assignment) => assignment.canSubmit)
    .sort((a, b) => a.dueDateTime.localeCompare(b.dueDateTime))
    .slice(0, DASHBOARD_ASSIGNMENT_LIMIT)

  const upcomingAssessments = (assessmentsQuery.data ?? [])
    .filter((assessment) => assessment.canStart || assessment.currentAttemptId !== null)
    .sort((a, b) => (a.openAt ?? '').localeCompare(b.openAt ?? ''))
    .slice(0, DASHBOARD_ASSESSMENT_LIMIT)

  function handleJoin(session: StudentLiveClass) {
    joinLiveClass.mutate(session.id, {
      onSuccess: (details) => {
        window.open(details.joinUrl, '_blank', 'noopener,noreferrer')
      },
      onError: (error) => {
        toast.error("Can't join right now", getSafeErrorMessage(error))
      },
    })
  }

  return (
    <PageContainer
      title={greetingName ? `Welcome back, ${greetingName}` : 'Welcome back'}
      description="Here's where you left off."
    >
      {isError && (
        <ErrorState
          title="Couldn't load your dashboard"
          description="Something went wrong loading your courses. Please try again."
          onRetry={() => void refetch()}
        />
      )}

      {isLoading && (
        <div className="flex flex-col gap-6">
          <CardSkeleton />
          <ListSkeleton rows={3} />
        </div>
      )}

      {data && (
        <>
          <ContinueLearningCard enrollment={data.continueLearning} />

          <SectionContainer
            title="My Courses"
            actions={
              data.courses.length > 0 && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/student/courses">View all</Link>
                </Button>
              )
            }
          >
            {data.courses.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <EmptyState
                    icon={BookOpen}
                    title="No courses yet"
                    description="Courses you're enrolled in will appear here once your batch is confirmed."
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.courses.map((enrollment) => (
                  <CourseCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            )}
          </SectionContainer>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionContainer title="Upcoming Schedule">
              <Card>
                <CardContent className="pt-6">
                  {data.upcomingSchedule.length === 0 ? (
                    <EmptyState
                      icon={CalendarCheck}
                      title="Nothing scheduled right now"
                      description="Upcoming class times for your active courses will show up here."
                    />
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {data.upcomingSchedule.slice(0, 5).map((occurrence, index) => (
                        <li
                          key={`${occurrence.date}-${occurrence.startTime}-${String(index)}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex flex-col gap-0.5">
                            <p className="text-body-sm font-medium">{occurrence.courseTitle}</p>
                            <p className="text-caption text-muted-foreground">
                              {occurrence.date} · {occurrence.startTime}–{occurrence.endTime} (
                              {occurrence.deliveryMode})
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </SectionContainer>

            <SectionContainer
              title="Upcoming Live Classes"
              actions={
                upcomingLiveClasses.length > 0 && (
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/student/live-classes">View all</Link>
                  </Button>
                )
              }
            >
              {liveClassesQuery.isLoading ? (
                <ListSkeleton rows={2} />
              ) : upcomingLiveClasses.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <EmptyState
                      icon={Video}
                      title="No live classes scheduled"
                      description="Sessions your trainer schedules will appear here, with a Join button once the class is about to start."
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {upcomingLiveClasses.map((session) => (
                    <LiveClassCard
                      key={session.id}
                      session={session}
                      onJoin={handleJoin}
                      isJoining={joinLiveClass.isPending && joinLiveClass.variables === session.id}
                    />
                  ))}
                </div>
              )}
            </SectionContainer>
          </div>

          <SectionContainer
            title="Assignments Due Soon"
            actions={
              dueSoonAssignments.length > 0 && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/student/assignments">View all</Link>
                </Button>
              )
            }
          >
            {assignmentsQuery.isLoading ? (
              <ListSkeleton rows={2} />
            ) : dueSoonAssignments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <EmptyState
                    icon={ClipboardList}
                    title="Nothing due right now"
                    description="Assignments issued to your batches will appear here as they're published."
                  />
                </CardContent>
              </Card>
            ) : (
              <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
                {dueSoonAssignments.map((assignment) => (
                  <li key={assignment.id}>
                    <Link
                      to={`/student/assignments/${assignment.id}`}
                      className="hover:bg-muted/50 flex items-center justify-between gap-3 p-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-body-sm font-medium">{assignment.title}</span>
                        <span className="text-caption text-muted-foreground">
                          {assignment.courseTitle}
                        </span>
                      </div>
                      <span className="text-caption text-muted-foreground">
                        Due {new Date(assignment.dueDateTime).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionContainer>

          <SectionContainer
            title="Upcoming Assessments"
            actions={
              upcomingAssessments.length > 0 && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/student/assessments">View all</Link>
                </Button>
              )
            }
          >
            {assessmentsQuery.isLoading ? (
              <ListSkeleton rows={2} />
            ) : upcomingAssessments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <EmptyState
                    icon={FileQuestion}
                    title="Nothing to take right now"
                    description="Quizzes and examinations issued to your batches will appear here as they open."
                  />
                </CardContent>
              </Card>
            ) : (
              <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
                {upcomingAssessments.map((assessment) => (
                  <li key={assessment.id}>
                    <Link
                      to={`/student/assessments/${assessment.id}`}
                      className="hover:bg-muted/50 flex items-center justify-between gap-3 p-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-body-sm font-medium">{assessment.title}</span>
                        <span className="text-caption text-muted-foreground">
                          {assessment.assessmentType === 'QUIZ' ? 'Quiz' : 'Examination'} ·{' '}
                          {assessment.courseTitle}
                        </span>
                      </div>
                      <span className="text-caption text-muted-foreground">
                        {assessment.currentAttemptId
                          ? 'In progress'
                          : `${String(assessment.durationMinutes)} min`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionContainer>

          <p className="text-caption text-muted-foreground flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Award className="size-3.5" aria-hidden="true" />
              Certificates — coming later
            </span>
          </p>
        </>
      )}
    </PageContainer>
  )
}
