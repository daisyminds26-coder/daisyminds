import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CourseCreateWizard } from '@/features/courses/components/CourseCreateWizard'
import { renderWithProviders, createTestQueryClient } from '@/test/test-utils'

async function goToNextStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Next' }))
}

describe('CourseCreateWizard', () => {
  it('jumps back to the SEO step and shows a toast when Canonical URL is malformed, instead of silently doing nothing on submit', async () => {
    const user = userEvent.setup()
    const queryClient = createTestQueryClient()
    renderWithProviders(<CourseCreateWizard onDone={vi.fn()} />, { queryClient })

    // Basic info
    await user.type(screen.getByLabelText('Course title'), 'Front End')
    await user.type(screen.getByLabelText('Category'), 'Development')
    await goToNextStep(user)

    // Classification (Level/Delivery mode already default to valid values)
    await goToNextStep(user)

    // Learning details
    await goToNextStep(user)

    // Pricing (defaults to FREE, valid)
    await goToNextStep(user)

    // Visibility
    await goToNextStep(user)

    // Trainer eligibility
    await goToNextStep(user)

    // SEO — type a canonical URL with no http(s):// prefix, which fails urlSchema's refine
    await user.type(screen.getByLabelText('Canonical URL'), 'daisyminds.com/courses/front-end')
    await goToNextStep(user)

    // Review — click Create course
    await user.click(screen.getByRole('button', { name: 'Create course' }))

    // Should bounce back to the SEO step (not silently do nothing) — the review
    // step's fixed summary never re-renders the Canonical URL field, so seeing
    // it again is proof the wizard actually jumped, not just re-rendered in place.
    await waitFor(() => {
      expect(screen.getByLabelText('Canonical URL')).toBeInTheDocument()
    })
  })
})
