import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import LessonContentEditorPage from '@/pages/admin/LessonContentEditorPage'
import { useLogin } from '@/features/auth/hooks/use-login'
import { resetAuthMockState } from '@/test/msw/handlers/auth.handlers'
import { resetCoursesMockState } from '@/test/msw/handlers/courses.handlers'
import { resetCurriculumMockState } from '@/test/msw/handlers/curriculum.handlers'
import { resetLessonContentMockState } from '@/test/msw/handlers/lesson-content.handlers'
import { createTestQueryClient, resetAuthStore } from '@/test/test-utils'
import { apiPost } from '@/shared/lib/api-client'

beforeEach(() => {
  resetAuthMockState()
  resetCoursesMockState()
  resetCurriculumMockState()
  resetLessonContentMockState()
  resetAuthStore()
})

// Seeded by resetCurriculumMockState(): course-1 > module-1 ("Getting Started") > lesson-1 ("Welcome", VIDEO), lesson-2 ("Setup", DOCUMENT).
const VIDEO_LESSON_PATH =
  '/admin/courses/course-1/curriculum/modules/module-1/lessons/lesson-1/content'
const DOCUMENT_LESSON_PATH =
  '/admin/courses/course-1/curriculum/modules/module-1/lessons/lesson-2/content'

async function renderAt(path: string) {
  const queryClient = createTestQueryClient()
  function LoginWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const { result } = renderHook(() => useLogin(), { wrapper: LoginWrapper })
  act(() => {
    result.current.mutate({ email: 'superadmin@example.com', password: 'correct-horse-1' })
  })
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
  })

  // A real data router (not plain `<MemoryRouter>`) — `useUnsavedChangesGuard`'s `useBlocker` requires the Data Router APIs, exactly what the real app's `createBrowserRouter` provides (`app/router.tsx`).
  const router = createMemoryRouter(
    [
      {
        path: '/admin/courses/:courseId/curriculum/modules/:moduleId/lessons/:lessonId/content',
        element: <LessonContentEditorPage />,
      },
    ],
    { initialEntries: [path] },
  )

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

/** A helper for tests that need a TEXT/EXTERNAL_LINK/QUIZ lesson — created for real via the curriculum API rather than hand-editing mock state, matching how every other curriculum test builds fixtures. */
async function createLesson(lessonType: string, title: string) {
  const lesson = await apiPost<{ id: string }>('/courses/course-1/modules/module-1/lessons', {
    title,
    lessonType,
  })
  return lesson.id
}

/** `MediaUploadZone`'s file input has no accessible label, so it can't be found via `getByLabelText` — this scopes to a container (the page, or a dialog) and narrows via `instanceof` rather than a type assertion. */
function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) throw new Error('Could not find a file input')
  return input
}

describe('LessonContentEditorPage', () => {
  it('shows the lesson type, structural status, and content-readiness badges', async () => {
    await renderAt(VIDEO_LESSON_PATH)

    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
    expect(screen.getByText('Video')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('No content')).toBeInTheDocument()
  })

  it('links back to the curriculum builder', async () => {
    await renderAt(VIDEO_LESSON_PATH)

    await screen.findByRole('heading', { name: 'Welcome' })
    expect(screen.getByRole('link', { name: /back to curriculum/i })).toHaveAttribute(
      'href',
      '/admin/courses/course-1/curriculum',
    )
  })

  it('shows an error state for a lesson that does not exist', async () => {
    await renderAt(
      '/admin/courses/course-1/curriculum/modules/module-1/lessons/does-not-exist/content',
    )
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('saves TEXT content and reflects READY status', async () => {
    const user = userEvent.setup()
    const lessonId = await createLesson('TEXT', 'Intro Text Lesson')
    await renderAt(
      `/admin/courses/course-1/curriculum/modules/module-1/lessons/${lessonId}/content`,
    )

    await screen.findByRole('heading', { name: 'Intro Text Lesson' })
    const editor = screen.getByRole('textbox', { name: 'Lesson body' })
    await user.click(editor)
    await user.type(editor, 'Hello students')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('All changes saved')).toBeInTheDocument()
    })
    expect(await screen.findAllByText('Content ready')).not.toHaveLength(0)
  })

  it('disables Save until the text editor is actually dirty', async () => {
    const lessonId = await createLesson('TEXT', 'Blank Text Lesson')
    await renderAt(
      `/admin/courses/course-1/curriculum/modules/module-1/lessons/${lessonId}/content`,
    )

    await screen.findByRole('heading', { name: 'Blank Text Lesson' })
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('saves an external link and shows its parsed domain', async () => {
    const user = userEvent.setup()
    const lessonId = await createLesson('EXTERNAL_LINK', 'Reading List')
    await renderAt(
      `/admin/courses/course-1/curriculum/modules/module-1/lessons/${lessonId}/content`,
    )

    await screen.findByRole('heading', { name: 'Reading List' })
    await user.type(screen.getByLabelText('URL'), 'https://example.com/reading')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/example\.com/)).toBeInTheDocument()
  })

  it('rejects a javascript: URL client-side, before any save request', async () => {
    const user = userEvent.setup()
    const lessonId = await createLesson('EXTERNAL_LINK', 'Bad Link Lesson')
    await renderAt(
      `/admin/courses/course-1/curriculum/modules/module-1/lessons/${lessonId}/content`,
    )

    await screen.findByRole('heading', { name: 'Bad Link Lesson' })
    await user.type(screen.getByLabelText('URL'), 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('This URL scheme is not allowed')).toBeInTheDocument()
  })

  it('uploads a video and shows its metadata once verified', async () => {
    const user = userEvent.setup()
    await renderAt(VIDEO_LESSON_PATH)

    await screen.findByRole('heading', { name: 'Welcome' })
    const file = new File(['fake video bytes'], 'lesson.mp4', { type: 'video/mp4' })
    const input = getFileInput(document.body)
    await user.upload(input, file)
    await user.click(screen.getByRole('button', { name: 'Upload video' }))

    expect(await screen.findByText('mp4')).toBeInTheDocument()
    expect(await screen.findAllByText('Content ready')).not.toHaveLength(0)
  })

  it('warns before replacing an existing video', async () => {
    const user = userEvent.setup()
    await renderAt(VIDEO_LESSON_PATH)

    await screen.findByRole('heading', { name: 'Welcome' })
    const firstFile = new File(['v1'], 'v1.mp4', { type: 'video/mp4' })
    const input = getFileInput(document.body)
    await user.upload(input, firstFile)
    await user.click(screen.getByRole('button', { name: 'Upload video' }))
    await screen.findByText('mp4')

    const secondFile = new File(['v2'], 'v2.mp4', { type: 'video/mp4' })
    await user.upload(input, secondFile)

    expect(await screen.findByText('Replace the existing video?')).toBeInTheDocument()
  })

  it('removes a video after confirmation', async () => {
    const user = userEvent.setup()
    await renderAt(VIDEO_LESSON_PATH)

    await screen.findByRole('heading', { name: 'Welcome' })
    const file = new File(['fake video bytes'], 'lesson.mp4', { type: 'video/mp4' })
    const input = getFileInput(document.body)
    await user.upload(input, file)
    await user.click(screen.getByRole('button', { name: 'Upload video' }))
    await screen.findByText('mp4')

    await user.click(screen.getByRole('button', { name: 'Remove' }))
    await user.click(await screen.findByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(screen.queryByText('mp4')).not.toBeInTheDocument()
    })
  })

  it('uploads a document and shows its filename', async () => {
    const user = userEvent.setup()
    await renderAt(DOCUMENT_LESSON_PATH)

    await screen.findByRole('heading', { name: 'Setup' })
    const file = new File(['%PDF-1.4'], 'syllabus.pdf', { type: 'application/pdf' })
    const input = getFileInput(document.body)
    await user.upload(input, file)
    await user.click(screen.getByRole('button', { name: 'Upload document' }))

    expect(await screen.findByText('syllabus.pdf')).toBeInTheDocument()
  })

  it('shows an honest "coming in a future phase" notice for a QUIZ lesson', async () => {
    const lessonId = await createLesson('QUIZ', 'Module Quiz')
    await renderAt(
      `/admin/courses/course-1/curriculum/modules/module-1/lessons/${lessonId}/content`,
    )

    expect(
      await screen.findByText('Quiz authoring is coming in a future phase.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument()
  })

  it('adds a resource via the resource manager', async () => {
    const user = userEvent.setup()
    await renderAt(VIDEO_LESSON_PATH)

    await screen.findByRole('heading', { name: 'Welcome' })
    await user.click(await screen.findByRole('button', { name: /add resource/i }))
    const dialog = await screen.findByRole('dialog')
    const file = new File(['%PDF-1.4'], 'slides.pdf', { type: 'application/pdf' })
    const input = getFileInput(dialog)
    await user.upload(input, file)
    await user.click(within(dialog).getByRole('button', { name: 'Add resource' }))

    expect(await screen.findByText('slides')).toBeInTheDocument()
  })

  it('deletes a resource after confirmation', async () => {
    const user = userEvent.setup()
    await renderAt(VIDEO_LESSON_PATH)

    await screen.findByRole('heading', { name: 'Welcome' })
    await user.click(await screen.findByRole('button', { name: /add resource/i }))
    const dialog = await screen.findByRole('dialog')
    const file = new File(['%PDF-1.4'], 'notes.pdf', { type: 'application/pdf' })
    const input = getFileInput(dialog)
    await user.upload(input, file)
    await user.click(within(dialog).getByRole('button', { name: 'Add resource' }))
    await screen.findByText('notes')

    await user.click(screen.getByRole('button', { name: /actions for resource notes/i }))
    await user.click(await screen.findByText('Delete'))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByText('notes')).not.toBeInTheDocument()
    })
  })
})
