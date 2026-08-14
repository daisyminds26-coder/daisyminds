import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDot,
  ClipboardCheck,
  FileText,
  Link2,
  Lock,
  PenSquare,
  Radio,
  Video,
} from 'lucide-react'

import { Card } from '@/shared/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import { Badge } from '@/shared/components/ui/badge'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { cn } from '@/shared/lib/utils'
import type { LessonType, StudentModule } from '@/features/student-portal/types'

const LESSON_TYPE_ICONS: Record<LessonType, typeof Video> = {
  VIDEO: Video,
  TEXT: FileText,
  DOCUMENT: FileText,
  EXTERNAL_LINK: Link2,
  LIVE_CLASS: Radio,
  QUIZ: ClipboardCheck,
  ASSIGNMENT: PenSquare,
}

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  VIDEO: 'Video',
  TEXT: 'Reading',
  DOCUMENT: 'Document',
  EXTERNAL_LINK: 'External link',
  LIVE_CLASS: 'Live class',
  QUIZ: 'Quiz',
  ASSIGNMENT: 'Assignment',
}

const PROGRESS_ICON = {
  COMPLETED: CheckCircle2,
  IN_PROGRESS: CircleDot,
  NOT_STARTED: Circle,
} as const
const PROGRESS_LABEL = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In progress',
  NOT_STARTED: 'Not started',
} as const

function ModuleDisclosure({
  courseId,
  module,
  defaultOpen,
}: {
  courseId: string
  module: StudentModule
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card className="gap-0 py-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            aria-expanded={open}
          >
            <ChevronDown
              className={cn(
                'text-muted-foreground size-4 shrink-0 transition-transform',
                !open && '-rotate-90',
              )}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate font-semibold">{module.title}</span>
            <span className="text-caption text-muted-foreground shrink-0">
              {module.lessons.length} lesson{module.lessons.length === 1 ? '' : 's'}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="border-border flex flex-col border-t">
            {module.lessons.map((lesson) => {
              const TypeIcon = LESSON_TYPE_ICONS[lesson.lessonType]
              const ProgressIcon = PROGRESS_ICON[lesson.progressStatus]
              const rowContent = (
                <>
                  {lesson.locked ? (
                    <Lock className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <ProgressIcon
                      className={cn(
                        'size-4 shrink-0',
                        lesson.progressStatus === 'COMPLETED'
                          ? 'text-success'
                          : 'text-muted-foreground',
                      )}
                      aria-label={PROGRESS_LABEL[lesson.progressStatus]}
                    />
                  )}
                  <TypeIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm">{lesson.title}</span>
                  <Badge variant="outline" className="shrink-0">
                    {LESSON_TYPE_LABELS[lesson.lessonType]}
                  </Badge>
                  {lesson.estimatedDurationMinutes && (
                    <span className="text-caption text-muted-foreground shrink-0">
                      {lesson.estimatedDurationMinutes} min
                    </span>
                  )}
                </>
              )

              return (
                <li key={lesson.id} className="border-border/60 border-t first:border-t-0">
                  {lesson.locked ? (
                    <span
                      className="text-muted-foreground flex items-center gap-3 px-4 py-3 opacity-70"
                      aria-label={`${lesson.title} — locked, ${lesson.lockReason ?? 'complete the required lesson first'}`}
                    >
                      {rowContent}
                    </span>
                  ) : (
                    <Link
                      to={`/student/courses/${courseId}/learn/${lesson.id}`}
                      className="hover:bg-muted flex items-center gap-3 px-4 py-3"
                    >
                      {rowContent}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

interface CurriculumAccordionProps {
  courseId: string
  modules: StudentModule[]
}

/** Curriculum viewer with real progress/lock state — each unlocked lesson is a direct link into the Learning Player. */
export function CurriculumAccordion({ courseId, modules }: CurriculumAccordionProps) {
  if (modules.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Curriculum isn't available for this course yet"
        description="Check back soon — modules and lessons will appear here once they're published."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {modules.map((module, index) => (
        <ModuleDisclosure
          key={module.id}
          courseId={courseId}
          module={module}
          defaultOpen={index === 0}
        />
      ))}
    </div>
  )
}
