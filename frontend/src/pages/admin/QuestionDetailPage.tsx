import { ArrowLeft, Copy } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { QuestionStatusBadge } from '@/features/question-bank/components/QuestionStatusBadge'
import { QuestionForm } from '@/features/question-bank/components/QuestionForm'
import { useQuestion } from '@/features/question-bank/hooks/use-question'
import {
  useArchiveQuestion,
  useDuplicateQuestion,
} from '@/features/question-bank/hooks/use-question-mutations'

export default function QuestionDetailPage() {
  const { questionId } = useParams<{ questionId: string }>()
  const navigate = useNavigate()
  const questionQuery = useQuestion(questionId)
  const archiveQuestion = useArchiveQuestion()
  const duplicateQuestion = useDuplicateQuestion()

  if (questionQuery.isLoading) return <PageLoader />
  if (questionQuery.isError || !questionQuery.data) {
    return (
      <PageContainer title="Question">
        <ErrorState
          description={
            questionQuery.isError ? getSafeErrorMessage(questionQuery.error) : 'Question not found.'
          }
          onRetry={() => void questionQuery.refetch()}
        />
      </PageContainer>
    )
  }

  const question = questionQuery.data

  return (
    <PageContainer
      title={question.questionCode}
      description={question.courseTitle}
      actions={
        <>
          <Link
            to="/admin/question-bank"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <ArrowLeft className="size-3.5" />
            Back to question bank
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={duplicateQuestion.isPending}
            onClick={() => {
              duplicateQuestion.mutate(question.id, {
                onSuccess: (copy) => {
                  toast.success('Question duplicated')
                  void navigate(`/admin/question-bank/${copy.id}`)
                },
                onError: (error) =>
                  toast.error('Could not duplicate question', getSafeErrorMessage(error)),
              })
            }}
          >
            <Copy className="size-3.5" />
            Duplicate
          </Button>
          {question.status !== 'ARCHIVED' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive"
              disabled={archiveQuestion.isPending}
              onClick={() => {
                archiveQuestion.mutate(question.id, {
                  onSuccess: () => toast.success('Question archived'),
                  onError: (error) =>
                    toast.error('Could not archive question', getSafeErrorMessage(error)),
                })
              }}
            >
              Archive
            </Button>
          )}
        </>
      }
    >
      <div className="flex items-center gap-3">
        <QuestionStatusBadge status={question.status} />
        {question.requiresManualGrading && (
          <span className="text-caption text-muted-foreground">Requires manual grading</span>
        )}
      </div>
      {question.status === 'ARCHIVED' ? (
        <p className="text-body-sm text-muted-foreground">
          An archived question cannot be edited. Duplicate it to make changes.
        </p>
      ) : (
        <QuestionForm existing={question} />
      )}
    </PageContainer>
  )
}
