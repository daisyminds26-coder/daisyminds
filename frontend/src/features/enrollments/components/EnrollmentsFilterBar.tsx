import { formatEnumLabel } from '@/shared/lib/utils'
import { SearchBox } from '@/shared/components/data-display/search-box'
import { FilterBar, type FilterDef } from '@/shared/components/data-display/filter-bar'
import { Button } from '@/shared/components/ui/button'
import {
  ENROLLMENT_SOURCES,
  ENROLLMENT_STATUSES,
  type EnrollmentSource,
  type EnrollmentStatus,
  type SortDirection,
  type SortField,
} from '@/features/enrollments/types'

const SORT_OPTIONS: { value: `${SortField}:${SortDirection}`; label: string }[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'enrollmentDate:desc', label: 'Enrollment date (latest)' },
  { value: 'enrollmentDate:asc', label: 'Enrollment date (earliest)' },
  { value: 'enrollmentCode:asc', label: 'Enrollment code' },
]

interface EnrollmentsFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  status: EnrollmentStatus | undefined
  onStatusChange: (value: EnrollmentStatus | undefined) => void
  source: EnrollmentSource | undefined
  onSourceChange: (value: EnrollmentSource | undefined) => void
  includeDeleted: boolean
  onIncludeDeletedChange: (value: boolean) => void
  sort: `${SortField}:${SortDirection}`
  onSortChange: (value: `${SortField}:${SortDirection}`) => void
}

/** Highest-value filters (status/source/sort) plus search — mirrors `BatchesFilterBar`'s deliberately-trimmed shape. `studentId`/`batchId`/`courseId` filters exist on the backend but are set via deep links (batch/student detail "View enrollments" links), not this toolbar. */
export function EnrollmentsFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  source,
  onSourceChange,
  includeDeleted,
  onIncludeDeletedChange,
  sort,
  onSortChange,
}: EnrollmentsFilterBarProps) {
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
        onStatusChange(value as EnrollmentStatus | undefined)
      },
      options: ENROLLMENT_STATUSES.map((value) => ({ value, label: value })),
    },
    {
      id: 'source',
      label: 'Source',
      value: source,
      onChange: (value) => {
        onSourceChange(value as EnrollmentSource | undefined)
      },
      options: ENROLLMENT_SOURCES.map((value) => ({ value, label: formatEnumLabel(value) })),
    },
  ]

  function clearAll() {
    onStatusChange(undefined)
    onSourceChange(undefined)
    onIncludeDeletedChange(false)
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SearchBox
        value={search}
        onChange={onSearchChange}
        placeholder="Search by enrollment code, student, batch, or course…"
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
