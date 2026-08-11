import { useState } from 'react'

import { Modal } from '@/shared/components/overlays/modal'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import { useMoveLesson } from '@/features/courses/curriculum/hooks/use-lesson-mutations'
import type {
  CurriculumLesson,
  CurriculumModuleWithLessons,
} from '@/features/courses/curriculum/types'

interface MoveLessonDialogProps {
  courseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson: CurriculumLesson | undefined
  modules: readonly CurriculumModuleWithLessons[]
}

/**
 * The explicit, fully keyboard-accessible way to move a lesson between
 * modules — drag-and-drop for cross-module movement was deliberately not
 * built as a multi-container drop target (task's own "drag/drop must not
 * be the only way to reorder" requirement made this the primary path
 * rather than an alternative one, ARCHITECTURE.md §20).
 *
 * Local state is initialized straight from `lesson` at mount, with no
 * effect syncing it — the caller remounts this component (via a
 * `key={lesson?.id}`) whenever a different lesson becomes the move target,
 * which is the React-idiomatic way to reset state from a prop change
 * instead of `setState` inside a `useEffect`.
 */
export function MoveLessonDialog({
  courseId,
  open,
  onOpenChange,
  lesson,
  modules,
}: MoveLessonDialogProps) {
  const [targetModuleId, setTargetModuleId] = useState(lesson?.courseModuleId ?? '')
  const [targetPosition, setTargetPosition] = useState(lesson ? String(lesson.order) : '0')
  const moveLesson = useMoveLesson(courseId)

  if (!lesson) return null

  const targetModule = modules.find((module) => module.id === targetModuleId)
  const positionCount =
    targetModule && targetModuleId === lesson.courseModuleId
      ? targetModule.lessons.length
      : (targetModule?.lessons.length ?? 0) + 1

  function close() {
    onOpenChange(false)
  }

  function handleMove() {
    if (!lesson) return
    moveLesson.mutate(
      { lessonId: lesson.id, targetModuleId, targetOrder: Number(targetPosition) },
      {
        onSuccess: () => {
          toast.success('Lesson moved')
          close()
        },
        onError: (error) => toast.error('Could not move lesson', getSafeErrorMessage(error)),
      },
    )
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Move "${lesson.title}"`}
      footer={
        <>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" onClick={handleMove} disabled={moveLesson.isPending}>
            {moveLesson.isPending ? 'Moving…' : 'Move lesson'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="move-lesson-module">Module</Label>
          <Select value={targetModuleId} onValueChange={setTargetModuleId}>
            <SelectTrigger id="move-lesson-module" className="w-full">
              <SelectValue placeholder="Select a module" />
            </SelectTrigger>
            <SelectContent>
              {modules.map((module) => (
                <SelectItem key={module.id} value={module.id}>
                  {module.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="move-lesson-position">Position</Label>
          <Select value={targetPosition} onValueChange={setTargetPosition}>
            <SelectTrigger id="move-lesson-position" className="w-full">
              <SelectValue placeholder="Select a position" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: positionCount }, (_, index) => (
                <SelectItem key={index} value={String(index)}>
                  Position {index + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Modal>
  )
}
