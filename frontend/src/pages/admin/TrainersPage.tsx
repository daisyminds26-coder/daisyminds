import { useMemo, useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { DataGrid } from '@/shared/components/data-display/data-grid'
import { toast } from '@/shared/lib/toast'
import { readInitialQueryParam } from '@/shared/lib/query-params'
import { cn } from '@/shared/lib/utils'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { TrainerStatCards } from '@/features/trainers/components/TrainerStatCards'
import { TrainersFilterBar } from '@/features/trainers/components/TrainersFilterBar'
import { TrainersTable } from '@/features/trainers/components/TrainersTable'
import { BulkActionBar } from '@/features/trainers/components/BulkActionBar'
import { TrainerEditDrawer } from '@/features/trainers/components/TrainerEditDrawer'
import { TrainerDetailDrawer } from '@/features/trainers/components/TrainerDetailDrawer'
import { useTrainersList } from '@/features/trainers/hooks/use-trainers-list'
import { useTrainer } from '@/features/trainers/hooks/use-trainer'
import {
  useActivateTrainer,
  useDeactivateTrainer,
  useRestoreTrainer,
  useSoftDeleteTrainer,
} from '@/features/trainers/hooks/use-trainer-lifecycle'
import { useResendInvitation } from '@/features/trainers/hooks/use-resend-invitation'
import { useBulkAction } from '@/features/trainers/hooks/use-bulk-action'
import { useExportTrainers } from '@/features/trainers/hooks/use-export-trainers'
import { USER_STATUSES, type AccountStatus } from '@/features/auth/types'
import {
  PROFILE_COMPLETION_STATUSES,
  type AdminTrainerListItem,
  type AvailabilityStatus,
  type EmploymentStatus,
  type EmploymentType,
  type ListTrainersParams,
  type SortDirection,
  type SortField,
  type TrainerBulkAction,
} from '@/features/trainers/types'

type PendingConfirmation =
  | { type: 'deactivate'; trainer: AdminTrainerListItem }
  | { type: 'delete'; trainer: AdminTrainerListItem }
  | { type: 'bulk'; action: Extract<TrainerBulkAction, 'deactivate' | 'delete'> }
  | null

/** Seeds status/profile-completion filters from an allowlisted dashboard-alert deep link (e.g. `/admin/trainers?profileCompletionStatus=INCOMPLETE`). */
function initialStatus(): AccountStatus | undefined {
  return USER_STATUSES.find((status) => status === readInitialQueryParam('status'))
}
function initialProfileCompletionStatus() {
  return PROFILE_COMPLETION_STATUSES.find(
    (status) => status === readInitialQueryParam('profileCompletionStatus'),
  )
}

export default function TrainersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AccountStatus | undefined>(initialStatus)
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus | undefined>(undefined)
  const [employmentType, setEmploymentType] = useState<EmploymentType | undefined>(undefined)
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus | undefined>(
    undefined,
  )
  const [profileCompletionStatus] = useState(initialProfileCompletionStatus)
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [sort, setSort] = useState<`${SortField}:${SortDirection}`>('createdAt:desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [editTrainerId, setEditTrainerId] = useState<string | null>(null)
  const [detailTrainerId, setDetailTrainerId] = useState<string | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null)

  const params: ListTrainersParams = useMemo(
    () => ({
      page,
      limit: 20,
      sort,
      status,
      employmentStatus,
      employmentType,
      availabilityStatus,
      profileCompletionStatus,
      search: search || undefined,
      includeDeleted,
    }),
    [
      page,
      sort,
      status,
      employmentStatus,
      employmentType,
      availabilityStatus,
      profileCompletionStatus,
      search,
      includeDeleted,
    ],
  )

  const trainersQuery = useTrainersList(params)
  const editTrainerQuery = useTrainer(editTrainerId ?? undefined)
  const detailTrainerQuery = useTrainer(detailTrainerId ?? undefined)
  const activateTrainer = useActivateTrainer()
  const deactivateTrainer = useDeactivateTrainer()
  const softDeleteTrainer = useSoftDeleteTrainer()
  const restoreTrainer = useRestoreTrainer()
  const resendInvitation = useResendInvitation()
  const bulkAction = useBulkAction()
  const exportTrainers = useExportTrainers()

  const rows = trainersQuery.data?.data ?? []

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

  function runBulk(action: TrainerBulkAction) {
    bulkAction.mutate(
      { action, trainerIds: [...selectedIds] },
      {
        onSuccess: (result) => {
          if (result.failed.length === 0) {
            toast.success(`${result.succeeded.length.toString()} trainer(s) updated`)
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
      title="Trainer Management"
      description="Create and manage trainer accounts, professional profiles, and availability."
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={exportTrainers.isPending}
            onClick={() => {
              exportTrainers.mutate({
                status,
                employmentStatus,
                employmentType,
                availabilityStatus,
                search: search || undefined,
                includeDeleted,
              })
            }}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
          <Link
            to="/admin/trainers/new"
            className={cn(buttonVariants({ size: 'default' }), 'gap-1.5')}
          >
            <Plus className="size-4" />
            Add Trainer
          </Link>
        </>
      }
    >
      <TrainerStatCards />

      <DataGrid
        toolbar={
          <TrainersFilterBar
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
            employmentStatus={employmentStatus}
            onEmploymentStatusChange={(value) => {
              setEmploymentStatus(value)
              setPage(1)
            }}
            employmentType={employmentType}
            onEmploymentTypeChange={(value) => {
              setEmploymentType(value)
              setPage(1)
            }}
            availabilityStatus={availabilityStatus}
            onAvailabilityStatusChange={(value) => {
              setAvailabilityStatus(value)
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
          trainersQuery.data ? { meta: trainersQuery.data.meta, onPageChange: setPage } : undefined
        }
      >
        <BulkActionBar
          selectedCount={selectedIds.size}
          isPending={bulkAction.isPending}
          onActivate={() => {
            runBulk('activate')
          }}
          onDeactivate={() => {
            setPendingConfirmation({ type: 'bulk', action: 'deactivate' })
          }}
          onDelete={() => {
            setPendingConfirmation({ type: 'bulk', action: 'delete' })
          }}
          onRestore={() => {
            runBulk('restore')
          }}
          onClearSelection={() => {
            setSelectedIds(new Set())
          }}
        />
        <TrainersTable
          rows={rows}
          isLoading={trainersQuery.isLoading}
          errorMessage={
            trainersQuery.isError ? getSafeErrorMessage(trainersQuery.error) : undefined
          }
          onRetry={() => void trainersQuery.refetch()}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
          onToggleSelectAll={toggleSelectAll}
          onView={(trainer) => {
            setDetailTrainerId(trainer.id)
          }}
          onEdit={(trainer) => {
            setEditTrainerId(trainer.id)
          }}
          onActivate={(trainer) => {
            activateTrainer.mutate(trainer.id, {
              onSuccess: () => toast.success('Trainer activated'),
              onError: (error) =>
                toast.error('Could not activate trainer', getSafeErrorMessage(error)),
            })
          }}
          onDeactivate={(trainer) => {
            setPendingConfirmation({ type: 'deactivate', trainer })
          }}
          onDelete={(trainer) => {
            setPendingConfirmation({ type: 'delete', trainer })
          }}
          onRestore={(trainer) => {
            restoreTrainer.mutate(trainer.id, {
              onSuccess: () => toast.success('Trainer restored'),
              onError: (error) =>
                toast.error('Could not restore trainer', getSafeErrorMessage(error)),
            })
          }}
          onResendInvitation={(trainer) => {
            resendInvitation.mutate(trainer.id, {
              onSuccess: () => toast.success('Invitation email sent'),
              onError: (error) =>
                toast.error('Could not send invitation email', getSafeErrorMessage(error)),
            })
          }}
        />
      </DataGrid>

      <TrainerEditDrawer
        open={editTrainerId !== null}
        onOpenChange={(open) => {
          if (!open) setEditTrainerId(null)
        }}
        trainer={editTrainerQuery.data}
      />

      <TrainerDetailDrawer
        open={detailTrainerId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTrainerId(null)
        }}
        trainer={detailTrainerQuery.data}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'deactivate'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Deactivate this trainer?"
        description={
          pendingConfirmation?.type === 'deactivate'
            ? `${pendingConfirmation.trainer.firstName} ${pendingConfirmation.trainer.lastName} will be signed out and unable to log in until reactivated.`
            : ''
        }
        tone="destructive"
        confirmLabel="Deactivate"
        isConfirming={deactivateTrainer.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'deactivate') return
          deactivateTrainer.mutate(pendingConfirmation.trainer.id, {
            onSuccess: () => {
              toast.success('Trainer deactivated')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not deactivate trainer', getSafeErrorMessage(error))
              setPendingConfirmation(null)
            },
          })
        }}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'delete'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Delete this trainer?"
        description={
          pendingConfirmation?.type === 'delete'
            ? `${pendingConfirmation.trainer.firstName} ${pendingConfirmation.trainer.lastName}'s account will be soft-deleted and can be restored later.`
            : ''
        }
        tone="destructive"
        confirmLabel="Delete"
        isConfirming={softDeleteTrainer.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'delete') return
          softDeleteTrainer.mutate(pendingConfirmation.trainer.id, {
            onSuccess: () => {
              toast.success('Trainer deleted')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not delete trainer', getSafeErrorMessage(error))
              setPendingConfirmation(null)
            },
          })
        }}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'bulk'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title={
          pendingConfirmation?.type === 'bulk' && pendingConfirmation.action === 'delete'
            ? 'Delete selected trainers?'
            : 'Deactivate selected trainers?'
        }
        description={`This applies to ${selectedIds.size.toString()} selected trainer(s).`}
        tone="destructive"
        confirmLabel={
          pendingConfirmation?.type === 'bulk' && pendingConfirmation.action === 'delete'
            ? 'Delete'
            : 'Deactivate'
        }
        isConfirming={bulkAction.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'bulk') return
          runBulk(pendingConfirmation.action)
        }}
      />
    </PageContainer>
  )
}
