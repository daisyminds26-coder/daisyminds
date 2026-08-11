import { USER_STATUSES } from '@/features/auth/types'
import { SearchBox } from '@/shared/components/data-display/search-box'
import { FilterBar, type FilterDef } from '@/shared/components/data-display/filter-bar'
import { Button } from '@/shared/components/ui/button'
import {
  GENDERS,
  PROFILE_COMPLETION_STATUSES,
  STUDENT_SOURCES,
  type Gender,
  type ProfileCompletionStatus,
  type SortDirection,
  type SortField,
  type StudentSource,
} from '@/features/students/types'
import type { AccountStatus } from '@/features/auth/types'

const SORT_OPTIONS: { value: `${SortField}:${SortDirection}`; label: string }[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'firstName:asc', label: 'First name (A–Z)' },
  { value: 'admissionDate:desc', label: 'Admission date (recent)' },
  { value: 'studentId:asc', label: 'Student ID' },
]

interface StudentsFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  status: AccountStatus | undefined
  onStatusChange: (value: AccountStatus | undefined) => void
  gender: Gender | undefined
  onGenderChange: (value: Gender | undefined) => void
  source: StudentSource | undefined
  onSourceChange: (value: StudentSource | undefined) => void
  profileCompletionStatus: ProfileCompletionStatus | undefined
  onProfileCompletionStatusChange: (value: ProfileCompletionStatus | undefined) => void
  includeDeleted: boolean
  onIncludeDeletedChange: (value: boolean) => void
  sort: `${SortField}:${SortDirection}`
  onSortChange: (value: `${SortField}:${SortDirection}`) => void
}

export function StudentsFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  gender,
  onGenderChange,
  source,
  onSourceChange,
  profileCompletionStatus,
  onProfileCompletionStatusChange,
  includeDeleted,
  onIncludeDeletedChange,
  sort,
  onSortChange,
}: StudentsFilterBarProps) {
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
        onStatusChange(value as AccountStatus | undefined)
      },
      options: USER_STATUSES.map((value) => ({ value, label: value.replace(/_/g, ' ') })),
    },
    {
      id: 'gender',
      label: 'Gender',
      value: gender,
      onChange: (value) => {
        onGenderChange(value as Gender | undefined)
      },
      options: GENDERS.map((value) => ({ value, label: value.replace(/_/g, ' ') })),
    },
    {
      id: 'source',
      label: 'Source',
      value: source,
      onChange: (value) => {
        onSourceChange(value as StudentSource | undefined)
      },
      options: STUDENT_SOURCES.map((value) => ({ value, label: value.replace(/_/g, ' ') })),
    },
    {
      id: 'profileCompletionStatus',
      label: 'Profile',
      value: profileCompletionStatus,
      onChange: (value) => {
        onProfileCompletionStatusChange(value as ProfileCompletionStatus | undefined)
      },
      options: PROFILE_COMPLETION_STATUSES.map((value) => ({
        value,
        label: value.charAt(0) + value.slice(1).toLowerCase(),
      })),
    },
  ]

  function clearAll() {
    onStatusChange(undefined)
    onGenderChange(undefined)
    onSourceChange(undefined)
    onProfileCompletionStatusChange(undefined)
    onIncludeDeletedChange(false)
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SearchBox
        value={search}
        onChange={onSearchChange}
        placeholder="Search by name, student ID, email…"
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
