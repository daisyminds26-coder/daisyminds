import { FileQuestion } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { StudentAssessmentCard } from '@/features/student-assessments/components/StudentAssessmentCard'
import { useMyAssessments } from '@/features/student-assessments/hooks/use-my-assessments'
import type { StudentAssessment } from '@/features/student-assessments/types'

function groupAssessments(assessments: StudentAssessment[]) {
  const inProgress = assessments.filter((item) => item.currentAttemptId !== null)
  const results = assessments.filter((item) => item.latestAttempt?.resultVisible)
  const submitted = assessments.filter(
    (item) => item.latestAttempt && !item.latestAttempt.resultVisible && !item.currentAttemptId,
  )
  const available = assessments.filter(
    (item) => item.canStart && !item.currentAttemptId && !item.latestAttempt,
  )
  const upcoming = assessments.filter(
    (item) =>
      !item.currentAttemptId &&
      !item.latestAttempt &&
      !item.canStart &&
      item.status === 'PUBLISHED' &&
      item.openAt &&
      new Date(item.openAt) > new Date(),
  )
  return { inProgress, available, upcoming, submitted, results }
}

function Section({ title, items }: { title: string; items: StudentAssessment[] }) {
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h3">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((assessment) => (
          <StudentAssessmentCard key={assessment.id} assessment={assessment} />
        ))}
      </div>
    </section>
  )
}

export default function StudentAssessmentsPage() {
  const assessmentsQuery = useMyAssessments()

  if (assessmentsQuery.isLoading) return <PageLoader />
  if (assessmentsQuery.isError) {
    return (
      <PageContainer title="Quizzes & Examinations">
        <ErrorState
          description={getSafeErrorMessage(assessmentsQuery.error)}
          onRetry={() => void assessmentsQuery.refetch()}
        />
      </PageContainer>
    )
  }

  const assessments = assessmentsQuery.data ?? []
  const { inProgress, available, upcoming, submitted, results } = groupAssessments(assessments)

  return (
    <PageContainer
      title="Quizzes & Examinations"
      description="Your assigned quizzes and examinations."
    >
      {assessments.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No assessments yet"
          description="Assessments assigned to your batch will appear here."
        />
      ) : (
        <div className="flex flex-col gap-8">
          <Section title="In Progress" items={inProgress} />
          <Section title="Available" items={available} />
          <Section title="Upcoming" items={upcoming} />
          <Section title="Submitted — Awaiting Result" items={submitted} />
          <Section title="Results" items={results} />
        </div>
      )}
    </PageContainer>
  )
}
