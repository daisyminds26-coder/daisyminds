import { USER_STATUSES } from '@/features/auth/types'
import { SearchBox } from '@/shared/components/data-display/search-box'
import { FilterBar, type FilterDef } from '@/shared/components/data-display/filter-bar'
import { Button } from '@/shared/components/ui/button'
import { useRoles } from '@/features/users/hooks/use-roles'
import type { AccountStatus } from '@/features/auth/types'
import type { SortDirection, SortField } from '@/features/users/types'

const SORT_OPTIONS: { value: `${SortField}:${SortDirection}`; label: string }[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'email:asc', label: 'Email (A–Z)' },
  { value: 'email:desc', label: 'Email (Z–A)' },
  { value: 'lastLoginAt:desc', label: 'Last login (recent)' },
]

interface UsersFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  status: AccountStatus | undefined
  onStatusChange: (value: AccountStatus | undefined) => void
  roleId: string | undefined
  onRoleIdChange: (value: string | undefined) => void
  sort: `${SortField}:${SortDirection}`
  onSortChange: (value: `${SortField}:${SortDirection}`) => void
}

export function UsersFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  roleId,
  onRoleIdChange,
  sort,
  onSortChange,
}: UsersFilterBarProps) {
  const rolesQuery = useRoles()

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
      id: 'role',
      label: 'Role',
      value: roleId,
      onChange: onRoleIdChange,
      options: (rolesQuery.data ?? []).map((role) => ({ value: role.id, label: role.name })),
    },
  ]

  const hasActiveFilters = status !== undefined || roleId !== undefined

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SearchBox
        value={search}
        onChange={onSearchChange}
        placeholder="Search by email…"
        className="sm:max-w-md sm:flex-1"
      />
      <div className="flex flex-wrap items-center gap-2">
        <FilterBar filters={filters} />
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onStatusChange(undefined)
              onRoleIdChange(undefined)
            }}
          >
            Clear all
          </Button>
        )}
      </div>
    </div>
  )
}
