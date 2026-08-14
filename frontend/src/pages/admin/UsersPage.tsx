import { useMemo, useState } from 'react'
import { Download, Plus } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { DataGrid } from '@/shared/components/data-display/data-grid'
import { toast } from '@/shared/lib/toast'
import { readInitialQueryParam } from '@/shared/lib/query-params'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { UserStatCards } from '@/features/users/components/UserStatCards'
import { UsersFilterBar } from '@/features/users/components/UsersFilterBar'
import { UsersTable } from '@/features/users/components/UsersTable'
import { BulkActionBar } from '@/features/users/components/BulkActionBar'
import { UserFormDrawer } from '@/features/users/components/UserFormDrawer'
import { AssignRoleDialog } from '@/features/users/components/AssignRoleDialog'
import { UserDetailDrawer } from '@/features/users/components/UserDetailDrawer'
import { useUsersList } from '@/features/users/hooks/use-users-list'
import {
  useActivateUser,
  useDeactivateUser,
  useRestoreUser,
  useSoftDeleteUser,
} from '@/features/users/hooks/use-user-lifecycle'
import {
  useTriggerPasswordReset,
  useResendVerification,
} from '@/features/users/hooks/use-user-credentials'
import { useBulkAction } from '@/features/users/hooks/use-bulk-action'
import { useExportUsers } from '@/features/users/hooks/use-export-users'
import { USER_STATUSES, type AccountStatus } from '@/features/auth/types'
import type {
  AdminUser,
  BulkAction,
  ListUsersParams,
  SortDirection,
  SortField,
} from '@/features/users/types'

type PendingConfirmation =
  | { type: 'deactivate'; user: AdminUser }
  | { type: 'delete'; user: AdminUser }
  | { type: 'bulk'; action: Extract<BulkAction, 'deactivate' | 'delete'> }
  | null

/** Seeds the status filter from an allowlisted dashboard-alert deep link (e.g. `/admin/users?status=LOCKED`) — falls back to "no filter" for anything unrecognized. */
function initialStatus(): AccountStatus | undefined {
  const raw = readInitialQueryParam('status')
  return USER_STATUSES.find((status) => status === raw)
}

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AccountStatus | undefined>(initialStatus)
  const [roleId, setRoleId] = useState<string | undefined>(undefined)
  const [sort, setSort] = useState<`${SortField}:${SortDirection}`>('createdAt:desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [formUser, setFormUser] = useState<AdminUser | 'create' | null>(null)
  const [roleDialogUser, setRoleDialogUser] = useState<AdminUser | null>(null)
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null)

  const params: ListUsersParams = useMemo(
    () => ({ page, limit: 20, sort, status, roleId, search: search || undefined }),
    [page, sort, status, roleId, search],
  )

  const usersQuery = useUsersList(params)
  const activateUser = useActivateUser()
  const deactivateUser = useDeactivateUser()
  const softDeleteUser = useSoftDeleteUser()
  const restoreUser = useRestoreUser()
  const resetPassword = useTriggerPasswordReset()
  const resendVerification = useResendVerification()
  const bulkAction = useBulkAction()
  const exportUsers = useExportUsers()

  const rows = usersQuery.data?.data ?? []

  function toggleSelected(id: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((previous) => {
      const allSelected = rows.length > 0 && rows.every((row) => previous.has(row.id))
      return allSelected ? new Set() : new Set(rows.map((row) => row.id))
    })
  }

  function runBulk(action: Extract<BulkAction, 'activate' | 'deactivate' | 'delete'>) {
    bulkAction.mutate(
      { action, userIds: [...selectedIds] },
      {
        onSuccess: (result) => {
          if (result.failed.length === 0) {
            toast.success(`${result.succeeded.length.toString()} user(s) updated`)
          } else {
            toast.warning(
              `${result.succeeded.length.toString()} succeeded, ${result.failed.length.toString()} failed`,
              result.failed.map((item) => item.reason).join('; '),
            )
          }
          setSelectedIds(new Set())
          setPendingConfirmation(null)
        },
        onError: (error) => {
          toast.error('Bulk action failed', getSafeErrorMessage(error))
          setPendingConfirmation(null)
        },
      },
    )
  }

  return (
    <PageContainer
      title="User Management"
      description="Create, manage, and audit system users."
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={exportUsers.isPending}
            onClick={() => {
              exportUsers.mutate({ status, roleId, search: search || undefined })
            }}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
          <Button
            type="button"
            className="gap-1.5"
            onClick={() => {
              setFormUser('create')
            }}
          >
            <Plus className="size-4" />
            Create user
          </Button>
        </>
      }
    >
      <UserStatCards />

      <DataGrid
        toolbar={
          <UsersFilterBar
            search={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            status={status}
            onStatusChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
            roleId={roleId}
            onRoleIdChange={(value) => {
              setRoleId(value)
              setPage(1)
            }}
            sort={sort}
            onSortChange={setSort}
          />
        }
        pagination={
          usersQuery.data ? { meta: usersQuery.data.meta, onPageChange: setPage } : undefined
        }
      >
        <BulkActionBar
          selectedCount={selectedIds.size}
          isPending={bulkAction.isPending}
          onActivate={() => {
            runBulk('activate')
          }}
          onDeactivate={() => {
            setPendingConfirmation({ type: 'bulk', action: 'deactivate' })
          }}
          onDelete={() => {
            setPendingConfirmation({ type: 'bulk', action: 'delete' })
          }}
          onClearSelection={() => {
            setSelectedIds(new Set())
          }}
        />
        <UsersTable
          rows={rows}
          isLoading={usersQuery.isLoading}
          errorMessage={usersQuery.isError ? getSafeErrorMessage(usersQuery.error) : undefined}
          onRetry={() => void usersQuery.refetch()}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
          onToggleSelectAll={toggleSelectAll}
          onView={setDetailUser}
          onEdit={setFormUser}
          onAssignRole={setRoleDialogUser}
          onActivate={(user) => {
            activateUser.mutate(user.id, {
              onSuccess: () => toast.success('User activated'),
              onError: (error) =>
                toast.error('Could not activate user', getSafeErrorMessage(error)),
            })
          }}
          onDeactivate={(user) => {
            setPendingConfirmation({ type: 'deactivate', user })
          }}
          onDelete={(user) => {
            setPendingConfirmation({ type: 'delete', user })
          }}
          onRestore={(user) => {
            restoreUser.mutate(user.id, {
              onSuccess: () => toast.success('User restored'),
              onError: (error) => toast.error('Could not restore user', getSafeErrorMessage(error)),
            })
          }}
          onResetPassword={(user) => {
            resetPassword.mutate(user.id, {
              onSuccess: () => toast.success('Password reset email sent'),
              onError: (error) =>
                toast.error('Could not send reset email', getSafeErrorMessage(error)),
            })
          }}
          onResendVerification={(user) => {
            resendVerification.mutate(user.id, {
              onSuccess: () => toast.success('Verification email sent'),
              onError: (error) =>
                toast.error('Could not send verification email', getSafeErrorMessage(error)),
            })
          }}
        />
      </DataGrid>

      <UserFormDrawer
        open={formUser !== null}
        onOpenChange={(open) => {
          if (!open) setFormUser(null)
        }}
        user={formUser && formUser !== 'create' ? formUser : undefined}
      />

      <AssignRoleDialog
        open={roleDialogUser !== null}
        onOpenChange={(open) => {
          if (!open) setRoleDialogUser(null)
        }}
        user={roleDialogUser ?? undefined}
      />

      <UserDetailDrawer
        open={detailUser !== null}
        onOpenChange={(open) => {
          if (!open) setDetailUser(null)
        }}
        user={detailUser ?? undefined}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'deactivate'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Deactivate this user?"
        description={
          pendingConfirmation?.type === 'deactivate'
            ? `${pendingConfirmation.user.email} will be signed out and unable to log in until reactivated.`
            : ''
        }
        tone="destructive"
        confirmLabel="Deactivate"
        isConfirming={deactivateUser.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'deactivate') return
          deactivateUser.mutate(pendingConfirmation.user.id, {
            onSuccess: () => {
              toast.success('User deactivated')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not deactivate user', getSafeErrorMessage(error))
              setPendingConfirmation(null)
            },
          })
        }}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'delete'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Delete this user?"
        description={
          pendingConfirmation?.type === 'delete'
            ? `${pendingConfirmation.user.email} will be soft-deleted and can be restored later.`
            : ''
        }
        tone="destructive"
        confirmLabel="Delete"
        isConfirming={softDeleteUser.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'delete') return
          softDeleteUser.mutate(pendingConfirmation.user.id, {
            onSuccess: () => {
              toast.success('User deleted')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not delete user', getSafeErrorMessage(error))
              setPendingConfirmation(null)
            },
          })
        }}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'bulk'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title={
          pendingConfirmation?.type === 'bulk' && pendingConfirmation.action === 'delete'
            ? 'Delete selected users?'
            : 'Deactivate selected users?'
        }
        description={`This applies to ${selectedIds.size.toString()} selected user(s). Protected accounts (e.g. yourself, the last SUPER_ADMIN) are skipped and reported.`}
        tone="destructive"
        confirmLabel={
          pendingConfirmation?.type === 'bulk' && pendingConfirmation.action === 'delete'
            ? 'Delete'
            : 'Deactivate'
        }
        isConfirming={bulkAction.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'bulk') return
          runBulk(pendingConfirmation.action)
        }}
      />
    </PageContainer>
  )
}
