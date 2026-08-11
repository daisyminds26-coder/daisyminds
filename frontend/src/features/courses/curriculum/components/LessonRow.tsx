import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import {
  Archive,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  FileEdit,
  FolderInput,
  GripVertical,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { CurriculumItemStatusBadge } from '@/features/courses/curriculum/components/CurriculumItemStatusBadge'
import { LessonTypeBadge } from '@/features/courses/curriculum/components/LessonTypeBadge'
import { ContentStatusBadge } from '@/features/courses/curriculum/content/components/ContentStatusBadge'
import type { CurriculumLesson } from '@/features/courses/curriculum/types'

export interface LessonRowActions {
  onEdit: (lesson: CurriculumLesson) => void
  onDuplicate: (lesson: CurriculumLesson) => void
  onMove: (lesson: CurriculumLesson) => void
  onArchive: (lesson: CurriculumLesson) => void
  onRestore: (lesson: CurriculumLesson) => void
  onPublish: (lesson: CurriculumLesson) => void
  onUnpublish: (lesson: CurriculumLesson) => void
  onDelete: (lesson: CurriculumLesson) => void
  onMoveUp: (lesson: CurriculumLesson) => void
  onMoveDown: (lesson: CurriculumLesson) => void
}

interface LessonRowProps extends LessonRowActions {
  lesson: CurriculumLesson
  index: number
  isFirst: boolean
  isLast: boolean
  disabled: boolean
}

export function LessonRow({
  lesson,
  index,
  isFirst,
  isLast,
  disabled,
  onEdit,
  onDuplicate,
  onMove,
  onArchive,
  onRestore,
  onPublish,
  onUnpublish,
  onDelete,
  onMoveUp,
  onMoveDown,
}: LessonRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="border-border bg-background flex items-center gap-2 rounded-md border p-2 data-dragging:opacity-50"
      data-dragging={isDragging || undefined}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Move lesson ${String(index + 1)}: ${lesson.title}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <span className="text-caption text-muted-foreground w-5 shrink-0 text-center font-mono">
        {index + 1}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-body-sm truncate font-medium">{lesson.title}</span>
          {lesson.isMandatory && (
            <Badge variant="outline" className="text-caption">
              Mandatory
            </Badge>
          )}
          {lesson.isPreview && (
            <Badge variant="outline" className="text-caption">
              Preview
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <LessonTypeBadge lessonType={lesson.lessonType} />
          {lesson.estimatedDurationMinutes && (
            <span className="text-caption text-muted-foreground">
              {lesson.estimatedDurationMinutes} min
            </span>
          )}
          <CurriculumItemStatusBadge status={lesson.status} />
          <ContentStatusBadge status={lesson.contentStatus} />
        </div>
      </div>

      <Button type="button" variant="ghost" size="sm" className="gap-1.5" asChild>
        <Link
          to={`/admin/courses/${lesson.courseId}/curriculum/modules/${lesson.courseModuleId}/lessons/${lesson.id}/content`}
        >
          <FileEdit className="size-3.5" />
          Edit content
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for lesson ${lesson.title}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              onMoveUp(lesson)
            }}
            disabled={isFirst}
          >
            <ArrowUpToLine />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              onMoveDown(lesson)
            }}
            disabled={isLast}
          >
            <ArrowDownToLine />
            Move down
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              onMove(lesson)
            }}
          >
            <FolderInput />
            Move to module…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              onEdit(lesson)
            }}
          >
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              onDuplicate(lesson)
            }}
          >
            <Copy />
            Duplicate
          </DropdownMenuItem>
          {lesson.status === 'DRAFT' && (
            <DropdownMenuItem
              onSelect={() => {
                onPublish(lesson)
              }}
            >
              <Send />
              Publish
            </DropdownMenuItem>
          )}
          {lesson.status === 'PUBLISHED' && (
            <DropdownMenuItem
              onSelect={() => {
                onUnpublish(lesson)
              }}
            >
              <Undo2 />
              Move to draft
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {lesson.status === 'ARCHIVED' ? (
            <DropdownMenuItem
              onSelect={() => {
                onRestore(lesson)
              }}
            >
              <RotateCcw />
              Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => {
                onArchive(lesson)
              }}
            >
              <Archive />
              Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              onDelete(lesson)
            }}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
