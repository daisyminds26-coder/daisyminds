import { PageContainer } from '@/shared/components/containers/page-container'
import { QuestionForm } from '@/features/question-bank/components/QuestionForm'

export default function QuestionCreatePage() {
  return (
    <PageContainer
      title="Add Question"
      description="Add a new question to the reusable question bank."
    >
      <QuestionForm />
    </PageContainer>
  )
}
