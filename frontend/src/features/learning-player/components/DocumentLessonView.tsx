import { FileText } from 'lucide-react'

import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { LessonResourcesList } from '@/features/learning-player/components/LessonResourcesList'
import { MarkCompleteButton } from '@/features/learning-player/components/MarkCompleteButton'
import { useLessonMediaUrl } from '@/features/learning-player/hooks/use-lesson-media-url'
import type { LessonDetail } from '@/features/learning-player/types'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Never proxies the file through this app — a short-lived signed URL, fetched only when the student clicks Open, is opened directly in a new tab. */
export function DocumentLessonView({ lesson }: { lesson: LessonDetail }) {
  const mediaUrl = useLessonMediaUrl()

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg">
            <FileText className="text-muted-foreground size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{lesson.document?.filename ?? lesson.title}</p>
            {lesson.document && (
              <p className="text-caption text-muted-foreground">
                {lesson.document.format.toUpperCase()} · {formatBytes(lesson.document.bytes)}
              </p>
            )}
          </div>
          <Button
            disabled={mediaUrl.isPending}
            onClick={() => {
              mediaUrl.mutate(
                { courseId: lesson.courseId, lessonId: lesson.id },
                {
                  onSuccess: (result) => {
                    window.open(result.url, '_blank', 'noopener,noreferrer')
                  },
                },
              )
            }}
          >
            {mediaUrl.isPending ? 'Opening…' : 'Open document'}
          </Button>
        </CardContent>
      </Card>

      <LessonResourcesList resources={lesson.resources} />
      <MarkCompleteButton
        courseId={lesson.courseId}
        lessonId={lesson.id}
        status={lesson.progress?.status}
      />
    </div>
  )
}
