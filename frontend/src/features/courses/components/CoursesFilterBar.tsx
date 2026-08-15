import { formatEnumLabel } from '@/shared/lib/utils'
import { SearchBox } from '@/shared/components/data-display/search-box'
import { FilterBar, type FilterDef } from '@/shared/components/data-display/filter-bar'
import { Button } from '@/shared/components/ui/button'
import {
  COURSE_LEVELS,
  COURSE_STATUSES,
  DELIVERY_MODES,
  PRICING_TYPES,
  type CourseLevel,
  type CourseStatus,
  type DeliveryMode,
  type PricingType,
  type SortDirection,
  type SortField,
} from '@/features/courses/types'

const SORT_OPTIONS: { value: `${SortField}:${SortDirection}`; label: string }[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'title:asc', label: 'Title (A–Z)' },
  { value: 'publishedAt:desc', label: 'Recently published' },
  { value: 'pricing.basePrice:desc', label: 'Price (high to low)' },
  { value: 'courseCode:asc', label: 'Course code' },
]

interface CoursesFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  status: CourseStatus | undefined
  onStatusChange: (value: CourseStatus | undefined) => void
  level: CourseLevel | undefined
  onLevelChange: (value: CourseLevel | undefined) => void
  deliveryMode: DeliveryMode | undefined
  onDeliveryModeChange: (value: DeliveryMode | undefined) => void
  pricingType: PricingType | undefined
  onPricingTypeChange: (value: PricingType | undefined) => void
  includeDeleted: boolean
  onIncludeDeletedChange: (value: boolean) => void
  sort: `${SortField}:${SortDirection}`
  onSortChange: (value: `${SortField}:${SortDirection}`) => void
}

export function CoursesFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  level,
  onLevelChange,
  deliveryMode,
  onDeliveryModeChange,
  pricingType,
  onPricingTypeChange,
  includeDeleted,
  onIncludeDeletedChange,
  sort,
  onSortChange,
}: CoursesFilterBarProps) {
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
        onStatusChange(value as CourseStatus | undefined)
      },
      options: COURSE_STATUSES.map((value) => ({ value, label: formatEnumLabel(value) })),
    },
    {
      id: 'level',
      label: 'Level',
      value: level,
      onChange: (value) => {
        onLevelChange(value as CourseLevel | undefined)
      },
      options: COURSE_LEVELS.map((value) => ({ value, label: formatEnumLabel(value) })),
    },
    {
      id: 'deliveryMode',
      label: 'Delivery',
      value: deliveryMode,
      onChange: (value) => {
        onDeliveryModeChange(value as DeliveryMode | undefined)
      },
      options: DELIVERY_MODES.map((value) => ({ value, label: formatEnumLabel(value) })),
    },
    {
      id: 'pricingType',
      label: 'Pricing',
      value: pricingType,
      onChange: (value) => {
        onPricingTypeChange(value as PricingType | undefined)
      },
      options: PRICING_TYPES.map((value) => ({ value, label: formatEnumLabel(value) })),
    },
  ]

  function clearAll() {
    onStatusChange(undefined)
    onLevelChange(undefined)
    onDeliveryModeChange(undefined)
    onPricingTypeChange(undefined)
    onIncludeDeletedChange(false)
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SearchBox
        value={search}
        onChange={onSearchChange}
        placeholder="Search by title, course code, category, tags…"
        className="sm:max-w-md sm:flex-1"
      />
      <FilterBar filters={filters} onClearAll={clearAll}>
        <Button
          type="button"
          variant={includeDeleted ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => {
            onIncludeDeletedChange(!includeDeleted)
          }}
        >
          {includeDeleted ? 'Showing deleted' : 'Show deleted'}
        </Button>
      </FilterBar>
    </div>
  )
}
