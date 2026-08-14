import { Link } from 'react-router-dom'
import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FileQuestion,
  PenSquare,
  Video,
} from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { SectionContainer } from '@/shared/components/containers/section-container'
import { StatCard } from '@/shared/components/data-display/stat-card'
import { Button } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { Card, CardContent } from '@/shared/components/ui/card'
import { useMyAssignments } from '@/features/trainer-assignments/hooks/use-my-assignments'
import { useMyAssessments } from '@/features/trainer-assessments/hooks/use-my-assessments'

const stats = [
  { label: 'Assigned Courses', value: '5', icon: BookOpen },
  { label: 'Upcoming Live Classes', value: '3', icon: Video },
  { label: 'Pending Evaluations', value: '12', icon: PenSquare },
  { label: 'Attendance Marked Today', value: '2 / 4 batches', icon: ClipboardCheck },
]

export default function TrainerDashboardPage() {
  const assignmentsQuery = useMyAssignments()
  const needsGrading = (assignmentsQuery.data ?? [])
    .filter((assignment) => assignment.pendingGradingCount > 0)
    .slice(0, 5)
  const assessmentsQuery = useMyAssessments()
  const assessmentsNeedingGrading = (assessmentsQuery.data ?? [])
    .filter((assessment) => assessment.attemptCounts.pendingGrading > 0)
    .slice(0, 5)

  return (
    <PageContainer
      title="Dashboard"
      description="Your courses, classes, and evaluations at a glance."
    >
      <SectionContainer>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </SectionContainer>

      <SectionContainer title="Today's Schedule">
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Video}
              title="No live classes scheduled today"
              description="Classes you schedule will appear here."
            />
          </CardContent>
        </Card>
      </SectionContainer>

      <SectionContainer
        title="Assignments to Grade"
        actions={
          needsGrading.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/trainer/assignments">View all</Link>
            </Button>
          )
        }
      >
        {assignmentsQuery.isLoading ? (
          <ListSkeleton rows={2} />
        ) : needsGrading.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={ClipboardList}
                title="Nothing pending grading"
                description="Submissions waiting on your review will appear here."
              />
            </CardContent>
          </Card>
        ) : (
          <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
            {needsGrading.map((assignment) => (
              <li key={assignment.id}>
                <Link
                  to={`/trainer/assignments/${assignment.id}`}
                  className="hover:bg-muted/50 flex items-center justify-between gap-3 p-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-body-sm font-medium">{assignment.title}</span>
                    <span className="text-caption text-muted-foreground">
                      {assignment.courseTitle}
                    </span>
                  </div>
                  <span className="text-caption text-muted-foreground">
                    {assignment.pendingGradingCount} to grade
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionContainer>

      <SectionContainer
        title="Assessments to Grade"
        actions={
          assessmentsNeedingGrading.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/trainer/assessments">View all</Link>
            </Button>
          )
        }
      >
        {assessmentsQuery.isLoading ? (
          <ListSkeleton rows={2} />
        ) : assessmentsNeedingGrading.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={FileQuestion}
                title="Nothing pending grading"
                description="Subjective attempts waiting on your review will appear here."
              />
            </CardContent>
          </Card>
        ) : (
          <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
            {assessmentsNeedingGrading.map((assessment) => (
              <li key={assessment.id}>
                <Link
                  to={`/trainer/assessments/${assessment.id}`}
                  className="hover:bg-muted/50 flex items-center justify-between gap-3 p-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-body-sm font-medium">{assessment.title}</span>
                    <span className="text-caption text-muted-foreground">
                      {assessment.courseTitle}
                    </span>
                  </div>
                  <span className="text-caption text-muted-foreground">
                    {assessment.attemptCounts.pendingGrading} to grade
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionContainer>
    </PageContainer>
  )
}
