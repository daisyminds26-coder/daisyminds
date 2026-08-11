import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Repeat2 } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { getStudent } from '@/features/students/api/students.api'
import { getCourse } from '@/features/courses/api/courses.api'
import { getBatch } from '@/features/batches/api/batches.api'
import { EnrollmentStatusBadge } from '@/features/enrollments/components/EnrollmentStatusBadge'
import { AccessBadge } from '@/features/enrollments/components/AccessBadge'
import { EnrollmentAuditTimeline } from '@/features/enrollments/components/EnrollmentAuditTimeline'
import { TransferEnrollmentDialog } from '@/features/enrollments/components/TransferEnrollmentDialog'
import { useEnrollment } from '@/features/enrollments/hooks/use-enrollment'
import {
  useActivateEnrollment,
  useCancelEnrollment,
  useCompleteEnrollment,
  useConfirmEnrollment,
  useDropEnrollment,
  usePromoteWaitlist,
  useResumeEnrollment,
  useSuspendEnrollment,
} from '@/features/enrollments/hooks/use-enrollment-lifecycle'
import type { AdminEnrollment } from '@/features/enrollments/types'

type PendingConfirmation = { type: 'cancel' } | { type: 'drop' } | null
const TRANSFERABLE_STATUSES = new Set(['CONFIRMED', 'ACTIVE', 'SUSPENDED'])

function LinkedEnrollmentLine({
  label,
  enrollmentId,
}: {
  label: string
  enrollmentId: string | null
}) {
  const linked = useEnrollment(enrollmentId ?? undefined)
  if (!enrollmentId) return null
  return (
    <p className="text-body-sm">
      <span className="text-muted-foreground">{label}: </span>
      <Link to={`/admin/enrollments/${enrollmentId}`} className="hover:underline">
        {linked.data?.enrollmentCode ?? enrollmentId}
      </Link>
    </p>
  )
}

function OverviewTab({ enrollment }: { enrollment: AdminEnrollment }) {
  const studentQuery = useQuery({
    queryKey: ['students', 'detail-lite', enrollment.studentId],
    queryFn: () => getStudent(enrollment.studentId),
  })
  const courseQuery = useQuery({
    queryKey: ['courses', 'detail-lite', enrollment.courseId],
    queryFn: () => getCourse(enrollment.courseId),
  })
  const batchQuery = useQuery({
    queryKey: ['batches', 'detail-lite', enrollment.batchId],
    queryFn: () => getBatch(enrollment.batchId),
  })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-caption text-muted-foreground">Student</p>
          <p className="text-body-sm font-medium">
            {studentQuery.isLoading
              ? 'Loading…'
              : (studentQuery.data?.displayName ??
                `${studentQuery.data?.firstName ?? ''} ${studentQuery.data?.lastName ?? ''}`)}
          </p>
          <p className="text-caption text-muted-foreground">{studentQuery.data?.email}</p>
        </div>
        <div>
          <p className="text-caption text-muted-foreground">Course</p>
          <p className="text-body-sm font-medium">
            {courseQuery.isLoading ? 'Loading…' : (courseQuery.data?.title ?? 'Unknown course')}
          </p>
        </div>
        <div>
          <p className="text-caption text-muted-foreground">Batch</p>
          <Link
            to={`/admin/batches/${enrollment.batchId}`}
            className="text-body-sm font-medium hover:underline"
          >
            {batchQuery.isLoading ? 'Loading…' : (batchQuery.data?.name ?? 'Unknown batch')}
          </Link>
        </div>
        <div>
          <p className="text-caption text-muted-foreground">Source</p>
          <p className="text-body-sm">{enrollment.source.replace(/_/g, ' ')}</p>
        </div>
        <div>
          <p className="text-caption text-muted-foreground">Enrollment date</p>
          <p className="text-body-sm">
            {format(new Date(enrollment.enrollmentDate), 'MMM d, yyyy')}
          </p>
        </div>
        {enrollment.waitlistPosition !== null && (
          <div>
            <p className="text-caption text-muted-foreground">Waitlist position</p>
            <p className="text-body-sm">#{enrollment.waitlistPosition}</p>
          </div>
        )}
        {enrollment.tags.length > 0 && (
          <div>
            <p className="text-caption text-muted-foreground">Tags</p>
            <p className="text-body-sm">{enrollment.tags.join(', ')}</p>
          </div>
        )}
        {enrollment.internalNotes && (
          <div>
            <p className="text-caption text-muted-foreground">Internal notes</p>
            <p className="text-body-sm whitespace-pre-wrap">{enrollment.internalNotes}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-body-sm mb-2 font-medium">Learning access</p>
          <AccessBadge accessState={enrollment.accessState} />
          <div className="mt-2 flex flex-col gap-1">
            <p className="text-caption text-muted-foreground">
              Access starts:{' '}
              {enrollment.accessStartsAt
                ? format(new Date(enrollment.accessStartsAt), 'MMM d, yyyy h:mm a')
                : 'Not yet'}
            </p>
            <p className="text-caption text-muted-foreground">
              Access ends:{' '}
              {enrollment.accessEndsAt
                ? format(new Date(enrollment.accessEndsAt), 'MMM d, yyyy h:mm a')
                : 'Lifetime (no end date)'}
            </p>
          </div>
        </div>
        <div>
          <p className="text-body-sm mb-2 font-medium">Transfer lineage</p>
          <LinkedEnrollmentLine
            label="Transferred from"
            enrollmentId={enrollment.transferredFromEnrollmentId}
          />
          <LinkedEnrollmentLine
            label="Transferred to"
            enrollmentId={enrollment.transferredToEnrollmentId}
          />
          {!enrollment.transferredFromEnrollmentId && !enrollment.transferredToEnrollmentId && (
            <p className="text-body-sm text-muted-foreground">No transfer history</p>
          )}
          {enrollment.transferReason && (
            <p className="text-caption text-muted-foreground mt-1">
              Reason: {enrollment.transferReason}
            </p>
          )}
        </div>
        {enrollment.cancellationReason && (
          <div>
            <p className="text-body-sm mb-1 font-medium">Cancellation reason</p>
            <p className="text-body-sm text-muted-foreground">{enrollment.cancellationReason}</p>
          </div>
        )}
        {enrollment.dropReason && (
          <div>
            <p className="text-body-sm mb-1 font-medium">Drop reason</p>
            <p className="text-body-sm text-muted-foreground">{enrollment.dropReason}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function EnrollmentDetailPage() {
  const { enrollmentId = '' } = useParams<{ enrollmentId: string }>()
  const [activeTab, setActiveTab] = useState('overview')
  const [auditPage, setAuditPage] = useState(1)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null)
  const [transferOpen, setTransferOpen] = useState(false)

  const enrollmentQuery = useEnrollment(enrollmentId)
  const confirmEnrollment = useConfirmEnrollment()
  const promoteWaitlist = usePromoteWaitlist()
  const activateEnrollment = useActivateEnrollment()
  const suspendEnrollment = useSuspendEnrollment()
  const resumeEnrollment = useResumeEnrollment()
  const completeEnrollment = useCompleteEnrollment()
  const cancelEnrollment = useCancelEnrollment()
  const dropEnrollment = useDropEnrollment()

  if (enrollmentQuery.isLoading) return <PageLoader />
  if (enrollmentQuery.isError || !enrollmentQuery.data) {
    return (
      <ErrorState
        description="We couldn't load this enrollment."
        onRetry={() => void enrollmentQuery.refetch()}
      />
    )
  }

  const enrollment = enrollmentQuery.data
  const batchId = enrollment.batchId

  return (
    <PageContainer
      title={enrollment.enrollmentCode}
      description={`Enrollment · ${enrollment.status}`}
      actions={
        <Link
          to="/admin/enrollments"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back to enrolments
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <EnrollmentStatusBadge status={enrollment.status} />
          <AccessBadge accessState={enrollment.accessState} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {enrollment.status === 'PENDING' && (
            <Button
              type="button"
              onClick={() => {
                confirmEnrollment.mutate(
                  { id: enrollment.id, batchId },
                  {
                    onSuccess: () => toast.success('Enrollment confirmed'),
                    onError: (error) =>
                      toast.error('Could not confirm enrollment', getSafeErrorMessage(error)),
                  },
                )
              }}
            >
              Confirm
            </Button>
          )}
          {enrollment.status === 'WAITLISTED' && (
            <Button
              type="button"
              onClick={() => {
                promoteWaitlist.mutate(
                  { id: enrollment.id, batchId },
                  {
                    onSuccess: () => toast.success('Student promoted from waitlist'),
                    onError: (error) =>
                      toast.error('Could not promote from waitlist', getSafeErrorMessage(error)),
                  },
                )
              }}
            >
              Promote from waitlist
            </Button>
          )}
          {enrollment.status === 'CONFIRMED' && (
            <Button
              type="button"
              onClick={() => {
                activateEnrollment.mutate(
                  { id: enrollment.id, batchId },
                  {
                    onSuccess: () => toast.success('Enrollment activated'),
                    onError: (error) =>
                      toast.error('Could not activate enrollment', getSafeErrorMessage(error)),
                  },
                )
              }}
            >
              Activate
            </Button>
          )}
          {enrollment.status === 'ACTIVE' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  suspendEnrollment.mutate(
                    { id: enrollment.id, batchId },
                    {
                      onSuccess: () => toast.success('Enrollment suspended'),
                      onError: (error) =>
                        toast.error('Could not suspend enrollment', getSafeErrorMessage(error)),
                    },
                  )
                }}
              >
                Suspend
              </Button>
              <Button
                type="button"
                onClick={() => {
                  completeEnrollment.mutate(
                    { id: enrollment.id, batchId },
                    {
                      onSuccess: () => toast.success('Enrollment completed'),
                      onError: (error) =>
                        toast.error('Could not complete enrollment', getSafeErrorMessage(error)),
                    },
                  )
                }}
              >
                Complete
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                onClick={() => {
                  setPendingConfirmation({ type: 'drop' })
                }}
              >
                Drop
              </Button>
            </>
          )}
          {enrollment.status === 'SUSPENDED' && (
            <>
              <Button
                type="button"
                onClick={() => {
                  resumeEnrollment.mutate(
                    { id: enrollment.id, batchId },
                    {
                      onSuccess: () => toast.success('Enrollment resumed'),
                      onError: (error) =>
                        toast.error('Could not resume enrollment', getSafeErrorMessage(error)),
                    },
                  )
                }}
              >
                Resume
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                onClick={() => {
                  setPendingConfirmation({ type: 'drop' })
                }}
              >
                Drop
              </Button>
            </>
          )}
          {TRANSFERABLE_STATUSES.has(enrollment.status) && (
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                setTransferOpen(true)
              }}
            >
              <Repeat2 className="size-3.5" />
              Transfer
            </Button>
          )}
          {(enrollment.status === 'PENDING' ||
            enrollment.status === 'WAITLISTED' ||
            enrollment.status === 'CONFIRMED') && (
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              onClick={() => {
                setPendingConfirmation({ type: 'cancel' })
              }}
            >
              Cancel
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <OverviewTab enrollment={enrollment} />
          </TabsContent>
          <TabsContent value="audit">
            {activeTab === 'audit' && (
              <EnrollmentAuditTimeline
                enrollmentId={enrollment.id}
                page={auditPage}
                onPageChange={setAuditPage}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TransferEnrollmentDialog
        enrollment={enrollment}
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onTransferred={() => {
          setTransferOpen(false)
        }}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'cancel'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Cancel this enrollment?"
        description="The enrollment will be marked Cancelled. Any reserved seat is released immediately."
        tone="destructive"
        confirmLabel="Cancel enrollment"
        isConfirming={cancelEnrollment.isPending}
        onConfirm={() => {
          cancelEnrollment.mutate(
            { id: enrollment.id, batchId, payload: {} },
            {
              onSuccess: () => {
                toast.success('Enrollment cancelled')
                setPendingConfirmation(null)
              },
              onError: (error) => {
                toast.error('Could not cancel enrollment', getSafeErrorMessage(error))
                setPendingConfirmation(null)
              },
            },
          )
        }}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'drop'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Drop this student from the batch?"
        description="The student will be removed from the active batch and the seat will be released."
        tone="destructive"
        confirmLabel="Drop"
        isConfirming={dropEnrollment.isPending}
        onConfirm={() => {
          dropEnrollment.mutate(
            { id: enrollment.id, batchId, payload: {} },
            {
              onSuccess: () => {
                toast.success('Student dropped')
                setPendingConfirmation(null)
              },
              onError: (error) => {
                toast.error('Could not drop enrollment', getSafeErrorMessage(error))
                setPendingConfirmation(null)
              },
            },
          )
        }}
      />
    </PageContainer>
  )
}
