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
import { isApiClientError } from '@/shared/lib/api-error'
import { CourseStatCards } from '@/features/courses/components/CourseStatCards'
import { CoursesFilterBar } from '@/features/courses/components/CoursesFilterBar'
import { CoursesTable } from '@/features/courses/components/CoursesTable'
import { BulkActionBar } from '@/features/courses/components/BulkActionBar'
import { CourseEditDrawer } from '@/features/courses/components/CourseEditDrawer'
import { CourseDetailDrawer } from '@/features/courses/components/CourseDetailDrawer'
import { useCoursesList } from '@/features/courses/hooks/use-courses-list'
import { useCourse } from '@/features/courses/hooks/use-course'
import {
  useArchiveCourse,
  usePublishCourse,
  useRestoreCourse,
  useSoftDeleteCourse,
  useUnpublishCourse,
} from '@/features/courses/hooks/use-course-lifecycle'
import { useBulkAction } from '@/features/courses/hooks/use-bulk-action'
import { useExportCourses } from '@/features/courses/hooks/use-export-courses'
import {
  COURSE_STATUSES,
  type AdminCourseListItem,
  type CourseBulkAction,
  type CourseLevel,
  type CourseStatus,
  type DeliveryMode,
  type ListCoursesParams,
  type PricingType,
  type SortDirection,
  type SortField,
} from '@/features/courses/types'

type PendingConfirmation =
  | { type: 'archive'; course: AdminCourseListItem }
  | { type: 'delete'; course: AdminCourseListItem }
  | { type: 'bulk'; action: Extract<CourseBulkAction, 'archive' | 'delete'> }
  | null

/** Seeds the status filter from an allowlisted deep link (e.g. `/admin/courses?status=DRAFT`). */
function initialStatus(): CourseStatus | undefined {
  return COURSE_STATUSES.find((status) => status === readInitialQueryParam('status'))
}

export default function CoursesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CourseStatus | undefined>(initialStatus)
  const [level, setLevel] = useState<CourseLevel | undefined>(undefined)
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode | undefined>(undefined)
  const [pricingType, setPricingType] = useState<PricingType | undefined>(undefined)
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [sort, setSort] = useState<`${SortField}:${SortDirection}`>('createdAt:desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [editCourseId, setEditCourseId] = useState<string | null>(null)
  const [detailCourseId, setDetailCourseId] = useState<string | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null)

  const params: ListCoursesParams = useMemo(
    () => ({
      page,
      limit: 20,
      sort,
      status,
      level,
      deliveryMode,
      pricingType,
      search: search || undefined,
      includeDeleted,
    }),
    [page, sort, status, level, deliveryMode, pricingType, search, includeDeleted],
  )

  const coursesQuery = useCoursesList(params)
  const editCourseQuery = useCourse(editCourseId ?? undefined)
  const detailCourseQuery = useCourse(detailCourseId ?? undefined)
  const publishCourse = usePublishCourse()
  const unpublishCourse = useUnpublishCourse()
  const archiveCourse = useArchiveCourse()
  const restoreCourse = useRestoreCourse()
  const softDeleteCourse = useSoftDeleteCourse()
  const bulkAction = useBulkAction()
  const exportCourses = useExportCourses()

  const rows = coursesQuery.data?.data ?? []

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

  function publishBlockersMessage(error: unknown): string {
    if (isApiClientError(error) && error.errors && error.errors.length > 0) {
      return error.errors.map((detail) => detail.message).join('; ')
    }
    return getSafeErrorMessage(error)
  }

  function runBulk(action: CourseBulkAction) {
    bulkAction.mutate(
      { action, courseIds: [...selectedIds] },
      {
        onSuccess: (result) => {
          if (result.failed.length === 0) {
            toast.success(`${result.succeeded.length.toString()} course(s) updated`)
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
      title="Course Management"
      description="Create and manage course-level metadata, pricing, and publication lifecycle."
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={exportCourses.isPending}
            onClick={() => {
              exportCourses.mutate({
                status,
                level,
                deliveryMode,
                pricingType,
                search: search || undefined,
                includeDeleted,
              })
            }}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
          <Link
            to="/admin/courses/new"
            className={cn(buttonVariants({ size: 'default' }), 'gap-1.5')}
          >
            <Plus className="size-4" />
            Add Course
          </Link>
        </>
      }
    >
      <CourseStatCards />

      <DataGrid
        toolbar={
          <CoursesFilterBar
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
            level={level}
            onLevelChange={(value) => {
              setLevel(value)
              setPage(1)
            }}
            deliveryMode={deliveryMode}
            onDeliveryModeChange={(value) => {
              setDeliveryMode(value)
              setPage(1)
            }}
            pricingType={pricingType}
            onPricingTypeChange={(value) => {
              setPricingType(value)
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
          coursesQuery.data ? { meta: coursesQuery.data.meta, onPageChange: setPage } : undefined
        }
      >
        <BulkActionBar
          selectedCount={selectedIds.size}
          isPending={bulkAction.isPending}
          onPublish={() => {
            runBulk('publish')
          }}
          onArchive={() => {
            setPendingConfirmation({ type: 'bulk', action: 'archive' })
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
        <CoursesTable
          rows={rows}
          isLoading={coursesQuery.isLoading}
          errorMessage={coursesQuery.isError ? getSafeErrorMessage(coursesQuery.error) : undefined}
          onRetry={() => void coursesQuery.refetch()}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
          onToggleSelectAll={toggleSelectAll}
          onView={(course) => {
            setDetailCourseId(course.id)
          }}
          onEdit={(course) => {
            setEditCourseId(course.id)
          }}
          onPublish={(course) => {
            publishCourse.mutate(course.id, {
              onSuccess: () => toast.success('Course published'),
              onError: (error) =>
                toast.error('Course is not ready to publish', publishBlockersMessage(error)),
            })
          }}
          onUnpublish={(course) => {
            unpublishCourse.mutate(course.id, {
              onSuccess: () => toast.success('Course moved back to draft'),
              onError: (error) =>
                toast.error('Could not unpublish course', getSafeErrorMessage(error)),
            })
          }}
          onArchive={(course) => {
            setPendingConfirmation({ type: 'archive', course })
          }}
          onRestore={(course) => {
            restoreCourse.mutate(course.id, {
              onSuccess: () => toast.success('Course restored'),
              onError: (error) =>
                toast.error('Could not restore course', getSafeErrorMessage(error)),
            })
          }}
          onDelete={(course) => {
            setPendingConfirmation({ type: 'delete', course })
          }}
        />
      </DataGrid>

      <CourseEditDrawer
        open={editCourseId !== null}
        onOpenChange={(open) => {
          if (!open) setEditCourseId(null)
        }}
        course={editCourseQuery.data}
      />

      <CourseDetailDrawer
        open={detailCourseId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailCourseId(null)
        }}
        course={detailCourseQuery.data}
      />

      <ConfirmDialog
        open={pendingConfirmation?.type === 'archive'}
        onOpenChange={(open) => {
          if (!open) setPendingConfirmation(null)
        }}
        title="Archive this course?"
        description={
          pendingConfirmation?.type === 'archive'
            ? `"${pendingConfirmation.course.title}" will no longer be available for new enrolments. It can be restored later.`
            : ''
        }
        tone="destructive"
        confirmLabel="Archive"
        isConfirming={archiveCourse.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'archive') return
          archiveCourse.mutate(pendingConfirmation.course.id, {
            onSuccess: () => {
              toast.success('Course archived')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not archive course', getSafeErrorMessage(error))
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
        title="Delete this course?"
        description={
          pendingConfirmation?.type === 'delete'
            ? `"${pendingConfirmation.course.title}" will be soft-deleted and can be restored later.`
            : ''
        }
        tone="destructive"
        confirmLabel="Delete"
        isConfirming={softDeleteCourse.isPending}
        onConfirm={() => {
          if (pendingConfirmation?.type !== 'delete') return
          softDeleteCourse.mutate(pendingConfirmation.course.id, {
            onSuccess: () => {
              toast.success('Course deleted')
              setPendingConfirmation(null)
            },
            onError: (error) => {
              toast.error('Could not delete course', getSafeErrorMessage(error))
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
            ? 'Delete selected courses?'
            : 'Archive selected courses?'
        }
        description={`This applies to ${selectedIds.size.toString()} selected course(s).`}
        tone="destructive"
        confirmLabel={
          pendingConfirmation?.type === 'bulk' && pendingConfirmation.action === 'delete'
            ? 'Delete'
            : 'Archive'
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
