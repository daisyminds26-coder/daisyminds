import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import StudentDashboardPage from '@/pages/student/StudentDashboardPage'
import MyCoursesPage from '@/pages/student/MyCoursesPage'
import StudentCourseOverviewPage from '@/pages/student/StudentCourseOverviewPage'
import StudentSchedulePage from '@/pages/student/StudentSchedulePage'
import StudentResourcesPage from '@/pages/student/StudentResourcesPage'
import StudentProfilePage from '@/pages/student/StudentProfilePage'
import { StudentBottomNav } from '@/shared/components/layout/student-bottom-nav'
import { studentNavigation } from '@/shared/config/navigation'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import {
  resetStudentPortalMockState,
  setStudentPortalEmptyState,
} from '@/test/msw/handlers/student-portal.handlers'
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

describe('Student dashboard', () => {
  it('shows the continue-learning course and the My Courses strip', async () => {
    await renderAsStudent(<StudentDashboardPage />, '/student')

    expect((await screen.findAllByText('Full-Stack Web Development')).length).toBeGreaterThan(0)
    // Phase 11B: the CTA reads "Start course" until the student has a real
    // `lastAccessedLessonId` (backend-computed), then switches to "Continue course".
    expect(
      await screen.findByRole('link', { name: /start course|continue course/i }),
    ).toBeInTheDocument()
  })

  it('shows an honest empty state when the student has no active course', async () => {
    setStudentPortalEmptyState()
    await renderAsStudent(<StudentDashboardPage />, '/student')

    expect(await screen.findByText(/don't have an active course yet/i)).toBeInTheDocument()
  })
})

describe('My Courses', () => {
  it('renders every Enrolllled course as a card', async () => {
    await renderAsStudent(<MyCoursesPage />, '/student/courses')

    expect(await screen.findByText('Full-Stack Web Development')).toBeInTheDocument()
    expect(screen.getByText('Evening Batch — Jan 2026')).toBeInTheDocument()
  })
})

describe('Course overview', () => {
  it("shows the course header and the entitled student's curriculum", async () => {
    await renderAsStudent(
      <Routes>
        <Route path="/student/courses/:courseId" element={<StudentCourseOverviewPage />} />
      </Routes>,
      '/student/courses/course-1',
    )

    expect(await screen.findByText('Getting Started')).toBeInTheDocument()
    expect(screen.getByText('Welcome to the course')).toBeInTheDocument()
  })

  it('renders a not-found state for a course id the API rejects', async () => {
    await renderAsStudent(
      <Routes>
        <Route path="/student/courses/:courseId" element={<StudentCourseOverviewPage />} />
      </Routes>,
      '/student/courses/does-not-exist',
    )

    expect(await screen.findByText(/course not found/i)).toBeInTheDocument()
  })
})

describe('Schedule', () => {
  it('renders upcoming occurrences for the active batch', async () => {
    await renderAsStudent(<StudentSchedulePage />, '/student/schedule')

    expect(await screen.findByText('Full-Stack Web Development')).toBeInTheDocument()
    expect(screen.getByText(/18:00–20:00/)).toBeInTheDocument()
  })
})

describe('Resources', () => {
  it('lists resources and fetches a signed delivery URL on click', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    await renderAsStudent(<StudentResourcesPage />, '/student/resources')

    expect(await screen.findByText('Setup guide.pdf')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /download/i }))

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalled()
    })
  })
})

describe('Student navigation', () => {
  it('exposes Dashboard/My Courses/Schedule/Resources/Profile/Settings — never Admin or Trainer routes', () => {
    const allHrefs = studentNavigation.flatMap((section) => section.items.map((item) => item.href))

    expect(allHrefs).toContain('/student')
    expect(allHrefs).toContain('/student/courses')
    expect(allHrefs).toContain('/student/schedule')
    expect(allHrefs).toContain('/student/resources')
    expect(allHrefs).toContain('/student/profile')
    expect(allHrefs).toContain('/student/settings')
    expect(allHrefs.every((href) => href.startsWith('/student'))).toBe(true)
  })

  it('renders a mobile bottom nav with the four primary learner actions', () => {
    renderWithProviders(<StudentBottomNav />, { route: '/student' })

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /courses/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /schedule/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument()
  })
})

describe('Profile', () => {
  it("renders the student's profile details, editable via the contact-details form", async () => {
    await renderAsStudent(<StudentProfilePage />, '/student/profile')

    expect(await screen.findByText('Priya Sharma')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+91 98765 43210')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })
})
