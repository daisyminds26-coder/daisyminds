import { formatEnumLabel } from '@/shared/lib/utils'
import { USER_STATUSES } from '@/features/auth/types'
import { SearchBox } from '@/shared/components/data-display/search-box'
import { FilterBar, type FilterDef } from '@/shared/components/data-display/filter-bar'
import { Button } from '@/shared/components/ui/button'
import {
  AVAILABILITY_STATUSES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  type AvailabilityStatus,
  type EmploymentStatus,
  type EmploymentType,
  type SortDirection,
  type SortField,
} from '@/features/trainers/types'
import type { AccountStatus } from '@/features/auth/types'

const SORT_OPTIONS: { value: `${SortField}:${SortDirection}`; label: string }[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'firstName:asc', label: 'First name (A–Z)' },
  { value: 'totalYearsExperience:desc', label: 'Experience (most)' },
  { value: 'trainerId:asc', label: 'Trainer ID' },
]

interface TrainersFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  status: AccountStatus | undefined
  onStatusChange: (value: AccountStatus | undefined) => void
  employmentStatus: EmploymentStatus | undefined
  onEmploymentStatusChange: (value: EmploymentStatus | undefined) => void
  employmentType: EmploymentType | undefined
  onEmploymentTypeChange: (value: EmploymentType | undefined) => void
  availabilityStatus: AvailabilityStatus | undefined
  onAvailabilityStatusChange: (value: AvailabilityStatus | undefined) => void
  includeDeleted: boolean
  onIncludeDeletedChange: (value: boolean) => void
  sort: `${SortField}:${SortDirection}`
  onSortChange: (value: `${SortField}:${SortDirection}`) => void
}

export function TrainersFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  employmentStatus,
  onEmploymentStatusChange,
  employmentType,
  onEmploymentTypeChange,
  availabilityStatus,
  onAvailabilityStatusChange,
  includeDeleted,
  onIncludeDeletedChange,
  sort,
  onSortChange,
}: TrainersFilterBarProps) {
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
      label: 'Account status',
      value: status,
      onChange: (value) => {
        onStatusChange(value as AccountStatus | undefined)
      },
      options: USER_STATUSES.map((value) => ({ value, label: formatEnumLabel(value) })),
    },
    {
      id: 'employmentStatus',
      label: 'Employment',
      value: employmentStatus,
      onChange: (value) => {
        onEmploymentStatusChange(value as EmploymentStatus | undefined)
      },
      options: EMPLOYMENT_STATUSES.map((value) => ({ value, label: formatEnumLabel(value) })),
    },
    {
      id: 'employmentType',
      label: 'Type',
      value: employmentType,
      onChange: (value) => {
        onEmploymentTypeChange(value as EmploymentType | undefined)
      },
      options: EMPLOYMENT_TYPES.map((value) => ({ value, label: formatEnumLabel(value) })),
    },
    {
      id: 'availabilityStatus',
      label: 'Availability',
      value: availabilityStatus,
      onChange: (value) => {
        onAvailabilityStatusChange(value as AvailabilityStatus | undefined)
      },
      options: AVAILABILITY_STATUSES.map((value) => ({ value, label: formatEnumLabel(value) })),
    },
  ]

  function clearAll() {
    onStatusChange(undefined)
    onEmploymentStatusChange(undefined)
    onEmploymentTypeChange(undefined)
    onAvailabilityStatusChange(undefined)
    onIncludeDeletedChange(false)
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SearchBox
        value={search}
        onChange={onSearchChange}
        placeholder="Search by name, trainer ID, email, expertise…"
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
