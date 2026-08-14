import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronLeft, Menu, PartyPopper } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { PageLoader } from '@/shared/components/feedback/page-loader'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { CourseProgressBar } from '@/features/student-portal/components/CourseProgressBar'
import { useStudentCourse } from '@/features/student-portal'
import { LessonContentPane } from '@/features/learning-player/components/LessonContentPane'
import { PlayerCurriculumList } from '@/features/learning-player/components/PlayerCurriculumList'
import { useLessonDetail } from '@/features/learning-player/hooks/use-lesson-detail'

/**
 * The Learning Player — desktop: curriculum sidebar + main lesson pane,
 * side by side. Mobile: full-width content, curriculum reached through a
 * Sheet drawer, sticky Previous/Next at the bottom. One coherent
 * experience, not a squeezed-down desktop layout (task's own explicit
 * instruction).
 */
export default function StudentLearningPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false)

  const course = useStudentCourse(courseId)
  const lesson = useLessonDetail(courseId, lessonId)

  if (course.isLoading || lesson.isLoading) return <PageLoader />

  if (course.isError || !course.data) {
    return <ErrorState title="Couldn't load this course" onRetry={() => void course.refetch()} />
  }
  if (lesson.isError || !lesson.data) {
    return <ErrorState title="Couldn't load this lesson" onRetry={() => void lesson.refetch()} />
  }

  const { data: courseData } = course
  const { data: lessonData } = lesson
  const curriculum = (
    <PlayerCurriculumList
      courseId={courseData.id}
      modules={courseData.modules}
      currentLessonId={lessonData.id}
      onNavigate={() => {
        setIsCurriculumOpen(false)
      }}
    />
  )

  return (
    <div className="bg-background flex min-h-svh flex-col">
      <header className="border-border bg-background/95 sticky top-0 z-20 flex flex-col gap-2 border-b px-4 py-3 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to course overview">
            <Link to={`/student/courses/${courseData.id}`}>
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-caption text-muted-foreground truncate">{courseData.title}</p>
            <p className="truncate font-semibold">{lessonData.title}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 lg:hidden"
            onClick={() => {
              setIsCurriculumOpen(true)
            }}
          >
            <Menu className="size-4" aria-hidden="true" />
            Curriculum
          </Button>
        </div>
        <CourseProgressBar progress={courseData.courseProgress} compact />
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6 md:px-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24">{curriculum}</div>
        </aside>

        <main className="min-w-0 flex-1 pb-20 lg:pb-6">
          <LessonContentPane lesson={lessonData} />

          <LessonNavigationFooter
            courseId={courseData.id}
            lesson={lessonData}
            isComplete={courseData.courseProgress.isComplete}
          />
        </main>
      </div>

      <Sheet open={isCurriculumOpen} onOpenChange={setIsCurriculumOpen}>
        <SheetContent side="left" className="w-80 overflow-y-auto p-4">
          <SheetHeader className="px-0">
            <SheetTitle>Curriculum</SheetTitle>
          </SheetHeader>
          {curriculum}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function LessonNavigationFooter({
  courseId,
  lesson,
  isComplete,
}: {
  courseId: string
  lesson: NonNullable<ReturnType<typeof useLessonDetail>['data']>
  isComplete: boolean
}) {
  const { previousLessonId, nextLessonId } = lesson.navigation

  if (!nextLessonId && isComplete) {
    return (
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <PartyPopper className="text-primary size-8" aria-hidden="true" />
          <p className="font-semibold">Course learning complete</p>
          <p className="text-body-sm text-muted-foreground">
            You've completed every required lesson in this course.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t px-4 py-3 backdrop-blur-sm lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
      {previousLessonId ? (
        <Button asChild variant="outline" className="gap-2">
          <Link to={`/student/courses/${courseId}/learn/${previousLessonId}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Previous
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {nextLessonId ? (
        <Button asChild className="gap-2">
          <Link to={`/student/courses/${courseId}/learn/${nextLessonId}`}>
            Next
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </div>
  )
}
