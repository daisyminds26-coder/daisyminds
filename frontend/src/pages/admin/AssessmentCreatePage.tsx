import { PageContainer } from '@/shared/components/containers/page-container'
import { AssessmentForm } from '@/features/assessments/components/AssessmentForm'

export default function AssessmentCreatePage() {
  return (
    <PageContainer title="Create Assessment" description="Set up a new quiz or examination.">
      <AssessmentForm />
    </PageContainer>
  )
}
