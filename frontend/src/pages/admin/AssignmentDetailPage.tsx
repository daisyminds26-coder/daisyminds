import { useRef, useState } from 'react'
import { ArrowLeft, Download, Paperclip, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Modal } from '@/shared/components/overlays/modal'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { AssignmentStatusBadge } from '@/features/assignments/components/AssignmentStatusBadge'
import { AssignmentForm } from '@/features/assignments/components/AssignmentForm'
import { SubmissionsPanel } from '@/features/assignments/components/SubmissionsPanel'
import { GradingModal } from '@/features/assignments/components/GradingModal'
import { useAssignment } from '@/features/assignments/hooks/use-assignment'
import {
  useArchiveAssignment,
  useCancelAssignment,
  useCloseAssignment,
  usePublishAssignment,
} from '@/features/assignments/hooks/use-assignment-lifecycle'
import {
  useRemoveAssignmentAttachment,
  useUploadAssignmentAttachment,
} from '@/features/assignments/hooks/use-assignment-attachments'
import {
  useAttemptHistory,
  useGradeSubmission,
  useReturnSubmission,
  useSubmissionsList,
} from '@/features/assignments/hooks/use-submissions'
import { getAttachmentDeliveryUrl } from '@/features/assignments/api/assignments.api'
import type { AssignmentSubmission, ListSubmissionsParams } from '@/features/assignments/types'

function formatDateTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [submissionFilter, setSubmissionFilter] = useState<ListSubmissionsParams>({})
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const assignmentQuery = useAssignment(assignmentId)
  const publishAssignment = usePublishAssignment()
  const closeAssignment = useCloseAssignment()
  const archiveAssignment = useArchiveAssignment()
  const cancelAssignment = useCancelAssignment()
  const uploadAttachment = useUploadAssignmentAttachment(assignmentId ?? '')
  const removeAttachment = useRemoveAssignmentAttachment(assignmentId ?? '')
  const submissionsQuery = useSubmissionsList(assignmentId ?? '', submissionFilter)
  const historyQuery = useAttemptHistory(assignmentId ?? '', selectedSubmission?.studentId)
  const gradeSubmission = useGradeSubmission(assignmentId ?? '')
  const returnSubmission = useReturnSubmission(assignmentId ?? '')

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
        <>
          <Link
            to="/admin/assignments"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <ArrowLeft className="size-3.5" />
            Back to assignments
          </Link>
          {assignment.status === 'DRAFT' && (
            <Button
              type="button"
              size="sm"
              disabled={publishAssignment.isPending}
              onClick={() => {
                publishAssignment.mutate(assignment.id, {
                  onSuccess: () => toast.success('Assignment published'),
                  onError: (error) =>
                    toast.error('Could not publish assignment', getSafeErrorMessage(error)),
                })
              }}
            >
              Publish
            </Button>
          )}
          {assignment.status === 'PUBLISHED' && (
            <Button
              type="button"
              size="sm"
              disabled={closeAssignment.isPending}
              onClick={() => {
                closeAssignment.mutate(assignment.id, {
                  onSuccess: () => toast.success('Assignment closed'),
                  onError: (error) =>
                    toast.error('Could not close assignment', getSafeErrorMessage(error)),
                })
              }}
            >
              Close
            </Button>
          )}
          {assignment.status === 'CLOSED' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={archiveAssignment.isPending}
              onClick={() => {
                archiveAssignment.mutate(assignment.id, {
                  onSuccess: () => toast.success('Assignment archived'),
                  onError: (error) =>
                    toast.error('Could not archive assignment', getSafeErrorMessage(error)),
                })
              }}
            >
              Archive
            </Button>
          )}
          {(assignment.status === 'DRAFT' || assignment.status === 'PUBLISHED') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => {
                setCancelOpen(true)
              }}
            >
              Cancel
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <AssignmentStatusBadge status={assignment.status} />
        {assignment.cancellationReason && (
          <span className="text-body-sm text-destructive">
            Cancelled: {assignment.cancellationReason}
          </span>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {assignment.status === 'DRAFT' ? (
            <AssignmentForm existing={assignment} onDone={() => void assignmentQuery.refetch()} />
          ) : (
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
                <div>
                  <p className="text-caption text-muted-foreground">Submission type</p>
                  <p className="text-body-sm">{assignment.submissionType}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mt-4">
            <CardContent className="flex flex-col gap-3 pt-6">
              <div className="flex items-center justify-between">
                <p className="text-body-sm font-medium">Attachments</p>
                {assignment.status === 'DRAFT' && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        uploadAttachment.mutate(file, {
                          onSuccess: () => toast.success('Attachment added'),
                          onError: (error) =>
                            toast.error('Upload failed', getSafeErrorMessage(error)),
                        })
                        event.target.value = ''
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={uploadAttachment.isPending}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="size-3.5" />
                      {uploadAttachment.isPending ? 'Uploading…' : 'Add attachment'}
                    </Button>
                  </>
                )}
              </div>
              {assignment.attachments.length === 0 ? (
                <p className="text-body-sm text-muted-foreground">No attachments.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {assignment.attachments.map((attachment) => (
                    <li key={attachment.id} className="flex items-center justify-between gap-3">
                      <span className="text-body-sm">
                        {attachment.filename} ({(attachment.bytes / 1024).toFixed(0)} KB)
                      </span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            void getAttachmentDeliveryUrl(assignment.id, attachment.id).then(
                              ({ url }) => {
                                window.open(url, '_blank', 'noopener,noreferrer')
                              },
                            )
                          }}
                        >
                          <Download className="size-3.5" />
                        </Button>
                        {assignment.status === 'DRAFT' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              removeAttachment.mutate(attachment.id, {
                                onError: (error) =>
                                  toast.error(
                                    'Could not remove attachment',
                                    getSafeErrorMessage(error),
                                  ),
                              })
                            }}
                          >
                            <X className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
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
        </TabsContent>
      </Tabs>

      <GradingModal
        key={selectedSubmission?.id ?? 'none'}
        open={selectedSubmission !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSubmission(null)
        }}
        assignment={assignment}
        submission={selectedSubmission}
        history={historyQuery.data ?? []}
        canReturn
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

      <Modal
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open)
          if (!open) setCancelReason('')
        }}
        title="Cancel this assignment?"
        description="Students currently see this assignment — cancelling keeps it visible with a clearly cancelled status, for history."
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="cancel-reason">Cancellation reason</Label>
          <Textarea
            id="cancel-reason"
            value={cancelReason}
            onChange={(event) => {
              setCancelReason(event.target.value)
            }}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCancelOpen(false)
            }}
          >
            Keep assignment
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={cancelAssignment.isPending || cancelReason.trim().length === 0}
            onClick={() => {
              cancelAssignment.mutate(
                { id: assignment.id, reason: cancelReason.trim() },
                {
                  onSuccess: () => {
                    toast.success('Assignment cancelled')
                    setCancelOpen(false)
                  },
                  onError: (error) =>
                    toast.error('Could not cancel assignment', getSafeErrorMessage(error)),
                },
              )
            }}
          >
            {cancelAssignment.isPending ? 'Cancelling…' : 'Cancel assignment'}
          </Button>
        </div>
      </Modal>
    </PageContainer>
  )
}
