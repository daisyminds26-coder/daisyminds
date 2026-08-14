import { useRef, useState } from 'react'
import { ArrowLeft, Download, Paperclip, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Input } from '@/shared/components/ui/input'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { SubmissionStatusBadge } from '@/features/assignments/components/SubmissionStatusBadge'
import {
  useMyAssignment,
  useMyAttemptHistory,
} from '@/features/student-assignments/hooks/use-my-assignment'
import {
  useSaveDraft,
  useSubmitAssignment,
} from '@/features/student-assignments/hooks/use-submit-assignment'
import {
  useRemoveSubmissionFile,
  useUploadSubmissionFile,
} from '@/features/student-assignments/hooks/use-submission-files'
import {
  getAssignmentAttachmentDeliveryUrl,
  getSubmissionFileDeliveryUrl,
} from '@/features/student-assignments/api/student-assignments.api'

function formatDateTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export default function StudentAssignmentDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const [textResponse, setTextResponse] = useState('')
  const [linkResponse, setLinkResponse] = useState('')
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [hydratedDraftId, setHydratedDraftId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const assignmentQuery = useMyAssignment(assignmentId)
  const historyQuery = useMyAttemptHistory(assignmentId)
  const saveDraft = useSaveDraft(assignmentId ?? '')
  const submitAssignment = useSubmitAssignment(assignmentId ?? '')
  const uploadFile = useUploadSubmissionFile(assignmentId ?? '')
  const removeFile = useRemoveSubmissionFile(assignmentId ?? '')

  const history = historyQuery.data ?? []
  const currentDraft = history[0]?.status === 'DRAFT' ? history[0] : null
  const pastAttempts = history.filter((attempt) => attempt.status !== 'DRAFT')
  const latestPast = pastAttempts[0]

  const draftId = currentDraft?.id ?? null
  if (draftId !== hydratedDraftId) {
    setHydratedDraftId(draftId)
    setTextResponse(currentDraft?.textResponse ?? '')
    setLinkResponse(currentDraft?.linkResponse ?? '')
  }

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
  const needsText = assignment.submissionType === 'TEXT' || assignment.submissionType === 'MIXED'
  const needsLink = assignment.submissionType === 'LINK' || assignment.submissionType === 'MIXED'
  const needsFile = assignment.submissionType === 'FILE' || assignment.submissionType === 'MIXED'

  function handleSaveDraft() {
    saveDraft.mutate(
      { textResponse: textResponse || undefined, linkResponse: linkResponse || undefined },
      {
        onSuccess: () => toast.success('Draft saved'),
        onError: (error) => toast.error('Could not save draft', getSafeErrorMessage(error)),
      },
    )
  }

  function handleSubmit() {
    submitAssignment.mutate(
      { textResponse: textResponse || undefined, linkResponse: linkResponse || undefined },
      {
        onSuccess: () => {
          toast.success('Assignment submitted')
          setConfirmSubmitOpen(false)
        },
        onError: (error) => {
          toast.error('Could not submit', getSafeErrorMessage(error))
          setConfirmSubmitOpen(false)
        },
      },
    )
  }

  return (
    <PageContainer
      title={assignment.title}
      description={`${assignment.courseTitle} · ${assignment.batchName}`}
      actions={
        <Link
          to="/student/assignments"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back to assignments
        </Link>
      }
    >
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <p className="text-body-sm whitespace-pre-wrap">{assignment.instructions}</p>
          <div className="text-body-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
            <span>Due {formatDateTime(assignment.dueDateTime, assignment.timezone)}</span>
            <span>Max marks: {assignment.maxMarks}</span>
            {assignment.passingMarks !== null && <span>Passing: {assignment.passingMarks}</span>}
          </div>
          {assignment.attachments.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Resources</Label>
              <ul className="flex flex-col gap-1">
                {assignment.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto gap-1.5 p-0"
                      onClick={() => {
                        void getAssignmentAttachmentDeliveryUrl(assignment.id, attachment.id).then(
                          ({ url }) => {
                            window.open(url, '_blank', 'noopener,noreferrer')
                          },
                        )
                      }}
                    >
                      <Download className="size-3.5" />
                      {attachment.filename}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {latestPast && (
        <Card>
          <CardContent className="flex flex-col gap-2 pt-6">
            <div className="flex items-center gap-2">
              <p className="text-body-sm font-medium">Attempt {latestPast.attemptNumber}</p>
              <SubmissionStatusBadge status={latestPast.status} />
              {latestPast.submittedLate && (
                <span className="text-caption text-destructive">Late</span>
              )}
            </div>
            {latestPast.status === 'GRADED' && (
              <p className="text-body-sm">
                Grade: {latestPast.marksAwarded}/{assignment.maxMarks} ({latestPast.percentage}%)
                {latestPast.passStatus && (
                  <span
                    className={
                      latestPast.passStatus === 'PASS' ? 'text-success' : 'text-destructive'
                    }
                  >
                    {' '}
                    · {latestPast.passStatus === 'PASS' ? 'Passed' : 'Not passed'}
                  </span>
                )}
              </p>
            )}
            {latestPast.feedback && (
              <p className="text-body-sm text-muted-foreground">Feedback: {latestPast.feedback}</p>
            )}
            {latestPast.status === 'RETURNED' && (
              <p className="text-body-sm text-destructive">Returned: {latestPast.returnReason}</p>
            )}
          </CardContent>
        </Card>
      )}

      {assignment.canSubmit ? (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <p className="text-body-sm font-medium">
              {currentDraft
                ? 'Continue your draft'
                : latestPast
                  ? 'New attempt'
                  : 'Your submission'}
            </p>

            {needsText && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="text-response">Text response</Label>
                <Textarea
                  id="text-response"
                  rows={6}
                  value={textResponse}
                  onChange={(event) => {
                    setTextResponse(event.target.value)
                  }}
                />
              </div>
            )}

            {needsLink && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="link-response">Link (HTTPS only)</Label>
                <Input
                  id="link-response"
                  type="url"
                  placeholder="https://…"
                  value={linkResponse}
                  onChange={(event) => {
                    setLinkResponse(event.target.value)
                  }}
                />
              </div>
            )}

            {needsFile && (
              <div className="flex flex-col gap-2">
                <Label>Files</Label>
                {(currentDraft?.files ?? []).map((file) => (
                  <div key={file.id} className="flex items-center justify-between gap-3">
                    <span className="text-body-sm">
                      {file.filename} ({(file.bytes / 1024).toFixed(0)} KB)
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void getSubmissionFileDeliveryUrl(assignment.id, file.id).then(
                            ({ url }) => {
                              window.open(url, '_blank', 'noopener,noreferrer')
                            },
                          )
                        }}
                      >
                        <Download className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          removeFile.mutate(file.id, {
                            onError: (error) =>
                              toast.error('Could not remove file', getSafeErrorMessage(error)),
                          })
                        }}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    uploadFile.mutate(file, {
                      onError: (error) => toast.error('Upload failed', getSafeErrorMessage(error)),
                    })
                    event.target.value = ''
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit gap-1.5"
                  disabled={uploadFile.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="size-3.5" />
                  {uploadFile.isPending ? 'Uploading…' : 'Attach file'}
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={saveDraft.isPending}
                onClick={handleSaveDraft}
              >
                {saveDraft.isPending ? 'Saving…' : 'Save Draft'}
              </Button>
              <Button
                type="button"
                disabled={submitAssignment.isPending}
                onClick={() => {
                  setConfirmSubmitOpen(true)
                }}
              >
                Submit Assignment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        !latestPast && (
          <Card>
            <CardContent className="text-body-sm text-muted-foreground pt-6">
              Submissions are not currently open for this assignment.
            </CardContent>
          </Card>
        )
      )}

      {pastAttempts.length > 1 && (
        <Card>
          <CardContent className="flex flex-col gap-2 pt-6">
            <p className="text-body-sm font-medium">Attempt history</p>
            <ul className="border-border divide-border divide-y overflow-hidden rounded-lg border">
              {pastAttempts.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex items-center justify-between gap-3 p-2 text-sm"
                >
                  <span>
                    Attempt {attempt.attemptNumber} ·{' '}
                    {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : '—'}
                  </span>
                  <SubmissionStatusBadge status={attempt.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmSubmitOpen}
        onOpenChange={setConfirmSubmitOpen}
        title="Submit this assignment?"
        description="After submission this attempt cannot be edited unless resubmission is allowed."
        confirmLabel={submitAssignment.isPending ? 'Submitting…' : 'Submit'}
        isConfirming={submitAssignment.isPending}
        onConfirm={handleSubmit}
      />
    </PageContainer>
  )
}
