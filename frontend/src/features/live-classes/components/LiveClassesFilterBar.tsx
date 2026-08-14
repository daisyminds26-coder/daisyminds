import { SearchBox } from '@/shared/components/data-display/search-box'
import { FilterBar, type FilterDef } from '@/shared/components/data-display/filter-bar'
import { LIVE_CLASS_STATUSES, type LiveClassStatus } from '@/features/live-classes/types'

interface LiveClassesFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  status: LiveClassStatus | undefined
  onStatusChange: (value: LiveClassStatus | undefined) => void
}

/** Batch/course/trainer/date-range filters are reached by navigating from that batch/course context (e.g. the Batch Detail "Live Classes" tab already scopes by `batchId`) rather than duplicated here — this toolbar covers the two filters that matter for a flat, cross-batch admin list: free-text search and lifecycle status. */
export function LiveClassesFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: LiveClassesFilterBarProps) {
  const filters: FilterDef[] = [
    {
      id: 'status',
      label: 'Status',
      value: status,
      onChange: (value) => {
        onStatusChange(value as LiveClassStatus | undefined)
      },
      options: LIVE_CLASS_STATUSES.map((value) => ({ value, label: value.replace(/_/g, ' ') })),
    },
  ]

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SearchBox
        value={search}
        onChange={onSearchChange}
        placeholder="Search by session title, session code…"
        className="sm:max-w-md sm:flex-1"
      />
      <FilterBar
        filters={filters}
        onClearAll={() => {
          onStatusChange(undefined)
        }}
      />
    </div>
  )
}
