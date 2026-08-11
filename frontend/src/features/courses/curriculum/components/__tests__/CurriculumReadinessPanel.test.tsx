import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CurriculumReadinessPanel } from '@/features/courses/curriculum/components/CurriculumReadinessPanel'
import { CurriculumItemStatusBadge } from '@/features/courses/curriculum/components/CurriculumItemStatusBadge'
import { LessonTypeBadge } from '@/features/courses/curriculum/components/LessonTypeBadge'

describe('CurriculumReadinessPanel', () => {
  it('shows "Curriculum structure ready" — never "course ready to launch"', () => {
    render(
      <CurriculumReadinessPanel
        readiness={{
          ready: true,
          blockers: [],
          summary: {
            moduleCount: 2,
            publishedModuleCount: 1,
            draftModuleCount: 1,
            lessonCount: 5,
            publishedLessonCount: 3,
            draftLessonCount: 2,
          },
        }}
        isLoading={false}
      />,
    )

    expect(screen.getByText('Curriculum structure ready')).toBeInTheDocument()
    expect(screen.queryByText(/ready to launch/i)).not.toBeInTheDocument()
  })

  it('lists every structural blocker when not ready', () => {
    render(
      <CurriculumReadinessPanel
        readiness={{
          ready: false,
          blockers: [
            { field: 'modules', message: 'At least one module is required' },
            { field: 'lessons', message: 'At least one lesson is required' },
          ],
          summary: {
            moduleCount: 0,
            publishedModuleCount: 0,
            draftModuleCount: 0,
            lessonCount: 0,
            publishedLessonCount: 0,
            draftLessonCount: 0,
          },
        }}
        isLoading={false}
      />,
    )

    expect(screen.getByText('At least one module is required')).toBeInTheDocument()
    expect(screen.getByText('At least one lesson is required')).toBeInTheDocument()
  })
})

describe('CurriculumItemStatusBadge', () => {
  it('renders a human label for each status', () => {
    const { rerender } = render(<CurriculumItemStatusBadge status="DRAFT" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
    rerender(<CurriculumItemStatusBadge status="PUBLISHED" />)
    expect(screen.getByText('Published')).toBeInTheDocument()
    rerender(<CurriculumItemStatusBadge status="ARCHIVED" />)
    expect(screen.getByText('Archived')).toBeInTheDocument()
  })
})

describe('LessonTypeBadge', () => {
  it('renders a human label for a lesson type', () => {
    render(<LessonTypeBadge lessonType="LIVE_CLASS" />)
    expect(screen.getByText('Live class')).toBeInTheDocument()
  })
})
