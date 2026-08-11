import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { AddResourceDialog } from '@/features/courses/curriculum/content/components/AddResourceDialog'
import { ResourceRow } from '@/features/courses/curriculum/content/components/ResourceRow'
import {
  useLessonResources,
  useReorderResources,
} from '@/features/courses/curriculum/content/hooks/use-lesson-resources'
import type { LessonResource } from '@/features/courses/curriculum/content/types'
import type { LessonContentParams } from '@/features/courses/curriculum/content/hooks/use-lesson-content'

const MAX_RESOURCES_HINT = 20

function withSwappedOrder(
  items: { id: string; order: number }[],
  from: number,
  to: number,
): { id: string; order: number }[] {
  const reordered = [...items]
  const [moved] = reordered.splice(from, 1)
  if (!moved) return items.map((item, index) => ({ id: item.id, order: index }))
  reordered.splice(to, 0, moved)
  return reordered.map((item, index) => ({ id: item.id, order: index }))
}

/** Drag/drop reorder (dnd-kit, reusing the same library as the Curriculum Builder) plus a mandatory keyboard-accessible move-up/down alternative on every row — drag is never the only way to reorder (task's own explicit requirement). */
export function ResourceManager(params: LessonContentParams) {
  const [addOpen, setAddOpen] = useState(false)
  const resourcesQuery = useLessonResources(params)
  const reorderResources = useReorderResources(params)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const resources = resourcesQuery.data ?? []

  function applyReorder(next: { id: string; order: number }[]) {
    reorderResources.mutate(next, {
      onSuccess: () => toast.success('Resources reordered'),
      onError: (error) => toast.error('Could not reorder resources', getSafeErrorMessage(error)),
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const items = resources.map((resource) => ({ id: resource.id, order: resource.sortOrder }))
    const fromIndex = resources.findIndex((resource) => resource.id === active.id)
    const toIndex = resources.findIndex((resource) => resource.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return
    applyReorder(withSwappedOrder(items, fromIndex, toIndex))
  }

  function handleMove(resource: LessonResource, direction: -1 | 1) {
    const fromIndex = resources.findIndex((item) => item.id === resource.id)
    const toIndex = fromIndex + direction
    if (toIndex < 0 || toIndex >= resources.length) return
    const items = resources.map((item) => ({ id: item.id, order: item.sortOrder }))
    applyReorder(withSwappedOrder(items, fromIndex, toIndex))
  }

  if (resourcesQuery.isLoading) return <ListSkeleton rows={3} />
  if (resourcesQuery.isError) {
    return (
      <ErrorState
        description={getSafeErrorMessage(resourcesQuery.error)}
        onRetry={() => void resourcesQuery.refetch()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-caption text-muted-foreground">
          {resources.length} of {MAX_RESOURCES_HINT} resources
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={resources.length >= MAX_RESOURCES_HINT}
          onClick={() => {
            setAddOpen(true)
          }}
        >
          <Plus className="size-3.5" />
          Add resource
        </Button>
      </div>

      {resources.length === 0 ? (
        <p className="text-body-sm text-muted-foreground border-border rounded-md border border-dashed p-6 text-center">
          No downloadable resources yet.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={resources.map((resource) => resource.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {resources.map((resource, index) => (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === resources.length - 1}
                  disabled={reorderResources.isPending}
                  onMoveUp={(item) => {
                    handleMove(item, -1)
                  }}
                  onMoveDown={(item) => {
                    handleMove(item, 1)
                  }}
                  {...params}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AddResourceDialog open={addOpen} onOpenChange={setAddOpen} {...params} />
    </div>
  )
}
