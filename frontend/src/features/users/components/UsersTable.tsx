import { formatDistanceToNow } from 'date-fns'
import {
  KeyRound,
  MailCheck,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  RotateCcw,
  ShieldQuestion,
  Trash2,
  Users,
} from 'lucide-react'

import { DataTable, type DataTableColumn } from '@/shared/components/data-display/data-table'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { RoleBadge } from '@/features/users/components/RoleBadge'
import { UserStatusBadge } from '@/features/users/components/UserStatusBadge'
import type { AdminUser } from '@/features/users/types'

export interface UsersTableActions {
  onView: (user: AdminUser) => void
  onEdit: (user: AdminUser) => void
  onAssignRole: (user: AdminUser) => void
  onActivate: (user: AdminUser) => void
  onDeactivate: (user: AdminUser) => void
  onDelete: (user: AdminUser) => void
  onRestore: (user: AdminUser) => void
  onResetPassword: (user: AdminUser) => void
  onResendVerification: (user: AdminUser) => void
}

interface UsersTableProps extends UsersTableActions {
  rows: readonly AdminUser[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  selectedIds: ReadonlySet<string>
  onToggleSelected: (id: string) => void
  onToggleSelectAll: () => void
}

export function UsersTable({
  rows,
  isLoading,
  errorMessage,
  onRetry,
  selectedIds,
  onToggleSelected,
  onToggleSelectAll,
  onView,
  onEdit,
  onAssignRole,
  onActivate,
  onDeactivate,
  onDelete,
  onRestore,
  onResetPassword,
  onResendVerification,
}: UsersTableProps) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id))

  const columns: DataTableColumn<AdminUser>[] = [
    {
      id: 'select',
      header: '',
      className: 'w-10',
      cell: (row) => (
        <Checkbox
          checked={selectedIds.has(row.id)}
          onCheckedChange={() => {
            onToggleSelected(row.id)
          }}
          aria-label={`Select ${row.email}`}
        />
      ),
    },
    {
      id: 'email',
      header: 'Email',
      cell: (row) => (
        <button
          type="button"
          onClick={() => {
            onView(row)
          }}
          className="text-body-sm hover:text-primary-foreground/80 font-medium hover:underline"
        >
          {row.email}
        </button>
      ),
    },
    { id: 'role', header: 'Role', cell: (row) => <RoleBadge role={row.role} /> },
    { id: 'status', header: 'Status', cell: (row) => <UserStatusBadge status={row.status} /> },
    {
      id: 'lastLoginAt',
      header: 'Last Login',
      cell: (row) => (
        <span className="text-body-sm text-muted-foreground">
          {row.lastLoginAt
            ? formatDistanceToNow(new Date(row.lastLoginAt), { addSuffix: true })
            : 'Never'}
        </span>
      ),
    },
    {
      id: 'createdAt',
      header: 'Created',
      cell: (row) => (
        <span className="text-body-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-10 text-right',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.email}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.isDeleted ? (
              <DropdownMenuItem
                onSelect={() => {
                  onRestore(row)
                }}
              >
                <RotateCcw />
                Restore
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem
                  onSelect={() => {
                    onEdit(row)
                  }}
                >
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    onAssignRole(row)
                  }}
                >
                  <ShieldQuestion />
                  Assign role
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {row.status === 'ACTIVE' ||
                row.status === 'SUSPENDED' ||
                row.status === 'LOCKED' ? (
                  <DropdownMenuItem
                    onSelect={() => {
                      onDeactivate(row)
                    }}
                  >
                    <PowerOff />
                    Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onSelect={() => {
                      onActivate(row)
                    }}
                  >
                    <Power />
                    Activate
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onSelect={() => {
                    onResetPassword(row)
                  }}
                >
                  <KeyRound />
                  Send password reset
                </DropdownMenuItem>
                {row.status === 'PENDING_VERIFICATION' && (
                  <DropdownMenuItem
                    onSelect={() => {
                      onResendVerification(row)
                    }}
                  >
                    <MailCheck />
                    Resend verification
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    onDelete(row)
                  }}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-2">
      {rows.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleSelectAll}
            aria-label="Select all"
          />
          <span className="text-caption text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size.toString()} selected` : 'Select all'}
          </span>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onRetry={onRetry}
        emptyIcon={Users}
        emptyTitle="No users found"
        emptyDescription="Try adjusting your filters or search."
      />
    </div>
  )
}
