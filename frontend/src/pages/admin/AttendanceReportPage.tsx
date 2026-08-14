import { useMemo, useState } from 'react'
import { ClipboardList, Download } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Button } from '@/shared/components/ui/button'
import { DataGrid } from '@/shared/components/data-display/data-grid'
import { DataTable, type DataTableColumn } from '@/shared/components/data-display/data-table'
import { SearchBox } from '@/shared/components/data-display/search-box'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { AttendanceStatusBadge } from '@/features/attendance/components/AttendanceStatusBadge'
import { useAttendanceReport } from '@/features/attendance/hooks/use-attendance-report'
import { useExportAttendance } from '@/features/attendance/hooks/use-export-attendance'
import type { AdminAttendanceReportRow, ListAttendanceParams } from '@/features/attendance/types'

export default function AttendanceReportPage() {
  const [page, setPage] = useState(1)
  const [studentSearch, setStudentSearch] = useState('')

  const params: ListAttendanceParams = useMemo(() => ({ page, limit: 50 }), [page])
  const reportQuery = useAttendanceReport(params)
  const exportAttendance = useExportAttendance()

  const rows = (reportQuery.data?.data ?? []).filter(
    (row) =>
      studentSearch.trim().length === 0 ||
      row.studentName.toLowerCase().includes(studentSearch.trim().toLowerCase()) ||
      row.studentCode.toLowerCase().includes(studentSearch.trim().toLowerCase()),
  )

  const columns: DataTableColumn<AdminAttendanceReportRow>[] = [
    {
      id: 'session',
      header: 'Session',
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-body-sm font-medium">{row.sessionCode}</span>
          <span className="text-caption text-muted-foreground">
            {new Date(row.scheduledDate).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      id: 'batch',
      header: 'Batch / Course',
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-body-sm">{row.batchName}</span>
          <span className="text-caption text-muted-foreground">{row.courseTitle}</span>
        </div>
      ),
    },
    {
      id: 'student',
      header: 'Student',
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-body-sm">{row.studentName}</span>
          <span className="text-caption text-muted-foreground font-mono">{row.studentCode}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <AttendanceStatusBadge status={row.status} />,
    },
  ]

  return (
    <PageContainer
      title="Attendance"
      description="A basic operational view of finalized attendance records across every batch."
      actions={
        <Button
          type="button"
          variant="outline"
          className="gap-1.5"
          disabled={exportAttendance.isPending}
          onClick={() => {
            exportAttendance.mutate({})
          }}
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      }
    >
      <DataGrid
        toolbar={
          <SearchBox
            value={studentSearch}
            onChange={setStudentSearch}
            placeholder="Filter by student name or ID…"
            className="sm:max-w-md"
          />
        }
        pagination={
          reportQuery.data ? { meta: reportQuery.data.meta, onPageChange: setPage } : undefined
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => `${row.sessionId}-${row.studentId}`}
          isLoading={reportQuery.isLoading}
          errorMessage={reportQuery.isError ? getSafeErrorMessage(reportQuery.error) : undefined}
          onRetry={() => void reportQuery.refetch()}
          emptyIcon={ClipboardList}
          emptyTitle="No attendance records yet"
          emptyDescription="Records appear here once a session's attendance has been finalized."
        />
      </DataGrid>
    </PageContainer>
  )
}
