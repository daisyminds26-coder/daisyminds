import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LaunchReadinessPanel } from '@/features/courses/curriculum/content/components/LaunchReadinessPanel'

const READY = {
  ready: true,
  courseMetadataReady: true,
  curriculumStructureReady: true,
  contentReady: true,
  blockers: [],
  summary: {
    publishedModuleCount: 1,
    publishedLessonCount: 1,
    publishedLessonsWithReadyContent: 1,
    publishedLessonsBlockingLaunch: 0,
  },
}

describe('LaunchReadinessPanel', () => {
  it('says "this course is ready" — never that it can accept students', () => {
    render(<LaunchReadinessPanel readiness={READY} isLoading={false} />)
    expect(screen.getByText(/this course is ready/i)).toBeInTheDocument()
    expect(screen.queryByText(/enrol/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/accept students/i)).not.toBeInTheDocument()
  })

  it('lists blockers across all three readiness layers when not ready', () => {
    render(
      <LaunchReadinessPanel
        readiness={{
          ...READY,
          ready: false,
          courseMetadataReady: false,
          contentReady: false,
          blockers: [
            { field: 'course.thumbnailUrl', message: 'A thumbnail image is required to publish' },
            {
              field: 'lessons.lesson-1',
              message: '"Welcome" is published but its content is not ready',
            },
          ],
        }}
        isLoading={false}
      />,
    )
    expect(screen.getByText('A thumbnail image is required to publish')).toBeInTheDocument()
    expect(
      screen.getByText('"Welcome" is published but its content is not ready'),
    ).toBeInTheDocument()
  })
})
