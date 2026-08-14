import { useMemo, useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { DataGrid } from '@/shared/components/data-display/data-grid'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { AssessmentsFilterBar } from '@/features/assessments/components/AssessmentsFilterBar'
import { AssessmentsTable } from '@/features/assessments/components/AssessmentsTable'
import { useAssessmentsList } from '@/features/assessments/hooks/use-assessments-list'
import { useExportResults } from '@/features/assessments/hooks/use-export-results'
import type {
  AssessmentStatus,
  AssessmentType,
  ListAssessmentsParams,
} from '@/features/assessments/types'

export default function AssessmentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [assessmentType, setAssessmentType] = useState<AssessmentType | undefined>(undefined)
  const [status, setStatus] = useState<AssessmentStatus | undefined>(undefined)

  const params: ListAssessmentsParams = useMemo(
    () => ({
      page,
      limit: 20,
      sort: 'createdAt:desc',
      assessmentType,
      status,
      search: search || undefined,
    }),
    [page, assessmentType, status, search],
  )
  const assessmentsQuery = useAssessmentsList(params)
  const exportResults = useExportResults()

  return (
    <PageContainer
      title="Quizzes & Examinations"
      description="Author, publish, and grade quizzes and examinations for your courses."
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={exportResults.isPending}
            onClick={() => {
              exportResults.mutate({})
            }}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
          <Link
            to="/admin/assessments/new"
            className={cn(buttonVariants({ size: 'default' }), 'gap-1.5')}
          >
            <Plus className="size-4" />
            Create Assessment
          </Link>
        </>
      }
    >
      <DataGrid
        toolbar={
          <AssessmentsFilterBar
            search={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            assessmentType={assessmentType}
            onAssessmentTypeChange={(value) => {
              setAssessmentType(value)
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
          assessmentsQuery.data
            ? { meta: assessmentsQuery.data.meta, onPageChange: setPage }
            : undefined
        }
      >
        <AssessmentsTable
          rows={assessmentsQuery.data?.data ?? []}
          isLoading={assessmentsQuery.isLoading}
          errorMessage={
            assessmentsQuery.isError ? getSafeErrorMessage(assessmentsQuery.error) : undefined
          }
          onRetry={() => void assessmentsQuery.refetch()}
        />
      </DataGrid>
    </PageContainer>
  )
}
