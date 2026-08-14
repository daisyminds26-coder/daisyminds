import { useMemo, useState } from 'react'
import { CalendarPlus, Plus } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { LiveClassesTable } from '@/features/live-classes/components/LiveClassesTable'
import { CreateLiveClassDialog } from '@/features/live-classes/components/CreateLiveClassDialog'
import { GenerateLiveClassesDialog } from '@/features/live-classes/components/GenerateLiveClassesDialog'
import { useLiveClassesList } from '@/features/live-classes/hooks/use-live-classes-list'
import type { AdminBatch } from '@/features/batches/types'

interface BatchLiveClassesTabProps {
  batch: AdminBatch
}

/** The real "Live Classes" tab (Phase 12) — replaces the former placeholder in `FutureModuleCards`. Batch-scoped create + generate-from-timetable live here, since a live class is always created in the context of one already-known batch (see `CreateLiveClassDialog`'s own comment). */
export function BatchLiveClassesTab({ batch }: BatchLiveClassesTabProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)

  const params = useMemo(
    () => ({ batchId: batch.id, limit: 100, sort: 'startDateTime:desc' as const }),
    [batch.id],
  )
  const liveClassesQuery = useLiveClassesList(params)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setGenerateOpen(true)
          }}
        >
          <CalendarPlus className="size-4" />
          Generate from timetable
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setCreateOpen(true)
          }}
        >
          <Plus className="size-4" />
          Create session
        </Button>
      </div>

      <LiveClassesTable
        rows={liveClassesQuery.data?.data ?? []}
        isLoading={liveClassesQuery.isLoading}
        errorMessage={
          liveClassesQuery.isError ? getSafeErrorMessage(liveClassesQuery.error) : undefined
        }
        onRetry={() => void liveClassesQuery.refetch()}
        hideBatchColumn
      />

      <CreateLiveClassDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        batchId={batch.id}
        batchTimezone={batch.timezone}
        batchDeliveryMode={batch.deliveryMode}
        primaryTrainerId={batch.primaryTrainerId}
        assistantTrainerIds={batch.assistantTrainerIds}
        onCreated={() => {
          setCreateOpen(false)
          void liveClassesQuery.refetch()
        }}
      />

      <GenerateLiveClassesDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        batchId={batch.id}
        onGenerated={() => {
          setGenerateOpen(false)
          void liveClassesQuery.refetch()
        }}
      />
    </div>
  )
}
