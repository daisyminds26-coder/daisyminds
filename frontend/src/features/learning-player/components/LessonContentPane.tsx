import { Award } from 'lucide-react'

import { EmptyState } from '@/shared/components/feedback/empty-state'
import { Card, CardContent } from '@/shared/components/ui/card'
import { DocumentLessonView } from '@/features/learning-player/components/DocumentLessonView'
import { ExternalLinkLessonView } from '@/features/learning-player/components/ExternalLinkLessonView'
import {
  LockedLessonView,
  NoAccessLessonView,
} from '@/features/learning-player/components/LessonAccessStates'
import { TextLessonView } from '@/features/learning-player/components/TextLessonView'
import { VideoLessonPlayer } from '@/features/learning-player/components/VideoLessonPlayer'
import type { LessonDetail } from '@/features/learning-player/types'

/** Dispatches to the right lesson-type renderer — the one place that decides what a lesson "is," so no other component needs its own `lessonType` switch. */
export function LessonContentPane({ lesson }: { lesson: LessonDetail }) {
  if (!lesson.hasAccess) return <NoAccessLessonView accessState={lesson.accessState} />
  if (lesson.locked) return <LockedLessonView reason={lesson.lockReason} />

  switch (lesson.lessonType) {
    case 'VIDEO':
      return <VideoLessonPlayer lesson={lesson} />
    case 'TEXT':
      return <TextLessonView lesson={lesson} />
    case 'DOCUMENT':
      return <DocumentLessonView lesson={lesson} />
    case 'EXTERNAL_LINK':
      return <ExternalLinkLessonView lesson={lesson} />
    case 'QUIZ':
    case 'ASSIGNMENT':
    case 'LIVE_CLASS':
      return (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Award}
              title="Available in a later phase"
              description="This lesson type isn't part of the Learning Player yet."
            />
          </CardContent>
        </Card>
      )
  }
}
