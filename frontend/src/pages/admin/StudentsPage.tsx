import { useMemo, useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { DataGrid } from '@/shared/components/data-display/data-grid'
import { toast } from '@/shared/lib/toast'
import { readInitialQueryParam } from '@/shared/lib/query-params'
import { cn } from '@/shared/lib/utils'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { StudentStatCards } from '@/features/students/components/StudentStatCards'
import { StudentsFilterBar } from '@/features/students/components/StudentsFilterBar'
import { StudentsTable } from '@/features/students/components/StudentsTable'
import { BulkActionBar } from '@/features/students/components/BulkActionBar'
import { StudentEditDrawer } from '@/features/students/components/StudentEditDrawer'
import { StudentDetailDrawer } from '@/features/students/components/StudentDetailDrawer'
import { useStudentsList } from '@/features/students/hooks/use-students-list'
import { useStudent } from '@/features/students/hooks/use-student'
import {
  useActivateStudent,
  useDeactivateStudent,
  useRestoreStudent,
  useSoftDeleteStudent,
} from '@/features/students/hooks/use-student-lifecycle'
import { useResendInvitation } from '@/features/students/hooks/use-resend-invitation'
import { useBulkAction } from '@/features/students/hooks/use-bulk-action'
import { useExportStudents } from '@/features/students/hooks/use-export-students'
import { USER_STATUSES, type AccountStatus } from '@/features/auth/types'
import {
  PROFILE_COMPLETION_STATUSES,
  type AdminStudentListItem,
  type Gender,
  type ListStudentsParams,
  type ProfileCompletionStatus,
  type SortDirection,
  type SortField,
  type StudentBulkAction,
  type StudentSource,
} from '@/features/students/types'

type PendingConfirmation =
  | { type: 'deactivate'; student: AdminStudentListItem }
  | { type: 'delete'; student: AdminStudentListItem }
  | { type: 'bulk'; action: Extract<StudentBulkAction, 'deactivate' | 'delete'> }
  | null

/** Seeds status/profile-completion filters from an allowlisted dashboard-alert deep link (e.g. `/admin/students?profileCompletionStatus=INCOMPLETE`). */
function initialStatus(): AccountStatus | undefined {
  return USER_STATUSES.find((status) => status === readInitialQueryParam('status'))
}
function initialProfileCompletionStatus(): ProfileCompletionStatus | undefined {
  return PROFILE_COMPLETION_STATUSES.find(
    (status) => status === readInitialQueryParam('profileCompletionStatus'),
  )
}
/** Seeds the search box from a deep link (e.g. the Batch Roster "View Student" row action). */
function initialSearch(): string {
  return readInitialQueryParam('search') ?? ''
}

export default function StudentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState<AccountStatus | undefined>(initialStatus)
  const [gender, setGender] = useState<Gender | undefined>(undefined)
  const [source, setSource] = useState<StudentSource | undefined>(undefined)
  const [profileCompletionStatus, setProfileCompletionStatus] = useState<
    ProfileCompletionStatus | undefined
  >(initialProfileCompletionStatus)
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [sort, setSort] = useState<`${SortField}:${SortDirection}`>('createdAt:desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [editStudentId, setEditStudentId] = useState<string | null>(null)
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null)

  const params: ListStudentsParams = useMemo(
    () => ({
      page,
      limit: 20,
      sort,
      status,
      gender,
      source,
      profileCompletionStatus,
      search: search || undefined,
      includeDeleted,
    }),
    [page, sort, status, gender, source, profileCompletionStatus, search, includeDeleted],
  )

  const studentsQuery = useStudentsList(params)
  const editStudentQuery = useStudent(editStudentId ?? undefined)
  const detailStudentQuery = useStudent(detailStudentId ?? undefined)
  const activateStudent = useActivateStudent()
  const deactivateStudent = useDeactivateStudent()
  const softDeleteStudent = useSoftDeleteStudent()
  const restoreStudent = useRestoreStudent()
  const resendInvitation = useResendInvitation()
  const bulkAction = useBulkAction()
  const exportStudents = useExportStudents()

  const rows = studentsQuery.data?.data ?? []

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

  function runBulk(action: StudentBulkAction) {
    bulkAction.mutate(
      { action, studentIds: [...selectedIds] },
      {
        onSuccess: (result) => {
          if (result.failed.length === 0) {
            toast.success(`${result.succeeded.length.toString()} student(s) updated`)
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
      title="Student Management"
      description="Create and manage student identity, contact, and academic profiles."
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={exportStudents.isPending}
            onClick={() => {
              exportStudents.mutate({
                status,
                gender,
                source,
                profileCompletionStatus,
                search: search || undefined,
                includeDeleted,
              })
            }}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
          <Link
            to="/admin/students/new"
            className={cn(buttonVariants({ size: 'default' }), 'gap-1.5')}
          >
            <Plus className="size-4" />
            Add Student
          </Link>
        </>
      }
    >
      <StudentStatCards />

      <DataGrid
        toolbar={
          <StudentsFilterBar
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
            gender={gender}
            onGenderChange={(value) => {
              setGender(value)
              setPage(1)
            }}
            source={source}
            onSourceChange={(value) => {
              setSource(value)
              setPage(1)
            }}
            profileCompletionStatus={profileCompletionStatus}
            onProfileCompletionStatusChange={(value) => {
              setProfileCompletionStatus(value)
              setPage(1)
            }}
            includeDeleted={includeDeleted}
            onIncludeDeletedChange={(value) => {
              setIncludeDeleted(value)
              setPage(1)
            }}
            sort={sort}
            onSortChange={setSort}
          />
        }
        pagination={
          studentsQuery.data ? { meta: studentsQuery.data.meta, onPageChange: setPage } : undefined
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
          onRestore={() => {
            runBulk('restore')
          }}
          onClearSelection={() => {
            setSelectedIds(new Set())
          }}
        />
        <StudentsTable
          rows={rows}
          isLoading={studentsQuery.isLoading}
          errorMessage={
            studentsQuery.isError ? getSafeErrorMessage(studentsQuery.error) : undefined
          }
          onRetry={() => void studentsQuery.refetch()}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
          onToggleSelectAll={toggleSelectAll}
          onView={(student) => {
            setDetailStudentId(student.id)
          }}
          onEdit={(student) => {
            setEditStudentId(student.id)
          }}
          onActivate={(student) => {
            activateStudent.mutate(student.id, {
              onSuccess: () => toast.success('Student activated'),
              onError: (error) =>
                toast.error('Could not activate student', getSafeErrorMessage(error)),
            })
          }}
          onDeactivate={(student) => {
            setPendingConfirmation({ type: 'deactivate', student })
          }}
          onDelete={(student) => {
            setPendingConfirmation({ type: 'delete', student })
          }}
          onRestore={(student) => {
            restoreStudent.mutate(student.id, {
              onSuccess: () => toast.success('Student restored'),
              onError: (error) =>
                toast.error('Could not restore student', getSafeErrorMessage(error)),
            })
          }}
          onResendInvitation={(student) => {
            resendInvitation.mutate(student.id, {
              onSuccess: () => toast.success('Invitation email sent'),
              onError: (error) =>
                toast.error('Could not send invitation email', getSafeErrorMessage(error)),
            })
          }}
        />
      </DataGrid>

      <StudentEditDrawer
        open={editStudentId !== null}
        onOpenChange={(open) => {
          if (!open) setEditStudentId(null)
        }}
        student={editStudentQuery.data}
      />

      <StudentDetailDrawer
        open={detailStudentId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailStudentId(null)
        }}
        student={detailStudentQuery.data}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'deactivate'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Deactivate this student?"
        description={
          pendingConfirmation?.type === 'deactivate'
            ? `${pendingConfirmation.student.firstName} ${pendingConfirmation.student.lastName} will be signed out and unable to log in until reactivated.`
            : ''
        }
        tone="destructive"
        confirmLabel="Deactivate"
        isConfirming={deactivateStudent.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'deactivate') return
          deactivateStudent.mutate(pendingConfirmation.student.id, {
            onSuccess: () => {
              toast.success('Student deactivated')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not deactivate student', getSafeErrorMessage(error))
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
        title="Delete this student?"
        description={
          pendingConfirmation?.type === 'delete'
            ? `${pendingConfirmation.student.firstName} ${pendingConfirmation.student.lastName}'s account will be soft-deleted and can be restored later. Academic history is preserved.`
            : ''
        }
        tone="destructive"
        confirmLabel="Delete"
        isConfirming={softDeleteStudent.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'delete') return
          softDeleteStudent.mutate(pendingConfirmation.student.id, {
            onSuccess: () => {
              toast.success('Student deleted')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not delete student', getSafeErrorMessage(error))
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
            ? 'Delete selected students?'
            : 'Deactivate selected students?'
        }
        description={`This applies to ${selectedIds.size.toString()} selected student(s).`}
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
