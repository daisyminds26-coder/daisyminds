import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import CourseCurriculumPage from '@/pages/admin/CourseCurriculumPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetCoursesMockState } from '@/test/msw/handlers/courses.handlers'
import { resetCurriculumMockState } from '@/test/msw/handlers/curriculum.handlers'
import { createTestQueryClient, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetCoursesMockState()
  resetCurriculumMockState()
  resetAuthStore()
})

async function renderAsSuperAdmin(courseId = 'course-1') {
  const queryClient = createTestQueryClient()
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/admin/courses/${courseId}/curriculum`]}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  const { result } = renderHook(() => useLogin(), { wrapper: Wrapper })
  act(() => {
    result.current.mutate({ email: 'superadmin@example.com', password: 'correct-horse-1' })
  })
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
  })

  const { render } = await import('@testing-library/react')
  return render(
    <Routes>
      <Route path="/admin/courses/:courseId/curriculum" element={<CourseCurriculumPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

describe('CourseCurriculumPage', () => {
  it('renders the curriculum tree with seeded modules and lessons', async () => {
    await renderAsSuperAdmin()

    expect(await screen.findByText('Getting Started')).toBeInTheDocument()
    expect(screen.getByText('Advanced Topics')).toBeInTheDocument()
    expect(screen.getByText('Welcome')).toBeInTheDocument()
    expect(screen.getByText('Setup')).toBeInTheDocument()
  })

  it('shows the readiness panel', async () => {
    await renderAsSuperAdmin()

    await screen.findByText('Getting Started')
    expect(await screen.findByText('Curriculum structure ready')).toBeInTheDocument()
  })

  it('shows an empty state and no readiness-ready message for a course with no curriculum', async () => {
    await renderAsSuperAdmin('course-2')

    expect(
      await screen.findByText('Start building your curriculum by adding the first module.'),
    ).toBeInTheDocument()
  })

  it('collapses and expands a module', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Welcome')
    await user.click(screen.getByRole('button', { name: 'Collapse Getting Started' }))
    expect(screen.queryByText('Welcome')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expand Getting Started' }))
    expect(await screen.findByText('Welcome')).toBeInTheDocument()
  })

  it('adds a module', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Getting Started')
    await user.click(screen.getByRole('button', { name: /add module/i }))
    await user.type(screen.getByLabelText('Title'), 'New Module')
    await user.click(screen.getByRole('button', { name: 'Add module' }))

    expect(await screen.findByText('New Module')).toBeInTheDocument()
  })

  it('edits a module', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Getting Started')
    await user.click(screen.getByRole('button', { name: /actions for module getting started/i }))
    await user.click(await screen.findByText('Edit'))
    const titleInput = screen.getByLabelText('Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Renamed Module')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Renamed Module')).toBeInTheDocument()
  })

  it('duplicates a module', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Getting Started')
    await user.click(screen.getByRole('button', { name: /actions for module getting started/i }))
    await user.click(await screen.findByText('Duplicate'))

    expect(await screen.findByText('Getting Started (Copy)')).toBeInTheDocument()
  })

  it('archives then restores a module', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Getting Started')
    await user.click(screen.getByRole('button', { name: /actions for module getting started/i }))
    await user.click(await screen.findByText('Archive'))

    await waitFor(() => {
      expect(screen.getAllByText('Archived').length).toBeGreaterThan(0)
    })

    await user.click(screen.getByRole('button', { name: /actions for module getting started/i }))
    await user.click(await screen.findByText('Restore'))

    await waitFor(() => {
      expect(screen.getAllByText('Draft').length).toBeGreaterThan(0)
    })
  })

  it('deletes a module after confirmation', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Advanced Topics')
    await user.click(screen.getByRole('button', { name: /actions for module advanced topics/i }))
    await user.click(await screen.findByText('Delete'))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByText('Advanced Topics')).not.toBeInTheDocument()
    })
  })

  it('adds a lesson to a module', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Getting Started')
    const moduleCard = screen.getByText('Getting Started').closest('[data-slot="card"]')
    expect(moduleCard).not.toBeNull()
    await user.click(within(moduleCard as HTMLElement).getByRole('button', { name: /add lesson/i }))
    await user.type(screen.getByLabelText('Title'), 'New Lesson')
    await user.click(screen.getByRole('button', { name: 'Add lesson' }))

    expect(await screen.findByText('New Lesson')).toBeInTheDocument()
  })

  it('edits a lesson', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Welcome')
    await user.click(screen.getByRole('button', { name: /actions for lesson welcome/i }))
    await user.click(await screen.findByText('Edit'))
    const titleInput = screen.getByLabelText('Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Renamed Lesson')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Renamed Lesson')).toBeInTheDocument()
  })

  it('duplicates a lesson', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Welcome')
    await user.click(screen.getByRole('button', { name: /actions for lesson welcome/i }))
    await user.click(await screen.findByText('Duplicate'))

    expect(await screen.findByText('Welcome (Copy)')).toBeInTheDocument()
  })

  it('archives then restores a lesson', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Welcome')
    await user.click(screen.getByRole('button', { name: /actions for lesson welcome/i }))
    await user.click(await screen.findByText('Archive'))

    await waitFor(() => {
      expect(screen.getAllByText('Archived').length).toBeGreaterThan(0)
    })

    await user.click(screen.getByRole('button', { name: /actions for lesson welcome/i }))
    await user.click(await screen.findByText('Restore'))

    await waitFor(() => {
      expect(screen.getAllByText('Draft').length).toBeGreaterThan(0)
    })
  })

  it('deletes a lesson after confirmation', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Setup')
    await user.click(screen.getByRole('button', { name: /actions for lesson setup/i }))
    await user.click(await screen.findByText('Delete'))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByText('Setup')).not.toBeInTheDocument()
    })
  })

  it('moves a module down via the keyboard-accessible action menu', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Getting Started')
    await user.click(screen.getByRole('button', { name: /actions for module getting started/i }))
    await user.click(await screen.findByText('Move down'))

    await waitFor(() => {
      const titles = screen
        .getAllByText(/Getting Started|Advanced Topics/)
        .map((el) => el.textContent)
      expect(titles.indexOf('Advanced Topics')).toBeLessThan(titles.indexOf('Getting Started'))
    })
  })

  it('moves a lesson down via the keyboard-accessible action menu', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Welcome')
    await user.click(screen.getByRole('button', { name: /actions for lesson welcome/i }))
    await user.click(await screen.findByText('Move down'))

    await waitFor(() => {
      const titles = screen.getAllByText(/Welcome|Setup/).map((el) => el.textContent)
      expect(titles.indexOf('Setup')).toBeLessThan(titles.indexOf('Welcome'))
    })
  })

  it('moves a lesson to a different module via the Move dialog', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Welcome')
    await user.click(screen.getByRole('button', { name: /actions for lesson welcome/i }))
    await user.click(await screen.findByText('Move to module…'))

    await user.click(screen.getByRole('combobox', { name: /module/i }))
    await user.click(await screen.findByRole('option', { name: 'Advanced Topics' }))
    await user.click(screen.getByRole('button', { name: 'Move lesson' }))

    await waitFor(() => {
      const advancedTopicsCard = screen.getByText('Advanced Topics').closest('[data-slot="card"]')
      expect(within(advancedTopicsCard as HTMLElement).getByText('Welcome')).toBeInTheDocument()
    })
  })

  it('has an accessible drag handle label for modules and lessons', async () => {
    await renderAsSuperAdmin()

    await screen.findByText('Getting Started')
    expect(
      screen.getByRole('button', { name: /move module 1: getting started/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /move lesson 1: welcome/i })).toBeInTheDocument()
  })

  it('links to the dedicated content editor from the lesson edit drawer', async () => {
    const user = userEvent.setup()
    await renderAsSuperAdmin()

    await screen.findByText('Getting Started')
    await user.click(screen.getByRole('button', { name: /actions for lesson welcome/i }))
    await user.click(await screen.findByText('Edit'))

    const dialog = await screen.findByRole('dialog')
    const editContentLink = within(dialog).getByRole('link', { name: /edit content/i })
    expect(editContentLink).toHaveAttribute(
      'href',
      '/admin/courses/course-1/curriculum/modules/module-1/lessons/lesson-1/content',
    )
  })

  it('links back to the courses list', async () => {
    await renderAsSuperAdmin()

    await screen.findByText('Getting Started')
    expect(screen.getByRole('link', { name: /back to courses/i })).toHaveAttribute(
      'href',
      '/admin/courses',
    )
  })
})
