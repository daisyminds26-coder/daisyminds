import { useParams } from 'react-router-dom'

import { PageLoader } from '@/shared/components/feedback/page-loader'
import { PageContainer } from '@/shared/components/containers/page-container'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { ExamPlayer } from '@/features/student-assessments/components/ExamPlayer'
import { AttemptResultView } from '@/features/student-assessments/components/AttemptResultView'
import { useMyAttempt } from '@/features/student-assessments/hooks/use-attempt'

export default function StudentAssessmentAttemptPage() {
  const { attemptId } = useParams<{ assessmentId: string; attemptId: string }>()
  const attemptQuery = useMyAttempt(attemptId)

  if (attemptQuery.isLoading) return <PageLoader />
  if (attemptQuery.isError || !attemptQuery.data) {
    return (
      <PageContainer title="Attempt">
        <ErrorState
          description={
            attemptQuery.isError ? getSafeErrorMessage(attemptQuery.error) : 'Attempt not found.'
          }
          onRetry={() => void attemptQuery.refetch()}
        />
      </PageContainer>
    )
  }

  const attempt = attemptQuery.data

  if (attempt.status === 'IN_PROGRESS') {
    return (
      <ExamPlayer
        key={attempt.id}
        attempt={attempt}
        onSubmitted={() => void attemptQuery.refetch()}
      />
    )
  }

  return <AttemptResultView attempt={attempt} />
}
