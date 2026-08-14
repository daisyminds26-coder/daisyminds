import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Card, CardContent } from '@/shared/components/ui/card'
import { buttonVariants } from '@/shared/components/ui/button'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { AssessmentStatusBadge } from '@/features/assessments/components/AssessmentStatusBadge'
import { AttemptsPanel } from '@/features/assessments/components/AttemptsPanel'
import { GradingModal } from '@/features/assessments/components/GradingModal'
import { useMyAssessment } from '@/features/trainer-assessments/hooks/use-my-assessments'
import {
  useGradeMyAttempt,
  useMyAttempt,
  useMyAttemptsList,
} from '@/features/trainer-assessments/hooks/use-my-attempts'
import type { AttemptSummary, ListAttemptsParams } from '@/features/assessments/types'

export default function TrainerAssessmentDetailPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const [attemptFilter, setAttemptFilter] = useState<ListAttemptsParams>({})
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptSummary | null>(null)

  const assessmentQuery = useMyAssessment(assessmentId)
  const attemptsQuery = useMyAttemptsList(assessmentId ?? '', attemptFilter)
  const selectedAttemptDetail = useMyAttempt(selectedAttempt?.id)
  const gradeAttempt = useGradeMyAttempt(assessmentId ?? '')

  if (assessmentQuery.isLoading) return <PageLoader />
  if (assessmentQuery.isError || !assessmentQuery.data) {
    return (
      <PageContainer title="Assessment">
        <ErrorState
          description={
            assessmentQuery.isError
              ? getSafeErrorMessage(assessmentQuery.error)
              : 'Assessment not found.'
          }
          onRetry={() => void assessmentQuery.refetch()}
        />
      </PageContainer>
    )
  }

  const assessment = assessmentQuery.data

  return (
    <PageContainer
      title={assessment.title}
      description={`${assessment.assessmentCode} · ${assessment.courseTitle}`}
      actions={
        <Link
          to="/trainer/assessments"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back to assessments
        </Link>
      }
    >
      <div className="flex items-center gap-3">
        <AssessmentStatusBadge status={assessment.status} />
        <span className="text-body-sm text-muted-foreground">
          {assessment.questionCount} questions · {assessment.totalMarks} marks ·{' '}
          {assessment.durationMinutes} min
        </span>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-4">
          {(
            [
              ['Total attempts', assessment.attemptCounts.totalAttempts],
              ['Pending grading', assessment.attemptCounts.pendingGrading],
              ['Passed', assessment.attemptCounts.passed],
              ['Failed', assessment.attemptCounts.failed],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-caption text-muted-foreground">{label}</span>
              <span className="text-h3 font-semibold">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <AttemptsPanel
        attempts={attemptsQuery.data ?? []}
        isLoading={attemptsQuery.isLoading}
        errorMessage={attemptsQuery.isError ? getSafeErrorMessage(attemptsQuery.error) : undefined}
        onRetry={() => void attemptsQuery.refetch()}
        filter={attemptFilter}
        onFilterChange={setAttemptFilter}
        onSelect={setSelectedAttempt}
      />

      <GradingModal
        key={selectedAttempt?.id ?? 'none'}
        open={selectedAttempt !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAttempt(null)
        }}
        attempt={selectedAttemptDetail.data ?? null}
        isGrading={gradeAttempt.isPending}
        onGrade={(grades) => {
          if (!selectedAttempt) return
          gradeAttempt.mutate(
            { attemptId: selectedAttempt.id, payload: { grades } },
            {
              onSuccess: () => toast.success('Grades saved'),
              onError: (error) => toast.error('Could not save grades', getSafeErrorMessage(error)),
            },
          )
        }}
      />
    </PageContainer>
  )
}
