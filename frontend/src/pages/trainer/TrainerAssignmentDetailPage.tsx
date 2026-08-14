import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { buttonVariants } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { AssignmentStatusBadge } from '@/features/assignments/components/AssignmentStatusBadge'
import { SubmissionsPanel } from '@/features/assignments/components/SubmissionsPanel'
import { GradingModal } from '@/features/assignments/components/GradingModal'
import {
  useGradeMySubmission,
  useMyAssignment,
  useMyAttemptHistory,
  useMySubmissionsList,
  useReturnMySubmission,
} from '@/features/trainer-assignments/hooks/use-my-assignments'
import type { AssignmentSubmission, ListSubmissionsParams } from '@/features/assignments/types'

function formatDateTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export default function TrainerAssignmentDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const [submissionFilter, setSubmissionFilter] = useState<ListSubmissionsParams>({})
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null)

  const assignmentQuery = useMyAssignment(assignmentId)
  const submissionsQuery = useMySubmissionsList(assignmentId ?? '', submissionFilter)
  const historyQuery = useMyAttemptHistory(assignmentId ?? '', selectedSubmission?.studentId)
  const gradeSubmission = useGradeMySubmission(assignmentId ?? '')
  const returnSubmission = useReturnMySubmission(assignmentId ?? '')

  if (assignmentQuery.isLoading) return <PageLoader />
  if (assignmentQuery.isError || !assignmentQuery.data) {
    return (
      <PageContainer title="Assignment">
        <ErrorState
          description={
            assignmentQuery.isError
              ? getSafeErrorMessage(assignmentQuery.error)
              : 'Assignment not found.'
          }
          onRetry={() => void assignmentQuery.refetch()}
        />
      </PageContainer>
    )
  }

  const assignment = assignmentQuery.data

  return (
    <PageContainer
      title={assignment.title}
      description={`${assignment.assignmentCode} · ${assignment.courseTitle}`}
      actions={
        <Link
          to="/trainer/assignments"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back to assignments
        </Link>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <AssignmentStatusBadge status={assignment.status} />
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-caption text-muted-foreground">Instructions</p>
            <p className="text-body-sm whitespace-pre-wrap">{assignment.instructions}</p>
          </div>
          <div>
            <p className="text-caption text-muted-foreground">Target batches</p>
            <p className="text-body-sm">
              {assignment.batches.map((batch) => batch.name).join(', ')}
            </p>
          </div>
          <div>
            <p className="text-caption text-muted-foreground">Due</p>
            <p className="text-body-sm">
              {formatDateTime(assignment.dueDateTime, assignment.timezone)}
            </p>
          </div>
          <div>
            <p className="text-caption text-muted-foreground">Marks</p>
            <p className="text-body-sm">
              {assignment.maxMarks} max
              {assignment.passingMarks !== null
                ? ` · ${String(assignment.passingMarks)} to pass`
                : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      <SubmissionsPanel
        submissions={submissionsQuery.data ?? []}
        isLoading={submissionsQuery.isLoading}
        errorMessage={
          submissionsQuery.isError ? getSafeErrorMessage(submissionsQuery.error) : undefined
        }
        onRetry={() => void submissionsQuery.refetch()}
        filter={submissionFilter}
        onFilterChange={setSubmissionFilter}
        onSelect={setSelectedSubmission}
      />

      <GradingModal
        key={selectedSubmission?.id ?? 'none'}
        open={selectedSubmission !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSubmission(null)
        }}
        assignment={assignment}
        submission={selectedSubmission}
        history={historyQuery.data ?? []}
        canReturn={assignment.allowResubmission}
        isGrading={gradeSubmission.isPending}
        isReturning={returnSubmission.isPending}
        onGrade={(marksAwarded, feedback) => {
          if (!selectedSubmission) return
          gradeSubmission.mutate(
            {
              submissionId: selectedSubmission.id,
              payload: { marksAwarded, feedback: feedback || undefined },
            },
            {
              onSuccess: () => {
                toast.success('Grade saved')
                setSelectedSubmission(null)
              },
              onError: (error) => toast.error('Could not save grade', getSafeErrorMessage(error)),
            },
          )
        }}
        onReturn={(reason) => {
          if (!selectedSubmission) return
          returnSubmission.mutate(
            { submissionId: selectedSubmission.id, reason },
            {
              onSuccess: () => {
                toast.success('Returned for resubmission')
                setSelectedSubmission(null)
              },
              onError: (error) =>
                toast.error('Could not return submission', getSafeErrorMessage(error)),
            },
          )
        }}
      />
    </PageContainer>
  )
}
