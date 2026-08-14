import { ExternalLink } from 'lucide-react'

import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { LessonResourcesList } from '@/features/learning-player/components/LessonResourcesList'
import { MarkCompleteButton } from '@/features/learning-player/components/MarkCompleteButton'
import type { LessonDetail } from '@/features/learning-player/types'

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/** Never embeds the destination in an iframe (task's own explicit instruction) — always a plain outbound link, always `noopener noreferrer`. */
export function ExternalLinkLessonView({ lesson }: { lesson: LessonDetail }) {
  const link = lesson.externalLink

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <p className="font-semibold">{link?.label ?? lesson.title}</p>
          {link?.description && (
            <p className="text-body-sm text-muted-foreground">{link.description}</p>
          )}
          {link && (
            <>
              <p className="text-caption text-muted-foreground">{safeHostname(link.url)}</p>
              <Button asChild className="w-fit gap-2">
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  Open resource
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              </Button>
            </>
          )}
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
