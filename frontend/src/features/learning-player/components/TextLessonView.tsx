import { LessonResourcesList } from '@/features/learning-player/components/LessonResourcesList'
import { LessonTextContent } from '@/features/learning-player/components/LessonTextContent'
import { MarkCompleteButton } from '@/features/learning-player/components/MarkCompleteButton'
import type { LessonDetail } from '@/features/learning-player/types'

export function TextLessonView({ lesson }: { lesson: LessonDetail }) {
  return (
    <div className="flex flex-col gap-6">
      <LessonTextContent html={lesson.textContent ?? ''} />
      <LessonResourcesList resources={lesson.resources} />
      <MarkCompleteButton
        courseId={lesson.courseId}
        lessonId={lesson.id}
        status={lesson.progress?.status}
      />
    </div>
  )
}
