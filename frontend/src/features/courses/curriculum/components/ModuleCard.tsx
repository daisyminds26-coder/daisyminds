import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Archive,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  Copy,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { cn } from '@/shared/lib/utils'
import { CurriculumItemStatusBadge } from '@/features/courses/curriculum/components/CurriculumItemStatusBadge'
import {
  LessonRow,
  type LessonRowActions,
} from '@/features/courses/curriculum/components/LessonRow'
import type { CurriculumModuleWithLessons } from '@/features/courses/curriculum/types'

export interface ModuleCardActions extends LessonRowActions {
  onEditModule: (module: CurriculumModuleWithLessons) => void
  onDuplicateModule: (module: CurriculumModuleWithLessons) => void
  onArchiveModule: (module: CurriculumModuleWithLessons) => void
  onRestoreModule: (module: CurriculumModuleWithLessons) => void
  onPublishModule: (module: CurriculumModuleWithLessons) => void
  onUnpublishModule: (module: CurriculumModuleWithLessons) => void
  onDeleteModule: (module: CurriculumModuleWithLessons) => void
  onMoveModuleUp: (module: CurriculumModuleWithLessons) => void
  onMoveModuleDown: (module: CurriculumModuleWithLessons) => void
  onAddLesson: (module: CurriculumModuleWithLessons) => void
  onReorderLessons: (moduleId: string, orderedLessonIds: string[]) => void
}

interface ModuleCardProps extends ModuleCardActions {
  module: CurriculumModuleWithLessons
  index: number
  isFirst: boolean
  isLast: boolean
  isExpanded: boolean
  onToggleExpanded: (moduleId: string) => void
  disabled: boolean
}

export function ModuleCard({
  module,
  index,
  isFirst,
  isLast,
  isExpanded,
  onToggleExpanded,
  disabled,
  onEditModule,
  onDuplicateModule,
  onArchiveModule,
  onRestoreModule,
  onPublishModule,
  onUnpublishModule,
  onDeleteModule,
  onMoveModuleUp,
  onMoveModuleDown,
  onAddLesson,
  onReorderLessons,
  ...lessonActions
}: ModuleCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
    disabled,
  })
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function handleLessonDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = module.lessons.map((lesson) => lesson.id)
    const fromIndex = ids.indexOf(String(active.id))
    const toIndex = ids.indexOf(String(over.id))
    if (fromIndex === -1 || toIndex === -1) return
    const reordered = [...ids]
    reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, String(active.id))
    onReorderLessons(module.id, reordered)
  }

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('gap-3 py-3', isDragging && 'opacity-50')}
    >
      <Collapsible
        open={isExpanded}
        onOpenChange={() => {
          onToggleExpanded(module.id)
        }}
      >
        <CardHeader className="flex items-center gap-2 px-3">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-grab touch-none disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Move module ${String(index + 1)}: ${module.title}`}
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>

          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              aria-label={isExpanded ? `Collapse ${module.title}` : `Expand ${module.title}`}
            >
              <ChevronDown
                className={cn('size-4 shrink-0 transition-transform', !isExpanded && '-rotate-90')}
              />
              <span className="text-caption text-muted-foreground shrink-0 font-mono">
                Module {index + 1}
              </span>
              <span className="truncate font-semibold">{module.title}</span>
              <CurriculumItemStatusBadge status={module.status} />
              <span className="text-caption text-muted-foreground shrink-0">
                {module.lessons.length} lesson{module.lessons.length === 1 ? '' : 's'}
                {module.estimatedDurationMinutes
                  ? ` · ${module.estimatedDurationMinutes.toString()} min`
                  : ''}
              </span>
            </button>
          </CollapsibleTrigger>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              onAddLesson(module)
            }}
          >
            <Plus className="size-3.5" />
            Add lesson
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for module ${module.title}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  onMoveModuleUp(module)
                }}
                disabled={isFirst}
              >
                <ArrowUpToLine />
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  onMoveModuleDown(module)
                }}
                disabled={isLast}
              >
                <ArrowDownToLine />
                Move down
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  onEditModule(module)
                }}
              >
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  onDuplicateModule(module)
                }}
              >
                <Copy />
                Duplicate
              </DropdownMenuItem>
              {module.status === 'DRAFT' && (
                <DropdownMenuItem
                  onSelect={() => {
                    onPublishModule(module)
                  }}
                >
                  <Send />
                  Publish
                </DropdownMenuItem>
              )}
              {module.status === 'PUBLISHED' && (
                <DropdownMenuItem
                  onSelect={() => {
                    onUnpublishModule(module)
                  }}
                >
                  <Undo2 />
                  Move to draft
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {module.status === 'ARCHIVED' ? (
                <DropdownMenuItem
                  onSelect={() => {
                    onRestoreModule(module)
                  }}
                >
                  <RotateCcw />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={() => {
                    onArchiveModule(module)
                  }}
                >
                  <Archive />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  onDeleteModule(module)
                }}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="px-3">
            {module.lessons.length === 0 ? (
              <EmptyState
                icon={Plus}
                title="This module has no lessons yet."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onAddLesson(module)
                    }}
                  >
                    Add lesson
                  </Button>
                }
              />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleLessonDragEnd}
              >
                <SortableContext
                  items={module.lessons.map((lesson) => lesson.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        index={lessonIndex}
                        isFirst={lessonIndex === 0}
                        isLast={lessonIndex === module.lessons.length - 1}
                        disabled={disabled}
                        {...lessonActions}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
