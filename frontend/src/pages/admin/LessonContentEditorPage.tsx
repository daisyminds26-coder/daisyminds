import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { useCurriculum } from '@/features/courses/curriculum/hooks/use-curriculum'
import { CurriculumItemStatusBadge } from '@/features/courses/curriculum/components/CurriculumItemStatusBadge'
import { LessonTypeBadge } from '@/features/courses/curriculum/components/LessonTypeBadge'
import { ContentStatusBadge } from '@/features/courses/curriculum/content/components/ContentStatusBadge'
import { ContentReadinessPanel } from '@/features/courses/curriculum/content/components/ContentReadinessPanel'
import { TextContentEditor } from '@/features/courses/curriculum/content/components/TextContentEditor'
import { ExternalLinkEditor } from '@/features/courses/curriculum/content/components/ExternalLinkEditor'
import { VideoContentEditor } from '@/features/courses/curriculum/content/components/VideoContentEditor'
import { DocumentContentEditor } from '@/features/courses/curriculum/content/components/DocumentContentEditor'
import { ResourceManager } from '@/features/courses/curriculum/content/components/ResourceManager'
import {
  useContentReadiness,
  useLessonContent,
} from '@/features/courses/curriculum/content/hooks/use-lesson-content'

export default function LessonContentEditorPage() {
  const {
    courseId = '',
    moduleId = '',
    lessonId = '',
  } = useParams<{
    courseId: string
    moduleId: string
    lessonId: string
  }>()

  const curriculumQuery = useCurriculum(courseId)
  const contentQuery = useLessonContent({ courseId, moduleId, lessonId })
  const readinessQuery = useContentReadiness({ courseId, moduleId, lessonId })

  if (curriculumQuery.isLoading || contentQuery.isLoading) return <PageLoader />

  if (curriculumQuery.isError) {
    return (
      <ErrorState
        description={getSafeErrorMessage(curriculumQuery.error)}
        onRetry={() => void curriculumQuery.refetch()}
      />
    )
  }
  if (contentQuery.isError || !contentQuery.data) {
    return (
      <ErrorState
        description={getSafeErrorMessage(contentQuery.error)}
        onRetry={() => void contentQuery.refetch()}
      />
    )
  }

  const module = curriculumQuery.data?.modules.find((m) => m.id === moduleId)
  const lesson = module?.lessons.find((l) => l.id === lessonId)
  const content = contentQuery.data

  if (!module || !lesson) {
    return <ErrorState description="This lesson could not be found." />
  }

  return (
    <PageContainer
      title={lesson.title}
      description={`${module.title} · Lesson content`}
      actions={
        <Link
          to={`/admin/courses/${courseId}/curriculum`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back to curriculum
        </Link>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <LessonTypeBadge lessonType={lesson.lessonType} />
        <CurriculumItemStatusBadge status={lesson.status} />
        <ContentStatusBadge status={content.contentStatus} />
      </div>

      <ContentReadinessPanel readiness={readinessQuery.data} isLoading={readinessQuery.isLoading} />

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          {lesson.lessonType === 'TEXT' && (
            <TextContentEditor
              textContent={content.textContent}
              courseId={courseId}
              moduleId={moduleId}
              lessonId={lessonId}
            />
          )}
          {lesson.lessonType === 'EXTERNAL_LINK' && (
            <ExternalLinkEditor
              externalLink={content.externalLink}
              courseId={courseId}
              moduleId={moduleId}
              lessonId={lessonId}
            />
          )}
          {lesson.lessonType === 'VIDEO' && (
            <VideoContentEditor
              videoAsset={content.videoAsset}
              courseId={courseId}
              moduleId={moduleId}
              lessonId={lessonId}
            />
          )}
          {lesson.lessonType === 'DOCUMENT' && (
            <DocumentContentEditor
              documentAsset={content.documentAsset}
              courseId={courseId}
              moduleId={moduleId}
              lessonId={lessonId}
            />
          )}
          {(lesson.lessonType === 'QUIZ' ||
            lesson.lessonType === 'ASSIGNMENT' ||
            lesson.lessonType === 'LIVE_CLASS') && (
            <div className="border-border text-body-sm text-muted-foreground rounded-md border border-dashed p-6 text-center">
              {lesson.lessonType === 'QUIZ' && 'Quiz authoring is coming in a future phase.'}
              {lesson.lessonType === 'ASSIGNMENT' &&
                'Assignment authoring is coming in a future phase.'}
              {lesson.lessonType === 'LIVE_CLASS' &&
                'Live class scheduling is coming in a future phase.'}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Downloadable resources</CardTitle>
        </CardHeader>
        <CardContent>
          <ResourceManager courseId={courseId} moduleId={moduleId} lessonId={lessonId} />
        </CardContent>
      </Card>
    </PageContainer>
  )
}
