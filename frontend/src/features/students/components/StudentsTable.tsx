import { formatDistanceToNow } from 'date-fns'
import {
  GraduationCap,
  MailCheck,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  RotateCcw,
  Trash2,
} from 'lucide-react'

import { DataTable, type DataTableColumn } from '@/shared/components/data-display/data-table'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Button } from '@/shared/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { StudentStatusBadge } from '@/features/students/components/StudentStatusBadge'
import { ProfileCompletionBadge } from '@/features/students/components/ProfileCompletionBadge'
import type { AdminStudentListItem } from '@/features/students/types'

export interface StudentsTableActions {
  onView: (student: AdminStudentListItem) => void
  onEdit: (student: AdminStudentListItem) => void
  onActivate: (student: AdminStudentListItem) => void
  onDeactivate: (student: AdminStudentListItem) => void
  onDelete: (student: AdminStudentListItem) => void
  onRestore: (student: AdminStudentListItem) => void
  onResendInvitation: (student: AdminStudentListItem) => void
}

interface StudentsTableProps extends StudentsTableActions {
  rows: readonly AdminStudentListItem[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  selectedIds: ReadonlySet<string>
  onToggleSelected: (id: string) => void
  onToggleSelectAll: () => void
}

function fullName(row: AdminStudentListItem): string {
  return row.displayName ?? `${row.firstName} ${row.lastName}`
}

function initials(row: AdminStudentListItem): string {
  return `${row.firstName.charAt(0)}${row.lastName.charAt(0)}`.toUpperCase()
}

export function StudentsTable({
  rows,
  isLoading,
  errorMessage,
  onRetry,
  selectedIds,
  onToggleSelected,
  onToggleSelectAll,
  onView,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
  onRestore,
  onResendInvitation,
}: StudentsTableProps) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id))

  const columns: DataTableColumn<AdminStudentListItem>[] = [
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
          aria-label={`Select ${fullName(row)}`}
        />
      ),
    },
    {
      id: 'student',
      header: 'Student',
      cell: (row) => (
        <button
          type="button"
          onClick={() => {
            onView(row)
          }}
          className="flex items-center gap-3 text-left"
        >
          <Avatar className="size-8">
            {row.profilePhotoUrl && <AvatarImage src={row.profilePhotoUrl} alt="" />}
            <AvatarFallback className="text-caption">{initials(row)}</AvatarFallback>
          </Avatar>
          <span>
            <span className="text-body-sm hover:text-primary-foreground/80 block font-medium hover:underline">
              {fullName(row)}
            </span>
            <span className="text-caption text-muted-foreground block">{row.email}</span>
          </span>
        </button>
      ),
    },
    {
      id: 'studentId',
      header: 'Student ID',
      cell: (row) => <span className="text-body-sm font-mono">{row.studentId}</span>,
    },
    {
      id: 'admissionDate',
      header: 'Admission Date',
      cell: (row) => (
        <span className="text-body-sm text-muted-foreground">
          {row.admissionDate ? new Date(row.admissionDate).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      id: 'profileCompletion',
      header: 'Profile Completion',
      cell: (row) => (
        <ProfileCompletionBadge
          status={row.profileCompletionStatus}
          percentage={row.profileCompletionPercentage}
        />
      ),
    },
    {
      id: 'status',
      header: 'Account Status',
      cell: (row) => <StudentStatusBadge status={row.status} />,
    },
    {
      id: 'updatedAt',
      header: 'Last Updated',
      cell: (row) => (
        <span className="text-body-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true })}
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
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${fullName(row)}`}>
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
                {row.status === 'PENDING_VERIFICATION' && (
                  <DropdownMenuItem
                    onSelect={() => {
                      onResendInvitation(row)
                    }}
                  >
                    <MailCheck />
                    Resend invitation
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
        emptyIcon={GraduationCap}
        emptyTitle="No students found"
        emptyDescription="Try adjusting your filters or search."
      />
    </div>
  )
}
