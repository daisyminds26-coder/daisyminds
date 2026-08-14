import { SearchBox } from '@/shared/components/data-display/search-box'
import { FilterBar, type FilterDef } from '@/shared/components/data-display/filter-bar'
import {
  ASSESSMENT_STATUSES,
  ASSESSMENT_TYPES,
  type AssessmentStatus,
  type AssessmentType,
} from '@/features/assessments/types'

interface AssessmentsFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  assessmentType: AssessmentType | undefined
  onAssessmentTypeChange: (value: AssessmentType | undefined) => void
  status: AssessmentStatus | undefined
  onStatusChange: (value: AssessmentStatus | undefined) => void
}

export function AssessmentsFilterBar({
  search,
  onSearchChange,
  assessmentType,
  onAssessmentTypeChange,
  status,
  onStatusChange,
}: AssessmentsFilterBarProps) {
  const filters: FilterDef[] = [
    {
      id: 'assessmentType',
      label: 'Type',
      value: assessmentType,
      onChange: (value) => {
        onAssessmentTypeChange(value as AssessmentType | undefined)
      },
      options: ASSESSMENT_TYPES.map((value) => ({
        value,
        label: value === 'QUIZ' ? 'Quiz' : 'Examination',
      })),
    },
    {
      id: 'status',
      label: 'Status',
      value: status,
      onChange: (value) => {
        onStatusChange(value as AssessmentStatus | undefined)
      },
      options: ASSESSMENT_STATUSES.map((value) => ({ value, label: value })),
    },
  ]

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SearchBox
        value={search}
        onChange={onSearchChange}
        placeholder="Search by title, assessment code…"
        className="sm:max-w-md sm:flex-1"
      />
      <FilterBar
        filters={filters}
        onClearAll={() => {
          onAssessmentTypeChange(undefined)
          onStatusChange(undefined)
        }}
      />
    </div>
  )
}
