import { useMemo, useState } from 'react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { DataGrid } from '@/shared/components/data-display/data-grid'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { LiveClassesFilterBar } from '@/features/live-classes/components/LiveClassesFilterBar'
import { LiveClassesTable } from '@/features/live-classes/components/LiveClassesTable'
import { useLiveClassesList } from '@/features/live-classes/hooks/use-live-classes-list'
import type { ListLiveClassesParams, LiveClassStatus } from '@/features/live-classes/types'

export default function LiveClassesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<LiveClassStatus | undefined>(undefined)

  const params: ListLiveClassesParams = useMemo(
    () => ({ page, limit: 20, sort: 'startDateTime:desc', status, search: search || undefined }),
    [page, status, search],
  )

  const liveClassesQuery = useLiveClassesList(params)
  const rows = liveClassesQuery.data?.data ?? []

  return (
    <PageContainer
      title="Live Classes"
      description="Every scheduled, live, and past class session across all batches. Create or generate sessions from a batch's own Live Classes tab."
    >
      <DataGrid
        toolbar={
          <LiveClassesFilterBar
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
          />
        }
        pagination={
          liveClassesQuery.data
            ? { meta: liveClassesQuery.data.meta, onPageChange: setPage }
            : undefined
        }
      >
        <LiveClassesTable
          rows={rows}
          isLoading={liveClassesQuery.isLoading}
          errorMessage={
            liveClassesQuery.isError ? getSafeErrorMessage(liveClassesQuery.error) : undefined
          }
          onRetry={() => void liveClassesQuery.refetch()}
        />
      </DataGrid>
    </PageContainer>
  )
}
