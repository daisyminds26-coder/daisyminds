import { useMemo, useState } from 'react'
import { Download, Plus, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { DataGrid } from '@/shared/components/data-display/data-grid'
import { toast } from '@/shared/lib/toast'
import { readInitialQueryParam } from '@/shared/lib/query-params'
import { cn } from '@/shared/lib/utils'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { EnrollmentStatCards } from '@/features/enrollments/components/EnrollmentStatCards'
import { EnrollmentsFilterBar } from '@/features/enrollments/components/EnrollmentsFilterBar'
import { EnrollmentsTable } from '@/features/enrollments/components/EnrollmentsTable'
import { BulkActionBar } from '@/features/enrollments/components/BulkActionBar'
import { BulkEnrollDialog } from '@/features/enrollments/components/BulkEnrollDialog'
import { TransferEnrollmentDialog } from '@/features/enrollments/components/TransferEnrollmentDialog'
import { useEnrollmentsList } from '@/features/enrollments/hooks/use-enrollments-list'
import {
  usePromoteWaitlist,
  useCancelEnrollment,
} from '@/features/enrollments/hooks/use-enrollment-lifecycle'
import { useBulkLifecycleAction } from '@/features/enrollments/hooks/use-bulk-lifecycle-action'
import { useExportEnrollments } from '@/features/enrollments/hooks/use-export-enrollments'
import { useEnrollment } from '@/features/enrollments/hooks/use-enrollment'
import {
  ENROLLMENT_STATUSES,
  type AdminEnrollmentListItem,
  type EnrollmentBulkLifecycleAction,
  type EnrollmentSource,
  type EnrollmentStatus,
  type ListEnrollmentsParams,
  type SortDirection,
  type SortField,
} from '@/features/enrollments/types'

type PendingConfirmation =
  | { type: 'cancel'; enrollment: AdminEnrollmentListItem }
  | { type: 'bulk'; action: EnrollmentBulkLifecycleAction }
  | null

/** Seeds the status filter from an allowlisted deep link (e.g. `/admin/enrollments?status=WAITLISTED`, used by the batch/student detail "View enrollments" links). */
function initialStatus(): EnrollmentStatus | undefined {
  return ENROLLMENT_STATUSES.find((status) => status === readInitialQueryParam('status'))
}
function initialBatchId(): string | undefined {
  return readInitialQueryParam('batchId')
}
function initialStudentId(): string | undefined {
  return readInitialQueryParam('studentId')
}

export default function EnrollmentsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<EnrollmentStatus | undefined>(initialStatus)
  const [source, setSource] = useState<EnrollmentSource | undefined>(undefined)
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [sort, setSort] = useState<`${SortField}:${SortDirection}`>('createdAt:desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [bulkEnrollOpen, setBulkEnrollOpen] = useState(false)
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null)

  // Deep-link scoping (e.g. from a batch/student detail page) — one-time read, not re-synced on every render.
  const [batchIdFilter] = useState<string | undefined>(initialBatchId)
  const [studentIdFilter] = useState<string | undefined>(initialStudentId)

  const params: ListEnrollmentsParams = useMemo(
    () => ({
      page,
      limit: 20,
      sort,
      status,
      source,
      batchId: batchIdFilter,
      studentId: studentIdFilter,
      search: search || undefined,
      includeDeleted,
    }),
    [page, sort, status, source, batchIdFilter, studentIdFilter, search, includeDeleted],
  )

  const enrollmentsQuery = useEnrollmentsList(params)
  const promoteWaitlist = usePromoteWaitlist()
  const cancelEnrollment = useCancelEnrollment()
  const bulkLifecycleAction = useBulkLifecycleAction()
  const exportEnrollments = useExportEnrollments()
  const transferEnrollmentQuery = useEnrollment(transferTargetId ?? undefined)

  const rows = enrollmentsQuery.data?.data ?? []

  function toggleSelected(id: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((previous) => {
      const allSelected = rows.length > 0 && rows.every((row) => previous.has(row.id))
      return allSelected ? new Set() : new Set(rows.map((row) => row.id))
    })
  }

  function runBulk(action: EnrollmentBulkLifecycleAction) {
    bulkLifecycleAction.mutate(
      { action, payload: { enrollmentIds: [...selectedIds] } },
      {
        onSuccess: (result) => {
          if (result.failed.length === 0) {
            toast.success(`${result.succeeded.length.toString()} enrollment(s) updated`)
          } else {
            toast.warning(
              `${result.succeeded.length.toString()} succeeded, ${result.failed.length.toString()} failed`,
              result.failed.map((item) => item.reason).join('; '),
            )
          }
          setSelectedIds(new Set())
          setPendingConfirmation(null)
        },
        onError: (error) => {
          toast.error('Bulk action failed', getSafeErrorMessage(error))
          setPendingConfirmation(null)
        },
      },
    )
  }

  return (
    <PageContainer
      title="Student Enrolments"
      description="Enrol students into batches, manage seat allocation, and track learning access."
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={exportEnrollments.isPending}
            onClick={() => {
              exportEnrollments.mutate({
                status,
                source,
                search: search || undefined,
                includeDeleted,
              })
            }}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setBulkEnrollOpen(true)
            }}
          >
            <Users className="size-4" />
            Bulk Enrol
          </Button>
          <Link
            to="/admin/enrollments/new"
            className={cn(buttonVariants({ size: 'default' }), 'gap-1.5')}
          >
            <Plus className="size-4" />
            Enrol Student
          </Link>
        </>
      }
    >
      <EnrollmentStatCards />

      <DataGrid
        toolbar={
          <EnrollmentsFilterBar
            search={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            status={status}
            onStatusChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
            source={source}
            onSourceChange={(value) => {
              setSource(value)
              setPage(1)
            }}
            includeDeleted={includeDeleted}
            onIncludeDeletedChange={(value) => {
              setIncludeDeleted(value)
              setPage(1)
            }}
            sort={sort}
            onSortChange={setSort}
          />
        }
        pagination={
          enrollmentsQuery.data
            ? { meta: enrollmentsQuery.data.meta, onPageChange: setPage }
            : undefined
        }
      >
        <BulkActionBar
          selectedCount={selectedIds.size}
          isPending={bulkLifecycleAction.isPending}
          onSuspend={() => {
            setPendingConfirmation({ type: 'bulk', action: 'suspend' })
          }}
          onResume={() => {
            runBulk('resume')
          }}
          onCancel={() => {
            setPendingConfirmation({ type: 'bulk', action: 'cancel' })
          }}
          onClearSelection={() => {
            setSelectedIds(new Set())
          }}
        />
        <EnrollmentsTable
          rows={rows}
          isLoading={enrollmentsQuery.isLoading}
          errorMessage={
            enrollmentsQuery.isError ? getSafeErrorMessage(enrollmentsQuery.error) : undefined
          }
          onRetry={() => void enrollmentsQuery.refetch()}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
          onToggleSelectAll={toggleSelectAll}
          onView={(enrollment) => {
            void navigate(`/admin/enrollments/${enrollment.id}`)
          }}
          onPromote={(enrollment) => {
            promoteWaitlist.mutate(
              { id: enrollment.id, batchId: enrollment.batch?.id ?? '' },
              {
                onSuccess: () => toast.success('Student promoted from waitlist'),
                onError: (error) =>
                  toast.error('Could not promote from waitlist', getSafeErrorMessage(error)),
              },
            )
          }}
          onTransfer={(enrollment) => {
            setTransferTargetId(enrollment.id)
          }}
          onCancel={(enrollment) => {
            setPendingConfirmation({ type: 'cancel', enrollment })
          }}
        />
      </DataGrid>

      <BulkEnrollDialog open={bulkEnrollOpen} onOpenChange={setBulkEnrollOpen} />

      {transferTargetId && transferEnrollmentQuery.data && (
        <TransferEnrollmentDialog
          enrollment={transferEnrollmentQuery.data}
          open={true}
          onOpenChange={(open) => {
            if (!open) setTransferTargetId(null)
          }}
          onTransferred={(newEnrollmentId) => {
            setTransferTargetId(null)
            void navigate(`/admin/enrollments/${newEnrollmentId}`)
          }}
        />
      )}

      <ConfirmDialog
        open={pendingConfirmation?.type === 'cancel'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Cancel this enrollment?"
        description={
          pendingConfirmation?.type === 'cancel'
            ? `"${pendingConfirmation.enrollment.enrollmentCode}" will be marked Cancelled. Any reserved seat is released immediately.`
            : ''
        }
        tone="destructive"
        confirmLabel="Cancel enrollment"
        isConfirming={cancelEnrollment.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'cancel') return
          cancelEnrollment.mutate(
            {
              id: pendingConfirmation.enrollment.id,
              batchId: pendingConfirmation.enrollment.batch?.id ?? '',
              payload: {},
            },
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
        open={pendingConfirmation?.type === 'bulk'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title={
          pendingConfirmation?.type === 'bulk' && pendingConfirmation.action === 'suspend'
            ? 'Suspend selected enrollments?'
            : 'Cancel selected enrollments?'
        }
        description={
          pendingConfirmation?.type === 'bulk' && pendingConfirmation.action === 'suspend'
            ? `Learning access will be temporarily revoked for ${selectedIds.size.toString()} selected enrollment(s). Their seats remain reserved.`
            : `This applies to ${selectedIds.size.toString()} selected enrollment(s).`
        }
        tone="destructive"
        confirmLabel={
          pendingConfirmation?.type === 'bulk' && pendingConfirmation.action === 'suspend'
            ? 'Suspend'
            : 'Cancel enrollments'
        }
        isConfirming={bulkLifecycleAction.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'bulk') return
          runBulk(pendingConfirmation.action)
        }}
      />
    </PageContainer>
  )
}
