import {
  ClipboardList,
  ExternalLink,
  FileText,
  HelpCircle,
  Radio,
  Type,
  Video,
  type LucideIcon,
} from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'
import type { LessonType } from '@/features/courses/curriculum/types'

const LESSON_TYPE_ICON: Record<LessonType, LucideIcon> = {
  VIDEO: Video,
  TEXT: Type,
  DOCUMENT: FileText,
  LIVE_CLASS: Radio,
  QUIZ: HelpCircle,
  ASSIGNMENT: ClipboardList,
  EXTERNAL_LINK: ExternalLink,
}

const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  VIDEO: 'Video',
  TEXT: 'Text',
  DOCUMENT: 'Document',
  LIVE_CLASS: 'Live class',
  QUIZ: 'Quiz',
  ASSIGNMENT: 'Assignment',
  EXTERNAL_LINK: 'External link',
}

export function LessonTypeBadge({ lessonType }: { lessonType: LessonType }) {
  const Icon = LESSON_TYPE_ICON[lessonType]
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="size-3" />
      {LESSON_TYPE_LABEL[lessonType]}
    </Badge>
  )
}
