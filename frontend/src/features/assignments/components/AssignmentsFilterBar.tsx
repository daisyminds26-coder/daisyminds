import { SearchBox } from '@/shared/components/data-display/search-box'
import { FilterBar, type FilterDef } from '@/shared/components/data-display/filter-bar'
import { ASSIGNMENT_STATUSES, type AssignmentStatus } from '@/features/assignments/types'

interface AssignmentsFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  status: AssignmentStatus | undefined
  onStatusChange: (value: AssignmentStatus | undefined) => void
}

export function AssignmentsFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: AssignmentsFilterBarProps) {
  const filters: FilterDef[] = [
    {
      id: 'status',
      label: 'Status',
      value: status,
      onChange: (value) => {
        onStatusChange(value as AssignmentStatus | undefined)
      },
      options: ASSIGNMENT_STATUSES.map((value) => ({ value, label: value })),
    },
  ]

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SearchBox
        value={search}
        onChange={onSearchChange}
        placeholder="Search by title, assignment code…"
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
