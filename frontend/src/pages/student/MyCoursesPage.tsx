import { BookOpen } from 'lucide-react'

import { PageContainer } from '@/shared/components/containers/page-container'
import { Card, CardContent } from '@/shared/components/ui/card'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { ListSkeleton } from '@/shared/components/feedback/skeletons'
import { CourseCard, useStudentEnrollments } from '@/features/student-portal'

export default function MyCoursesPage() {
  const { data, isLoading, isError, refetch } = useStudentEnrollments()

  return (
    <PageContainer
      title="My Courses"
      description="Every course you're enrolled in, past and present."
    >
      {isError && <ErrorState title="Couldn't load your courses" onRetry={() => void refetch()} />}

      {isLoading && <ListSkeleton rows={4} />}

      {data && (
        <>
          {data.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={BookOpen}
                  title="You don't have any courses yet"
                  description="Once you're enrolled in a batch, your courses will appear here."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.map((enrollment) => (
                <CourseCard key={enrollment.id} enrollment={enrollment} />
              ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}
