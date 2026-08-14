import { useState } from 'react'
import { FileText } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { SectionContainer } from '@/shared/components/containers/section-container'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { useResourceDeliveryUrl, useStudentResources } from '@/features/student-portal'
import type { StudentResource } from '@/features/student-portal'

function groupByCourse(resources: StudentResource[]): Map<string, StudentResource[]> {
  const groups = new Map<string, StudentResource[]>()
  for (const resource of resources) {
    const existing = groups.get(resource.courseTitle) ?? []
    existing.push(resource)
    groups.set(resource.courseTitle, existing)
  }
  return groups
}

function ResourceRow({ resource }: { resource: StudentResource }) {
  const deliveryUrl = useResourceDeliveryUrl()
  const [openingId, setOpeningId] = useState<string | null>(null)

  return (
    <li className="flex items-center gap-3 py-3">
      <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{resource.title}</p>
        <p className="text-caption text-muted-foreground truncate">{resource.lessonTitle}</p>
      </div>
      <Badge variant="outline" className="shrink-0">
        {resource.resourceType}
      </Badge>
      <Button
        size="sm"
        variant="outline"
        disabled={deliveryUrl.isPending && openingId === resource.id}
        onClick={() => {
          setOpeningId(resource.id)
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
  )
}

export default function StudentResourcesPage() {
  const { data, isLoading, isError, refetch } = useStudentResources()

  return (
    <PageContainer title="Resources" description="Downloadable materials from your active courses.">
      {isError && (
        <ErrorState title="Couldn't load your resources" onRetry={() => void refetch()} />
      )}

      {isLoading && <ListSkeleton rows={4} />}

      {data && (
        <>
          {data.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={FileText}
                  title="No learning resources are available yet"
                  description="Materials shared for your active courses will appear here."
                />
              </CardContent>
            </Card>
          ) : (
            Array.from(groupByCourse(data)).map(([courseTitle, resources]) => (
              <SectionContainer key={courseTitle} title={courseTitle}>
                <Card>
                  <CardContent className="divide-border divide-y pt-2">
                    <ul className="divide-border divide-y">
                      {resources.map((resource) => (
                        <ResourceRow key={resource.id} resource={resource} />
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </SectionContainer>
            ))
          )}
        </>
      )}
    </PageContainer>
  )
}
