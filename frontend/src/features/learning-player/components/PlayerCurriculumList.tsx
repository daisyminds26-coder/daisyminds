import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronDown, Circle, CircleDot, Lock } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import { cn } from '@/shared/lib/utils'
import type { StudentModule } from '@/features/student-portal/types'

const STATUS_ICON = {
  COMPLETED: CheckCircle2,
  IN_PROGRESS: CircleDot,
  NOT_STARTED: Circle,
} as const

const STATUS_LABEL = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In progress',
  NOT_STARTED: 'Not started',
} as const

interface PlayerCurriculumListProps {
  courseId: string
  modules: StudentModule[]
  currentLessonId: string
  onNavigate?: () => void
}

/** The one curriculum-with-progress renderer, reused by the desktop sidebar and the mobile Sheet drawer — active-lesson highlighting and lock/complete iconography can't drift between the two this way. */
export function PlayerCurriculumList({
  courseId,
  modules,
  currentLessonId,
  onNavigate,
}: PlayerCurriculumListProps) {
  const [openModuleIds, setOpenModuleIds] = useState<Set<string>>(() => {
    const containingModule = modules.find((module) =>
      module.lessons.some((lesson) => lesson.id === currentLessonId),
    )
    return new Set(containingModule ? [containingModule.id] : [modules[0]?.id ?? ''])
  })

  return (
    <nav aria-label="Course curriculum" className="flex flex-col gap-2">
      {modules.map((module) => {
        const isOpen = openModuleIds.has(module.id)
        return (
          <Collapsible
            key={module.id}
            open={isOpen}
            onOpenChange={(open) => {
              setOpenModuleIds((current) => {
                const next = new Set(current)
                if (open) next.add(module.id)
                else next.delete(module.id)
                return next
              })
            }}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-2 text-left"
                aria-expanded={isOpen}
              >
                <ChevronDown
                  className={cn(
                    'text-muted-foreground size-4 shrink-0 transition-transform',
                    !isOpen && '-rotate-90',
                  )}
                  aria-hidden="true"
                />
                <span className="truncate text-sm font-semibold">{module.title}</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="flex flex-col gap-0.5 py-1 pl-6">
                {module.lessons.map((lesson) => {
                  const isCurrent = lesson.id === currentLessonId
                  const StatusIcon = STATUS_ICON[lesson.progressStatus]
                  return (
                    <li key={lesson.id}>
                      {lesson.locked ? (
                        <span
                          className="text-muted-foreground flex items-center gap-2 rounded-md px-2 py-2 text-sm opacity-60"
                          aria-label={`${lesson.title} — locked, ${lesson.lockReason ?? 'complete the required lesson first'}`}
                        >
                          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{lesson.title}</span>
                        </span>
                      ) : (
                        <Link
                          to={`/student/courses/${courseId}/learn/${lesson.id}`}
                          onClick={onNavigate}
                          aria-current={isCurrent ? 'true' : undefined}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                            isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground',
                          )}
                        >
                          <StatusIcon
                            className={cn(
                              'size-3.5 shrink-0',
                              lesson.progressStatus === 'COMPLETED' && !isCurrent && 'text-success',
                            )}
                            aria-label={STATUS_LABEL[lesson.progressStatus]}
                          />
                          <span className="truncate">{lesson.title}</span>
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </nav>
  )
}
