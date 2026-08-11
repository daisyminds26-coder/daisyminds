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
import { TrainerStatusBadge } from '@/features/trainers/components/TrainerStatusBadge'
import { ProfileCompletionBadge } from '@/features/trainers/components/ProfileCompletionBadge'
import type { AdminTrainerListItem } from '@/features/trainers/types'

export interface TrainersTableActions {
  onView: (trainer: AdminTrainerListItem) => void
  onEdit: (trainer: AdminTrainerListItem) => void
  onActivate: (trainer: AdminTrainerListItem) => void
  onDeactivate: (trainer: AdminTrainerListItem) => void
  onDelete: (trainer: AdminTrainerListItem) => void
  onRestore: (trainer: AdminTrainerListItem) => void
  onResendInvitation: (trainer: AdminTrainerListItem) => void
}

interface TrainersTableProps extends TrainersTableActions {
  rows: readonly AdminTrainerListItem[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  selectedIds: ReadonlySet<string>
  onToggleSelected: (id: string) => void
  onToggleSelectAll: () => void
}

function fullName(row: AdminTrainerListItem): string {
  return row.displayName ?? `${row.firstName} ${row.lastName}`
}

function initials(row: AdminTrainerListItem): string {
  return `${row.firstName.charAt(0)}${row.lastName.charAt(0)}`.toUpperCase()
}

export function TrainersTable({
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
}: TrainersTableProps) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id))

  const columns: DataTableColumn<AdminTrainerListItem>[] = [
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
      id: 'trainer',
      header: 'Trainer',
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
      id: 'trainerId',
      header: 'Trainer ID',
      cell: (row) => <span className="text-body-sm font-mono">{row.trainerId}</span>,
    },
    {
      id: 'designation',
      header: 'Designation',
      cell: (row) => (
        <span className="text-body-sm text-muted-foreground">{row.designation ?? '—'}</span>
      ),
    },
    {
      id: 'department',
      header: 'Department',
      cell: (row) => (
        <span className="text-body-sm text-muted-foreground">{row.department ?? '—'}</span>
      ),
    },
    {
      id: 'expertise',
      header: 'Expertise',
      cell: (row) => (
        <span className="text-body-sm text-muted-foreground">
          {row.expertiseAreas.slice(0, 2).join(', ') || '—'}
        </span>
      ),
    },
    {
      id: 'experience',
      header: 'Experience',
      cell: (row) => (
        <span className="text-body-sm text-muted-foreground">
          {row.totalYearsExperience !== null ? `${row.totalYearsExperience.toString()} yrs` : '—'}
        </span>
      ),
    },
    {
      id: 'profileCompletion',
      header: 'Profile',
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
      cell: (row) => <TrainerStatusBadge status={row.status} />,
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
        emptyTitle="No trainers found"
        emptyDescription="Try adjusting your filters or search."
      />
    </div>
  )
}
