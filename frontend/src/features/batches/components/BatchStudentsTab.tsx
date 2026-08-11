import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal, Plus, Repeat2, Users } from 'lucide-react'

import { Button, buttonVariants } from '@/shared/components/ui/button'
import { SearchBox } from '@/shared/components/data-display/search-box'
import { DataTable, type DataTableColumn } from '@/shared/components/data-display/data-table'
import { TablePagination } from '@/shared/components/data-display/table-pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useBatchCapacity } from '@/features/batches/hooks/use-batch-capacity'
import { BatchWaitlistPanel } from '@/features/batches/components/BatchWaitlistPanel'
import { useEnrollmentsList } from '@/features/enrollments/hooks/use-enrollments-list'
import { useEnrollment } from '@/features/enrollments/hooks/use-enrollment'
import { EnrollmentStatusBadge } from '@/features/enrollments/components/EnrollmentStatusBadge'
import { AccessBadge } from '@/features/enrollments/components/AccessBadge'
import { TransferEnrollmentDialog } from '@/features/enrollments/components/TransferEnrollmentDialog'
import {
  useSuspendEnrollment,
  useResumeEnrollment,
  useCompleteEnrollment,
  useDropEnrollment,
} from '@/features/enrollments/hooks/use-enrollment-lifecycle'
import {
  ENROLLMENT_STATUSES,
  type AdminEnrollmentListItem,
  type EnrollmentStatus,
} from '@/features/enrollments/types'

const TRANSFERABLE_STATUSES = new Set<EnrollmentStatus>(['CONFIRMED', 'ACTIVE', 'SUSPENDED'])

/**
 * Operational roster for one batch — search/filter/paginate the batch's own
 * enrolments and act on them directly, reusing exactly the same lifecycle
 * mutations `EnrollmentDetailPage`/`EnrollmentsPage` use (no parallel
 * enrolment-transition logic). The Waitlist queue is a separate section
 * below, since it needs its own ordering/Promote-Cancel affordances.
 */
export function BatchStudentsTab({ batchId }: { batchId: string }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<EnrollmentStatus | undefined>(undefined)
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<AdminEnrollmentListItem | null>(null)

  const capacityQuery = useBatchCapacity(batchId)
  const enrollmentsQuery = useEnrollmentsList({
    batchId,
    status,
    search: search || undefined,
    page,
    limit: 10,
    sort: 'createdAt:desc',
  })
  const transferEnrollmentQuery = useEnrollment(transferTargetId ?? undefined)

  const suspendEnrollment = useSuspendEnrollment()
  const resumeEnrollment = useResumeEnrollment()
  const completeEnrollment = useCompleteEnrollment()
  const dropEnrollment = useDropEnrollment()

  const rows = enrollmentsQuery.data?.data ?? []
  const capacity = capacityQuery.data

  const columns: DataTableColumn<AdminEnrollmentListItem>[] = useMemo(
    () => [
      {
        id: 'student',
        header: 'Student',
        cell: (row) => (
          <span>
            <span className="text-body-sm block font-medium">{row.student?.name ?? 'Unknown'}</span>
            <span className="text-caption text-muted-foreground block font-mono">
              {row.student?.studentCode}
            </span>
          </span>
        ),
      },
      {
        id: 'enrollment',
        header: 'Enrollment',
        cell: (row) => (
          <span>
            <span className="text-body-sm block font-mono">{row.enrollmentCode}</span>
            <span className="text-caption text-muted-foreground block">
              {new Date(row.enrollmentDate).toLocaleDateString()}
            </span>
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <EnrollmentStatusBadge status={row.status} />,
      },
      {
        id: 'access',
        header: 'Access',
        cell: (row) => <AccessBadge accessState={row.accessState} />,
      },
      {
        id: 'actions',
        header: '',
        className: 'w-10 text-right',
        cell: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${row.student?.name ?? row.enrollmentCode}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  to={`/admin/students?search=${encodeURIComponent(row.student?.studentCode ?? '')}`}
                >
                  View Student
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/admin/enrollments/${row.id}`}>View Enrollment</Link>
              </DropdownMenuItem>
              {TRANSFERABLE_STATUSES.has(row.status) && (
                <DropdownMenuItem
                  onSelect={() => {
                    setTransferTargetId(row.id)
                  }}
                >
                  <Repeat2 />
                  Transfer
                </DropdownMenuItem>
              )}
              {row.status === 'ACTIVE' && (
                <DropdownMenuItem
                  onSelect={() => {
                    suspendEnrollment.mutate(
                      { id: row.id, batchId },
                      {
                        onSuccess: () => toast.success('Enrollment suspended'),
                        onError: (error) =>
                          toast.error('Could not suspend enrollment', getSafeErrorMessage(error)),
                      },
                    )
                  }}
                >
                  Suspend
                </DropdownMenuItem>
              )}
              {row.status === 'SUSPENDED' && (
                <DropdownMenuItem
                  onSelect={() => {
                    resumeEnrollment.mutate(
                      { id: row.id, batchId },
                      {
                        onSuccess: () => toast.success('Enrollment resumed'),
                        onError: (error) =>
                          toast.error('Could not resume enrollment', getSafeErrorMessage(error)),
                      },
                    )
                  }}
                >
                  Resume
                </DropdownMenuItem>
              )}
              {row.status === 'ACTIVE' && (
                <DropdownMenuItem
                  onSelect={() => {
                    completeEnrollment.mutate(
                      { id: row.id, batchId },
                      {
                        onSuccess: () => toast.success('Enrollment completed'),
                        onError: (error) =>
                          toast.error('Could not complete enrollment', getSafeErrorMessage(error)),
                      },
                    )
                  }}
                >
                  Complete
                </DropdownMenuItem>
              )}
              {(row.status === 'ACTIVE' || row.status === 'SUSPENDED') && (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    setDropTarget(row)
                  }}
                >
                  Drop
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [batchId, suspendEnrollment, resumeEnrollment, completeEnrollment],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border-border rounded-lg border p-3">
          <p className="text-caption text-muted-foreground">Seats occupied</p>
          <p className="text-title-sm font-semibold">
            {capacityQuery.isLoading || !capacity
              ? '—'
              : `${String(capacity.occupiedSeats)} / ${String(capacity.maxStudents)}`}
          </p>
        </div>
        <div className="border-border rounded-lg border p-3">
          <p className="text-caption text-muted-foreground">Seats available</p>
          <p className="text-title-sm font-semibold">
            {capacityQuery.isLoading || !capacity ? '—' : capacity.availableSeats}
          </p>
        </div>
        <div className="border-border rounded-lg border p-3">
          <p className="text-caption text-muted-foreground">Waitlisted</p>
          <p className="text-title-sm font-semibold">
            {capacityQuery.isLoading || !capacity ? '—' : capacity.waitlistCount}
          </p>
        </div>
        <div className="border-border flex items-center justify-center rounded-lg border p-3">
          <Link
            to={`/admin/enrollments?batchId=${batchId}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full gap-1.5')}
          >
            <Users className="size-3.5" />
            View all enrolments
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-body-sm font-medium">Roster</p>
          <Link
            to={`/admin/enrollments/new?batchId=${batchId}`}
            className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
          >
            <Plus className="size-3.5" />
            Add Student
          </Link>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchBox
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            placeholder="Search by student name, ID, or enrollment code…"
            className="sm:max-w-xs"
          />
          <Select
            value={status ?? 'ALL'}
            onValueChange={(value) => {
              setStatus(value === 'ALL' ? undefined : (value as EnrollmentStatus))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by enrollment status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {ENROLLMENT_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          isLoading={enrollmentsQuery.isLoading}
          errorMessage={
            enrollmentsQuery.isError ? getSafeErrorMessage(enrollmentsQuery.error) : undefined
          }
          onRetry={() => void enrollmentsQuery.refetch()}
          emptyIcon={Users}
          emptyTitle="No students match this filter"
        />
        {enrollmentsQuery.data && enrollmentsQuery.data.meta.totalPages > 1 && (
          <TablePagination meta={enrollmentsQuery.data.meta} onPageChange={setPage} />
        )}
      </div>

      <div>
        <p className="text-body-sm mb-3 font-medium">Waitlist</p>
        <BatchWaitlistPanel batchId={batchId} />
      </div>

      {transferTargetId && transferEnrollmentQuery.data && (
        <TransferEnrollmentDialog
          enrollment={transferEnrollmentQuery.data}
          open={true}
          onOpenChange={(open) => {
            if (!open) setTransferTargetId(null)
          }}
          onTransferred={() => {
            setTransferTargetId(null)
          }}
        />
      )}

      <ConfirmDialog
        open={dropTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDropTarget(null)
        }}
        title="Drop this student from the batch?"
        description="The student will be removed from the active batch and the seat will be released."
        tone="destructive"
        confirmLabel="Drop"
        isConfirming={dropEnrollment.isPending}
        onConfirm={() => {
          if (!dropTarget) return
          dropEnrollment.mutate(
            { id: dropTarget.id, batchId, payload: {} },
            {
              onSuccess: () => {
                toast.success('Student dropped')
                setDropTarget(null)
              },
              onError: (error) => {
                toast.error('Could not drop enrollment', getSafeErrorMessage(error))
                setDropTarget(null)
              },
            },
          )
        }}
      />
    </div>
  )
}
