import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ArrowLeft, ChevronsDownUp, ChevronsUpDown, Plus } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { usePageBreadcrumb } from '@/shared/hooks/use-page-breadcrumb'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useCourse } from '@/features/courses/hooks/use-course'
import { CurriculumReadinessPanel } from '@/features/courses/curriculum/components/CurriculumReadinessPanel'
import { LaunchReadinessPanel } from '@/features/courses/curriculum/content/components/LaunchReadinessPanel'
import { useCourseLaunchReadiness } from '@/features/courses/curriculum/content/hooks/use-launch-readiness'
import { CurriculumEmptyState } from '@/features/courses/curriculum/components/CurriculumEmptyState'
import { ModuleCard } from '@/features/courses/curriculum/components/ModuleCard'
import { ModuleFormDrawer } from '@/features/courses/curriculum/components/ModuleFormDrawer'
import { LessonFormDrawer } from '@/features/courses/curriculum/components/LessonFormDrawer'
import { MoveLessonDialog } from '@/features/courses/curriculum/components/MoveLessonDialog'
import {
  useCurriculum,
  useCurriculumReadiness,
} from '@/features/courses/curriculum/hooks/use-curriculum'
import {
  useArchiveModule,
  useDeleteModule,
  useDuplicateModule,
  usePublishModule,
  useReorderModules,
  useRestoreModule,
  useUnpublishModule,
} from '@/features/courses/curriculum/hooks/use-module-mutations'
import {
  useArchiveLesson,
  useDeleteLesson,
  useDuplicateLesson,
  usePublishLesson,
  useReorderLessons,
  useRestoreLesson,
  useUnpublishLesson,
} from '@/features/courses/curriculum/hooks/use-lesson-mutations'
import type {
  CurriculumLesson,
  CurriculumModuleWithLessons,
  ReorderItem,
} from '@/features/courses/curriculum/types'

type ModuleFormTarget =
  { mode: 'create' } | { mode: 'edit'; module: CurriculumModuleWithLessons } | null
type LessonFormTarget = { moduleId: string; lesson?: CurriculumLesson } | null
type PendingDelete =
  | { type: 'module'; module: CurriculumModuleWithLessons }
  | { type: 'lesson'; moduleId: string; lesson: CurriculumLesson }
  | null

function withSwappedOrder(
  items: { id: string; order: number }[],
  from: number,
  to: number,
): ReorderItem[] {
  const reordered = [...items]
  const [moved] = reordered.splice(from, 1)
  if (!moved) return items.map((item, index) => ({ id: item.id, order: index }))
  reordered.splice(to, 0, moved)
  return reordered.map((item, index) => ({ id: item.id, order: index }))
}

export default function CourseCurriculumPage() {
  const { courseId = '' } = useParams<{ courseId: string }>()
  const courseQuery = useCourse(courseId)
  const curriculumQuery = useCurriculum(courseId)
  const readinessQuery = useCurriculumReadiness(courseId)
  const launchReadinessQuery = useCourseLaunchReadiness(courseId)

  const courseTitle = courseQuery.data?.title
  const breadcrumbSegments = useMemo(
    () =>
      courseTitle
        ? [
            { label: 'Admin', href: '/admin' },
            { label: 'Courses', href: '/admin/courses' },
            { label: courseTitle },
            { label: 'Curriculum' },
          ]
        : undefined,
    [courseTitle],
  )
  usePageBreadcrumb(breadcrumbSegments)

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [moduleFormTarget, setModuleFormTarget] = useState<ModuleFormTarget>(null)
  const [lessonFormTarget, setLessonFormTarget] = useState<LessonFormTarget>(null)
  const [moveLessonTarget, setMoveLessonTarget] = useState<CurriculumLesson | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)

  const reorderModules = useReorderModules(courseId)
  const archiveModule = useArchiveModule(courseId)
  const restoreModule = useRestoreModule(courseId)
  const duplicateModule = useDuplicateModule(courseId)
  const publishModule = usePublishModule(courseId)
  const unpublishModule = useUnpublishModule(courseId)
  const deleteModule = useDeleteModule(courseId)

  const reorderLessons = useReorderLessons(courseId)
  const archiveLesson = useArchiveLesson(courseId)
  const restoreLesson = useRestoreLesson(courseId)
  const duplicateLesson = useDuplicateLesson(courseId)
  const publishLesson = usePublishLesson(courseId)
  const unpublishLesson = useUnpublishLesson(courseId)
  const deleteLesson = useDeleteLesson(courseId)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const modules = curriculumQuery.data?.modules ?? []
  const allLessons = modules.flatMap((module) => module.lessons)
  const isMutating = reorderModules.isPending || reorderLessons.isPending || deleteModule.isPending

  function toggleExpanded(moduleId: string) {
    setCollapsedIds((previous) => {
      const next = new Set(previous)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = modules.map((module) => ({ id: module.id, order: module.order }))
    const fromIndex = modules.findIndex((module) => module.id === active.id)
    const toIndex = modules.findIndex((module) => module.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return
    reorderModules.mutate(withSwappedOrder(ids, fromIndex, toIndex), {
      onSuccess: () => toast.success('Modules reordered'),
      onError: (error) => toast.error('Could not reorder modules', getSafeErrorMessage(error)),
    })
  }

  function handleModuleMove(module: CurriculumModuleWithLessons, direction: -1 | 1) {
    const fromIndex = modules.findIndex((m) => m.id === module.id)
    const toIndex = fromIndex + direction
    if (toIndex < 0 || toIndex >= modules.length) return
    const items = modules.map((m) => ({ id: m.id, order: m.order }))
    reorderModules.mutate(withSwappedOrder(items, fromIndex, toIndex), {
      onSuccess: () => toast.success('Modules reordered'),
      onError: (error) => toast.error('Could not reorder modules', getSafeErrorMessage(error)),
    })
  }

  function handleReorderLessons(moduleId: string, orderedLessonIds: string[]) {
    reorderLessons.mutate(
      { moduleId, items: orderedLessonIds.map((id, index) => ({ id, order: index })) },
      {
        onSuccess: () => toast.success('Lessons reordered'),
        onError: (error) => toast.error('Could not reorder lessons', getSafeErrorMessage(error)),
      },
    )
  }

  function handleLessonMove(lesson: CurriculumLesson, direction: -1 | 1) {
    const module = modules.find((m) => m.id === lesson.courseModuleId)
    if (!module) return
    const fromIndex = module.lessons.findIndex((l) => l.id === lesson.id)
    const toIndex = fromIndex + direction
    if (toIndex < 0 || toIndex >= module.lessons.length) return
    const items = module.lessons.map((l) => ({ id: l.id, order: l.order }))
    handleReorderLessons(
      module.id,
      withSwappedOrder(items, fromIndex, toIndex).map((item) => item.id),
    )
  }

  if (courseQuery.isLoading || curriculumQuery.isLoading) return <PageLoader />
  if (courseQuery.isError || !courseQuery.data) {
    return (
      <ErrorState
        description="We couldn't load this course."
        onRetry={() => void courseQuery.refetch()}
      />
    )
  }
  if (curriculumQuery.isError) {
    return (
      <ErrorState
        description={getSafeErrorMessage(curriculumQuery.error)}
        onRetry={() => void curriculumQuery.refetch()}
      />
    )
  }

  const course = courseQuery.data

  return (
    <PageContainer
      title="Curriculum Builder"
      description={`${course.title} · ${course.courseCode}`}
      actions={
        <>
          <Link
            to={`/admin/courses`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <ArrowLeft className="size-3.5" />
            Back to courses
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setCollapsedIds(
                collapsedIds.size === modules.length
                  ? new Set()
                  : new Set(modules.map((m) => m.id)),
              )
            }}
          >
            {collapsedIds.size === modules.length ? (
              <ChevronsUpDown className="size-3.5" />
            ) : (
              <ChevronsDownUp className="size-3.5" />
            )}
            {collapsedIds.size === modules.length ? 'Expand all' : 'Collapse all'}
          </Button>
          <Button
            type="button"
            className="gap-1.5"
            onClick={() => {
              setModuleFormTarget({ mode: 'create' })
            }}
          >
            <Plus className="size-4" />
            Add module
          </Button>
        </>
      }
    >
      <CurriculumReadinessPanel
        readiness={readinessQuery.data}
        isLoading={readinessQuery.isLoading}
      />

      <LaunchReadinessPanel
        readiness={launchReadinessQuery.data}
        isLoading={launchReadinessQuery.isLoading}
      />

      {modules.length === 0 ? (
        <CurriculumEmptyState
          onAddModule={() => {
            setModuleFormTarget({ mode: 'create' })
          }}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleModuleDragEnd}
        >
          <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {modules.map((module, index) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === modules.length - 1}
                  isExpanded={!collapsedIds.has(module.id)}
                  onToggleExpanded={toggleExpanded}
                  disabled={isMutating}
                  onReorderLessons={handleReorderLessons}
                  onAddLesson={(m) => {
                    setLessonFormTarget({ moduleId: m.id })
                  }}
                  onEditModule={(m) => {
                    setModuleFormTarget({ mode: 'edit', module: m })
                  }}
                  onDuplicateModule={(m) => {
                    duplicateModule.mutate(m.id, {
                      onSuccess: () => toast.success('Module duplicated'),
                      onError: (error) =>
                        toast.error('Could not duplicate module', getSafeErrorMessage(error)),
                    })
                  }}
                  onArchiveModule={(m) => {
                    archiveModule.mutate(m.id, {
                      onSuccess: () => toast.success('Module archived'),
                      onError: (error) =>
                        toast.error('Could not archive module', getSafeErrorMessage(error)),
                    })
                  }}
                  onRestoreModule={(m) => {
                    restoreModule.mutate(m.id, {
                      onSuccess: () => toast.success('Module restored'),
                      onError: (error) =>
                        toast.error('Could not restore module', getSafeErrorMessage(error)),
                    })
                  }}
                  onPublishModule={(m) => {
                    publishModule.mutate(m.id, {
                      onSuccess: () => toast.success('Module published'),
                      onError: (error) =>
                        toast.error('Could not publish module', getSafeErrorMessage(error)),
                    })
                  }}
                  onUnpublishModule={(m) => {
                    unpublishModule.mutate(m.id, {
                      onSuccess: () => toast.success('Module moved to draft'),
                      onError: (error) =>
                        toast.error('Could not unpublish module', getSafeErrorMessage(error)),
                    })
                  }}
                  onDeleteModule={(m) => {
                    setPendingDelete({ type: 'module', module: m })
                  }}
                  onMoveModuleUp={(m) => {
                    handleModuleMove(m, -1)
                  }}
                  onMoveModuleDown={(m) => {
                    handleModuleMove(m, 1)
                  }}
                  onEdit={(lesson) => {
                    setLessonFormTarget({ moduleId: lesson.courseModuleId, lesson })
                  }}
                  onDuplicate={(lesson) => {
                    duplicateLesson.mutate(
                      { moduleId: lesson.courseModuleId, lessonId: lesson.id },
                      {
                        onSuccess: () => toast.success('Lesson duplicated'),
                        onError: (error) =>
                          toast.error('Could not duplicate lesson', getSafeErrorMessage(error)),
                      },
                    )
                  }}
                  onMove={(lesson) => {
                    setMoveLessonTarget(lesson)
                  }}
                  onArchive={(lesson) => {
                    archiveLesson.mutate(
                      { moduleId: lesson.courseModuleId, lessonId: lesson.id },
                      {
                        onSuccess: () => toast.success('Lesson archived'),
                        onError: (error) =>
                          toast.error('Could not archive lesson', getSafeErrorMessage(error)),
                      },
                    )
                  }}
                  onRestore={(lesson) => {
                    restoreLesson.mutate(
                      { moduleId: lesson.courseModuleId, lessonId: lesson.id },
                      {
                        onSuccess: () => toast.success('Lesson restored'),
                        onError: (error) =>
                          toast.error('Could not restore lesson', getSafeErrorMessage(error)),
                      },
                    )
                  }}
                  onPublish={(lesson) => {
                    publishLesson.mutate(
                      { moduleId: lesson.courseModuleId, lessonId: lesson.id },
                      {
                        onSuccess: () => toast.success('Lesson published'),
                        onError: (error) =>
                          toast.error('Could not publish lesson', getSafeErrorMessage(error)),
                      },
                    )
                  }}
                  onUnpublish={(lesson) => {
                    unpublishLesson.mutate(
                      { moduleId: lesson.courseModuleId, lessonId: lesson.id },
                      {
                        onSuccess: () => toast.success('Lesson moved to draft'),
                        onError: (error) =>
                          toast.error('Could not unpublish lesson', getSafeErrorMessage(error)),
                      },
                    )
                  }}
                  onDelete={(lesson) => {
                    setPendingDelete({ type: 'lesson', moduleId: lesson.courseModuleId, lesson })
                  }}
                  onMoveUp={(lesson) => {
                    handleLessonMove(lesson, -1)
                  }}
                  onMoveDown={(lesson) => {
                    handleLessonMove(lesson, 1)
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ModuleFormDrawer
        courseId={courseId}
        open={moduleFormTarget !== null}
        onOpenChange={(open) => {
          if (!open) setModuleFormTarget(null)
        }}
        module={moduleFormTarget?.mode === 'edit' ? moduleFormTarget.module : undefined}
      />

      {lessonFormTarget && (
        <LessonFormDrawer
          courseId={courseId}
          moduleId={lessonFormTarget.moduleId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setLessonFormTarget(null)
          }}
          lesson={lessonFormTarget.lesson}
          candidates={allLessons
            .filter((lesson) => lesson.id !== lessonFormTarget.lesson?.id)
            .map((lesson) => ({ id: lesson.id, title: lesson.title }))}
        />
      )}

      <MoveLessonDialog
        key={moveLessonTarget?.id ?? 'move-lesson-dialog'}
        courseId={courseId}
        open={moveLessonTarget !== null}
        onOpenChange={(open) => {
          if (!open) setMoveLessonTarget(null)
        }}
        lesson={moveLessonTarget ?? undefined}
        modules={modules}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title={pendingDelete?.type === 'module' ? 'Delete this module?' : 'Delete this lesson?'}
        description={
          pendingDelete?.type === 'module'
            ? `"${pendingDelete.module.title}" and its lessons will be soft-deleted and can be restored later.`
            : pendingDelete?.type === 'lesson'
              ? `"${pendingDelete.lesson.title}" will be soft-deleted and can be restored later.`
              : ''
        }
        tone="destructive"
        confirmLabel="Delete"
        isConfirming={deleteModule.isPending || deleteLesson.isPending}
        onConfirm={() => {
          if (pendingDelete?.type === 'module') {
            deleteModule.mutate(pendingDelete.module.id, {
              onSuccess: () => {
                toast.success('Module deleted')
                setPendingDelete(null)
              },
              onError: (error) => {
                toast.error('Could not delete module', getSafeErrorMessage(error))
                setPendingDelete(null)
              },
            })
          } else if (pendingDelete?.type === 'lesson') {
            deleteLesson.mutate(
              { moduleId: pendingDelete.moduleId, lessonId: pendingDelete.lesson.id },
              {
                onSuccess: () => {
                  toast.success('Lesson deleted')
                  setPendingDelete(null)
                },
                onError: (error) => {
                  toast.error('Could not delete lesson', getSafeErrorMessage(error))
                  setPendingDelete(null)
                },
              },
            )
          }
        }}
      />
    </PageContainer>
  )
}
