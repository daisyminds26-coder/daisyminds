import { useMemo, useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { DataGrid } from '@/shared/components/data-display/data-grid'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { AssignmentsFilterBar } from '@/features/assignments/components/AssignmentsFilterBar'
import { AssignmentsTable } from '@/features/assignments/components/AssignmentsTable'
import { useAssignmentsList } from '@/features/assignments/hooks/use-assignments-list'
import { useExportSubmissions } from '@/features/assignments/hooks/use-export-submissions'
import type { AssignmentStatus, ListAssignmentsParams } from '@/features/assignments/types'

export default function AssignmentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AssignmentStatus | undefined>(undefined)

  const params: ListAssignmentsParams = useMemo(
    () => ({ page, limit: 20, sort: 'dueDateTime:desc', status, search: search || undefined }),
    [page, status, search],
  )
  const assignmentsQuery = useAssignmentsList(params)
  const exportSubmissions = useExportSubmissions()

  return (
    <PageContainer
      title="Assignments"
      description="Create, publish, and track graded tasks issued to your batches."
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={exportSubmissions.isPending}
            onClick={() => {
              exportSubmissions.mutate({})
            }}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
          <Link
            to="/admin/assignments/new"
            className={cn(buttonVariants({ size: 'default' }), 'gap-1.5')}
          >
            <Plus className="size-4" />
            Create Assignment
          </Link>
        </>
      }
    >
      <DataGrid
        toolbar={
          <AssignmentsFilterBar
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
          />
        }
        pagination={
          assignmentsQuery.data
            ? { meta: assignmentsQuery.data.meta, onPageChange: setPage }
            : undefined
        }
      >
        <AssignmentsTable
          rows={assignmentsQuery.data?.data ?? []}
          isLoading={assignmentsQuery.isLoading}
          errorMessage={
            assignmentsQuery.isError ? getSafeErrorMessage(assignmentsQuery.error) : undefined
          }
          onRetry={() => void assignmentsQuery.refetch()}
        />
      </DataGrid>
    </PageContainer>
  )
}
