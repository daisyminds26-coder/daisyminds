import { FileQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { AssessmentStatusBadge } from '@/features/assessments/components/AssessmentStatusBadge'
import { useMyAssessments } from '@/features/trainer-assessments/hooks/use-my-assessments'

/** Self-scoped: only assessments targeting a batch this trainer teaches — the backend's ownership check is the real gate, this UI just reflects it. */
export default function TrainerAssessmentsPage() {
  const assessmentsQuery = useMyAssessments()

  return (
    <PageContainer
      title="Quizzes & Examinations"
      description="Assessments issued to batches you teach."
    >
      {assessmentsQuery.isError && (
        <ErrorState
          description={getSafeErrorMessage(assessmentsQuery.error)}
          onRetry={() => void assessmentsQuery.refetch()}
        />
      )}

      {assessmentsQuery.isLoading && <ListSkeleton rows={4} />}

      {assessmentsQuery.data &&
        (assessmentsQuery.data.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            title="No assessments"
            description="Quizzes and examinations an admin issues to your batches will appear here."
          />
        ) : (
          <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
            {assessmentsQuery.data.map((assessment) => (
              <li
                key={assessment.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-body-sm font-medium">{assessment.title}</p>
                  <p className="text-caption text-muted-foreground">
                    {assessment.assessmentType === 'QUIZ' ? 'Quiz' : 'Examination'} ·{' '}
                    {assessment.courseTitle} ·{' '}
                    {assessment.batches.map((batch) => batch.name).join(', ')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AssessmentStatusBadge status={assessment.status} />
                  <span className="text-caption text-muted-foreground">
                    {assessment.attemptCounts.totalAttempts} attempts ·{' '}
                    {assessment.attemptCounts.pendingGrading} to grade
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/trainer/assessments/${assessment.id}`}>Review</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ))}
    </PageContainer>
  )
}
