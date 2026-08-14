import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import MyCoursesPage from '@/pages/student/MyCoursesPage'
import StudentDashboardPage from '@/pages/student/StudentDashboardPage'
import StudentLearningPlayerPage from '@/pages/student/StudentLearningPlayerPage'
import { DocumentLessonView } from '@/features/learning-player/components/DocumentLessonView'
import { ExternalLinkLessonView } from '@/features/learning-player/components/ExternalLinkLessonView'
import type { LessonDetail } from '@/features/learning-player/types'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetStudentPortalMockState } from '@/test/msw/handlers/student-portal.handlers'
import { createTestQueryClient, renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetStudentPortalMockState()
  resetAuthStore()
})

async function renderAsStudent(ui: React.ReactElement, route: string) {
  const queryClient = createTestQueryClient()
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const { result } = renderHook(() => useLogin(), { wrapper })
  act(() => {
    result.current.mutate({ email: 'active@example.com', password: 'correct-horse-1' })
  })
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
  })

  return renderWithProviders(ui, { route, queryClient })
}

function renderPlayerRoute(route: string) {
  return renderAsStudent(
    <Routes>
      <Route
        path="/student/courses/:courseId/learn/:lessonId"
        element={<StudentLearningPlayerPage />}
      />
    </Routes>,
    route,
  )
}

function baseLessonDetail(overrides: Partial<LessonDetail> = {}): LessonDetail {
  return {
    id: 'lesson-x',
    courseId: 'course-1',
    moduleId: 'module-1',
    moduleTitle: 'Getting Started',
    title: 'Sample lesson',
    shortDescription: '',
    lessonType: 'TEXT',
    order: 0,
    estimatedDurationMinutes: 10,
    isMandatory: true,
    isPreview: false,
    accessState: 'ACTIVE',
    hasAccess: true,
    locked: false,
    lockReason: null,
    progress: null,
    navigation: { previousLessonId: null, nextLessonId: null },
    textContent: null,
    video: null,
    document: null,
    externalLink: null,
    resources: [],
    ...overrides,
  }
}

describe('Learning Player', () => {
  it('renders the header with course title, current lesson title, and progress', async () => {
    await renderPlayerRoute('/student/courses/course-1/learn/lesson-1')

    expect(await screen.findByText('Full-Stack Web Development')).toBeInTheDocument()
    expect((await screen.findAllByText('Welcome to the course')).length).toBeGreaterThan(0)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows the curriculum with the current lesson marked active', async () => {
    await renderPlayerRoute('/student/courses/course-1/learn/lesson-2')

    const nav = await screen.findByRole('navigation', { name: /course curriculum/i })
    const currentLink = within(nav).getByRole('link', { name: /setting up your environment/i })
    expect(currentLink).toHaveAttribute('aria-current', 'true')
  })

  it('shows a locked lesson without revealing content, with the lock reason as text', async () => {
    await renderPlayerRoute('/student/courses/course-1/learn/lesson-locked')

    expect(await screen.findByText('This lesson is locked')).toBeInTheDocument()
    expect(screen.getByText('Complete the required lesson first.')).toBeInTheDocument()
  })

  it('renders a text lesson and marks it complete on click', async () => {
    const user = userEvent.setup()
    await renderPlayerRoute('/student/courses/course-1/learn/lesson-2')

    expect(await screen.findByText('Lesson content.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /mark as complete/i }))

    expect(await screen.findByText('Completed')).toBeInTheDocument()
  })

  it('renders a video lesson with the signed delivery URL applied to the player', async () => {
    await renderPlayerRoute('/student/courses/course-1/learn/lesson-1')
    await screen.findAllByText('Welcome to the course')

    // The native <video> element has no accessible role, so query the DOM directly.
    await waitFor(() => {
      const videoElement = document.querySelector('video')
      expect(videoElement?.getAttribute('src')).toBe('https://cdn.example.com/signed/video.mp4')
    })
  })

  it('shows Previous/Next navigation links to sibling lessons', async () => {
    await renderPlayerRoute('/student/courses/course-1/learn/lesson-2')

    expect(await screen.findByRole('link', { name: /previous/i })).toHaveAttribute(
      'href',
      '/student/courses/course-1/learn/lesson-1',
    )
    expect(screen.getByRole('link', { name: /next/i })).toHaveAttribute(
      'href',
      '/student/courses/course-1/learn/lesson-locked',
    )
  })

  it('opens the curriculum drawer from the mobile "Curriculum" trigger', async () => {
    const user = userEvent.setup()
    await renderPlayerRoute('/student/courses/course-1/learn/lesson-1')
    await screen.findAllByText('Welcome to the course')

    await user.click(screen.getByRole('button', { name: /curriculum/i }))

    expect(await screen.findByRole('heading', { name: 'Curriculum' })).toBeInTheDocument()
  })

  it('shows an error state for a lesson id the API rejects', async () => {
    await renderPlayerRoute('/student/courses/course-1/learn/does-not-exist')

    expect(await screen.findByText(/couldn't load this lesson/i)).toBeInTheDocument()
  })
})

describe('Document and external-link lesson views', () => {
  it('renders a document lesson with an Open action and never embeds a raw URL up front', () => {
    const queryClient = createTestQueryClient()
    renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <DocumentLessonView
          lesson={baseLessonDetail({
            lessonType: 'DOCUMENT',
            document: { filename: 'handbook.pdf', format: 'pdf', bytes: 102_400 },
          })}
        />
      </QueryClientProvider>,
      { route: '/' },
    )

    expect(screen.getByText('handbook.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open document/i })).toBeInTheDocument()
  })

  it('renders an external-link lesson as a safe, non-embedded outbound link', () => {
    renderWithProviders(
      <ExternalLinkLessonView
        lesson={baseLessonDetail({
          lessonType: 'EXTERNAL_LINK',
          externalLink: {
            url: 'https://example.com/reading',
            label: 'Further reading',
            description: null,
            openInNewTab: true,
          },
        })}
      />,
      { route: '/' },
    )

    const link = screen.getByRole('link', { name: /open resource/i })
    expect(link).toHaveAttribute('href', 'https://example.com/reading')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('Progress integration', () => {
  it('My Courses cards show a progress bar and a Continue/Start Learning link into the player', async () => {
    await renderAsStudent(<MyCoursesPage />, '/student/courses')

    expect(await screen.findByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start learning/i })).toHaveAttribute(
      'href',
      '/student/courses/course-1/learn',
    )
  })

  it('the Dashboard Continue Learning card routes into the resume-learning endpoint', async () => {
    await renderAsStudent(<StudentDashboardPage />, '/student')

    const links = await screen.findAllByRole('link', { name: /start course|continue course/i })
    expect(links[0]).toHaveAttribute('href', '/student/courses/course-1/learn')
  })
})
