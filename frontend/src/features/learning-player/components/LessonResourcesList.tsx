import { FileText } from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { useResourceDeliveryUrl } from '@/features/student-portal'
import type { LessonResourceSummary } from '@/features/learning-player/types'

interface LessonResourcesListProps {
  resources: LessonResourceSummary[]
}

/** Reuses the exact same `/student/resources/:id/delivery-url` endpoint (and hook) the Resources page already uses — a lesson's attachments are the same `lesson_resources` rows, just scoped to one lesson here instead of listed course-wide. */
export function LessonResourcesList({ resources }: LessonResourcesListProps) {
  const deliveryUrl = useResourceDeliveryUrl()

  if (resources.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm font-semibold">Resources</p>
      <ul className="border-border divide-border flex flex-col divide-y rounded-lg border">
        {resources.map((resource) => (
          <li key={resource.id} className="flex items-center gap-3 px-3 py-2.5">
            <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm">{resource.title}</span>
            <Badge variant="outline" className="shrink-0">
              {resource.resourceType}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={deliveryUrl.isPending}
              onClick={() => {
                deliveryUrl.mutate(resource.id, {
                  onSuccess: (result) => {
                    window.open(result.url, '_blank', 'noopener,noreferrer')
                  },
                })
              }}
            >
              {resource.isDownloadable ? 'Download' : 'Open'}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
