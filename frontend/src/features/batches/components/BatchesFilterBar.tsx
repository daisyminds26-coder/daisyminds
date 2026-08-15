import { formatEnumLabel } from '@/shared/lib/utils'
import { SearchBox } from '@/shared/components/data-display/search-box'
import { FilterBar, type FilterDef } from '@/shared/components/data-display/filter-bar'
import { Button } from '@/shared/components/ui/button'
import {
  BATCH_DELIVERY_MODES,
  BATCH_STATUSES,
  type BatchDeliveryMode,
  type BatchStatus,
  type SortDirection,
  type SortField,
  type Temporal,
} from '@/features/batches/types'

const SORT_OPTIONS: { value: `${SortField}:${SortDirection}`; label: string }[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'startDate:asc', label: 'Start date (earliest)' },
  { value: 'startDate:desc', label: 'Start date (latest)' },
  { value: 'name:asc', label: 'Name (A–Z)' },
  { value: 'batchCode:asc', label: 'Batch code' },
]

const TEMPORAL_OPTIONS: { value: Temporal; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'current', label: 'Current' },
  { value: 'past', label: 'Past' },
]

interface BatchesFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  status: BatchStatus | undefined
  onStatusChange: (value: BatchStatus | undefined) => void
  deliveryMode: BatchDeliveryMode | undefined
  onDeliveryModeChange: (value: BatchDeliveryMode | undefined) => void
  temporal: Temporal | undefined
  onTemporalChange: (value: Temporal | undefined) => void
  includeDeleted: boolean
  onIncludeDeletedChange: (value: boolean) => void
  sort: `${SortField}:${SortDirection}`
  onSortChange: (value: `${SortField}:${SortDirection}`) => void
}

/**
 * Highest-value filters only (status/deliveryMode/temporal/sort) plus search
 * and an include-deleted toggle — mirrors `CoursesFilterBar`'s shape. A
 * `courseId` filter is deliberately omitted: the list DTO only carries a raw
 * `courseId`, so filtering by it would need a full course-search combobox
 * just for a toolbar filter, which isn't worth the added surface for this
 * phase (a course's own batches would more naturally be found via
 * `/admin/courses` in a later phase, not by filtering this list).
 */
export function BatchesFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  deliveryMode,
  onDeliveryModeChange,
  temporal,
  onTemporalChange,
  includeDeleted,
  onIncludeDeletedChange,
  sort,
  onSortChange,
}: BatchesFilterBarProps) {
  const filters: FilterDef[] = [
    {
      id: 'sort',
      label: 'Sort',
      value: sort,
      onChange: (value) => {
        if (value) onSortChange(value as `${SortField}:${SortDirection}`)
      },
      options: SORT_OPTIONS,
    },
    {
      id: 'status',
      label: 'Status',
      value: status,
      onChange: (value) => {
        onStatusChange(value as BatchStatus | undefined)
      },
      options: BATCH_STATUSES.map((value) => ({ value, label: formatEnumLabel(value) })),
    },
    {
      id: 'deliveryMode',
      label: 'Delivery',
      value: deliveryMode,
      onChange: (value) => {
        onDeliveryModeChange(value as BatchDeliveryMode | undefined)
      },
      options: BATCH_DELIVERY_MODES.map((value) => ({ value, label: formatEnumLabel(value) })),
    },
    {
      id: 'temporal',
      label: 'Timing',
      value: temporal,
      onChange: (value) => {
        onTemporalChange(value as Temporal | undefined)
      },
      options: TEMPORAL_OPTIONS,
    },
  ]

  function clearAll() {
    onStatusChange(undefined)
    onDeliveryModeChange(undefined)
    onTemporalChange(undefined)
    onIncludeDeletedChange(false)
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SearchBox
        value={search}
        onChange={onSearchChange}
        placeholder="Search by batch name, batch code…"
        className="sm:max-w-md sm:flex-1"
      />
      <FilterBar filters={filters} onClearAll={clearAll}>
        <Button
          type="button"
          variant={includeDeleted ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => {
            onIncludeDeletedChange(!includeDeleted)
          }}
        >
          {includeDeleted ? 'Showing deleted' : 'Show deleted'}
        </Button>
      </FilterBar>
    </div>
  )
}
