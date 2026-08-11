import { useMemo, useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { DataGrid } from '@/shared/components/data-display/data-grid'
import { toast } from '@/shared/lib/toast'
import { readInitialQueryParam } from '@/shared/lib/query-params'
import { cn } from '@/shared/lib/utils'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { BatchStatCards } from '@/features/batches/components/BatchStatCards'
import { BatchesFilterBar } from '@/features/batches/components/BatchesFilterBar'
import { BatchesTable } from '@/features/batches/components/BatchesTable'
import { BulkActionBar } from '@/features/batches/components/BulkActionBar'
import { DuplicateBatchDialog } from '@/features/batches/components/DuplicateBatchDialog'
import { useBatchesList } from '@/features/batches/hooks/use-batches-list'
import {
  useActivateBatch,
  useArchiveBatch,
  useCancelBatch,
  useCompleteBatch,
  useRestoreBatch,
  useScheduleBatch,
  useSoftDeleteBatch,
  useUnscheduleBatch,
} from '@/features/batches/hooks/use-batch-lifecycle'
import { useBulkAction } from '@/features/batches/hooks/use-bulk-action'
import { useExportBatches } from '@/features/batches/hooks/use-export-batches'
import {
  BATCH_STATUSES,
  type AdminBatchListItem,
  type BatchBulkAction,
  type BatchDeliveryMode,
  type BatchStatus,
  type ListBatchesParams,
  type SortDirection,
  type SortField,
  type Temporal,
} from '@/features/batches/types'

type PendingConfirmation =
  | { type: 'archive'; batch: AdminBatchListItem }
  | { type: 'cancel'; batch: AdminBatchListItem }
  | { type: 'delete'; batch: AdminBatchListItem }
  | { type: 'bulk'; action: Extract<BatchBulkAction, 'archive' | 'cancel' | 'delete'> }
  | null

/** Seeds the status filter from an allowlisted deep link (e.g. `/admin/batches?status=DRAFT`). */
function initialStatus(): BatchStatus | undefined {
  return BATCH_STATUSES.find((status) => status === readInitialQueryParam('status'))
}

export default function BatchesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<BatchStatus | undefined>(initialStatus)
  const [deliveryMode, setDeliveryMode] = useState<BatchDeliveryMode | undefined>(undefined)
  const [temporal, setTemporal] = useState<Temporal | undefined>(undefined)
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [sort, setSort] = useState<`${SortField}:${SortDirection}`>('createdAt:desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [duplicateTarget, setDuplicateTarget] = useState<AdminBatchListItem | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null)

  const params: ListBatchesParams = useMemo(
    () => ({
      page,
      limit: 20,
      sort,
      status,
      deliveryMode,
      temporal,
      search: search || undefined,
      includeDeleted,
    }),
    [page, sort, status, deliveryMode, temporal, search, includeDeleted],
  )

  const batchesQuery = useBatchesList(params)
  const scheduleBatch = useScheduleBatch()
  const unscheduleBatch = useUnscheduleBatch()
  const activateBatch = useActivateBatch()
  const completeBatch = useCompleteBatch()
  const cancelBatch = useCancelBatch()
  const archiveBatch = useArchiveBatch()
  const restoreBatch = useRestoreBatch()
  const softDeleteBatch = useSoftDeleteBatch()
  const bulkAction = useBulkAction()
  const exportBatches = useExportBatches()

  const rows = batchesQuery.data?.data ?? []

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

  function runBulk(action: BatchBulkAction) {
    bulkAction.mutate(
      { action, batchIds: [...selectedIds] },
      {
        onSuccess: (result) => {
          if (result.failed.length === 0) {
            toast.success(`${result.succeeded.length.toString()} batch(es) updated`)
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
      title="Batch Management"
      description="Schedule and manage course delivery instances — trainers, timetables, and lifecycle."
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={exportBatches.isPending}
            onClick={() => {
              exportBatches.mutate({
                status,
                deliveryMode,
                temporal,
                search: search || undefined,
                includeDeleted,
              })
            }}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
          <Link
            to="/admin/batches/new"
            className={cn(buttonVariants({ size: 'default' }), 'gap-1.5')}
          >
            <Plus className="size-4" />
            Create Batch
          </Link>
        </>
      }
    >
      <BatchStatCards />

      <DataGrid
        toolbar={
          <BatchesFilterBar
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
            deliveryMode={deliveryMode}
            onDeliveryModeChange={(value) => {
              setDeliveryMode(value)
              setPage(1)
            }}
            temporal={temporal}
            onTemporalChange={(value) => {
              setTemporal(value)
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
          batchesQuery.data ? { meta: batchesQuery.data.meta, onPageChange: setPage } : undefined
        }
      >
        <BulkActionBar
          selectedCount={selectedIds.size}
          isPending={bulkAction.isPending}
          onArchive={() => {
            setPendingConfirmation({ type: 'bulk', action: 'archive' })
          }}
          onCancel={() => {
            setPendingConfirmation({ type: 'bulk', action: 'cancel' })
          }}
          onDelete={() => {
            setPendingConfirmation({ type: 'bulk', action: 'delete' })
          }}
          onClearSelection={() => {
            setSelectedIds(new Set())
          }}
        />
        <BatchesTable
          rows={rows}
          isLoading={batchesQuery.isLoading}
          errorMessage={batchesQuery.isError ? getSafeErrorMessage(batchesQuery.error) : undefined}
          onRetry={() => void batchesQuery.refetch()}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
          onToggleSelectAll={toggleSelectAll}
          onView={(batch) => {
            void navigate(`/admin/batches/${batch.id}`)
          }}
          onEdit={(batch) => {
            void navigate(`/admin/batches/${batch.id}?tab=settings`)
          }}
          onDuplicate={(batch) => {
            setDuplicateTarget(batch)
          }}
          onSchedule={(batch) => {
            scheduleBatch.mutate(batch.id, {
              onSuccess: () => toast.success('Batch scheduled'),
              onError: (error) =>
                toast.error('Batch is not ready to schedule', getSafeErrorMessage(error)),
            })
          }}
          onUnschedule={(batch) => {
            unscheduleBatch.mutate(batch.id, {
              onSuccess: () => toast.success('Batch returned to draft'),
              onError: (error) => toast.error('Could not update batch', getSafeErrorMessage(error)),
            })
          }}
          onActivate={(batch) => {
            activateBatch.mutate(batch.id, {
              onSuccess: () => toast.success('Batch activated'),
              onError: (error) =>
                toast.error('Could not activate batch', getSafeErrorMessage(error)),
            })
          }}
          onComplete={(batch) => {
            completeBatch.mutate(batch.id, {
              onSuccess: () => toast.success('Batch completed'),
              onError: (error) =>
                toast.error('Could not complete batch', getSafeErrorMessage(error)),
            })
          }}
          onCancel={(batch) => {
            setPendingConfirmation({ type: 'cancel', batch })
          }}
          onArchive={(batch) => {
            setPendingConfirmation({ type: 'archive', batch })
          }}
          onRestore={(batch) => {
            restoreBatch.mutate(batch.id, {
              onSuccess: () => toast.success('Batch restored'),
              onError: (error) =>
                toast.error('Could not restore batch', getSafeErrorMessage(error)),
            })
          }}
          onDelete={(batch) => {
            setPendingConfirmation({ type: 'delete', batch })
          }}
        />
      </DataGrid>

      {duplicateTarget && (
        <DuplicateBatchDialog
          batchId={duplicateTarget.id}
          batchName={duplicateTarget.name}
          open={true}
          onOpenChange={(open) => {
            if (!open) setDuplicateTarget(null)
          }}
          onDuplicated={(newBatchId) => {
            setDuplicateTarget(null)
            void navigate(`/admin/batches/${newBatchId}`)
          }}
        />
      )}

      <ConfirmDialog
        open={pendingConfirmation?.type === 'archive'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Archive this batch?"
        description={
          pendingConfirmation?.type === 'archive'
            ? `"${pendingConfirmation.batch.name}" will be archived. It can be restored later.`
            : ''
        }
        tone="destructive"
        confirmLabel="Archive"
        isConfirming={archiveBatch.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'archive') return
          archiveBatch.mutate(pendingConfirmation.batch.id, {
            onSuccess: () => {
              toast.success('Batch archived')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not archive batch', getSafeErrorMessage(error))
              setPendingConfirmation(null)
            },
          })
        }}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'cancel'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Cancel this batch?"
        description={
          pendingConfirmation?.type === 'cancel'
            ? `"${pendingConfirmation.batch.name}" will be marked Cancelled. This cannot be undone from Draft/Scheduled/Active.`
            : ''
        }
        tone="destructive"
        confirmLabel="Cancel batch"
        isConfirming={cancelBatch.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'cancel') return
          cancelBatch.mutate(pendingConfirmation.batch.id, {
            onSuccess: () => {
              toast.success('Batch cancelled')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not cancel batch', getSafeErrorMessage(error))
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
        title="Delete this batch?"
        description={
          pendingConfirmation?.type === 'delete'
            ? `"${pendingConfirmation.batch.name}" will be soft-deleted and can be restored later.`
            : ''
        }
        tone="destructive"
        confirmLabel="Delete"
        isConfirming={softDeleteBatch.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'delete') return
          softDeleteBatch.mutate(pendingConfirmation.batch.id, {
            onSuccess: () => {
              toast.success('Batch deleted')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not delete batch', getSafeErrorMessage(error))
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
            ? 'Delete selected batches?'
            : pendingConfirmation?.type === 'bulk' && pendingConfirmation.action === 'cancel'
              ? 'Cancel selected batches?'
              : 'Archive selected batches?'
        }
        description={`This applies to ${selectedIds.size.toString()} selected batch(es).`}
        tone="destructive"
        confirmLabel={
          pendingConfirmation?.type === 'bulk' && pendingConfirmation.action === 'delete'
            ? 'Delete'
            : pendingConfirmation?.type === 'bulk' && pendingConfirmation.action === 'cancel'
              ? 'Cancel batches'
              : 'Archive'
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
