import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import LoginPage from '@/pages/auth/LoginPage'
import {
  getLoginCallCount,
  resetAuthMockState,
  setLoginDelayMs,
} from '@/test/msw/handlers/auth.handlers'
import { renderWithProviders, resetAuthStore } from '@/test/test-utils'

beforeEach(() => {
  resetAuthMockState()
  resetAuthStore()
})

describe('LoginPage', () => {
  it('has accessible, labeled fields with password-manager-compatible autocomplete', () => {
    renderWithProviders(<LoginPage />, { route: '/login' })

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')

    expect(emailInput).toHaveAttribute('autocomplete', 'email')
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('can be completed and submitted with the keyboard alone', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login' })

    await user.tab()
    expect(screen.getByLabelText('Email')).toHaveFocus()
    await user.keyboard('active@example.com')
    await user.tab()
    expect(screen.getByLabelText('Password')).toHaveFocus()
    await user.keyboard('correct-horse-1{Enter}')

    await waitFor(() => {
      expect(getLoginCallCount()).toBe(1)
    })
  })

  it('disables the submit button while the request is pending, preventing a duplicate submission', async () => {
    // Slow the login response down so the first click's pending window is
    // long enough to deterministically observe the button disabling before
    // the second click lands — otherwise a near-instant mock response can
    // race the assertion.
    setLoginDelayMs(50)

    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login' })

    await user.type(screen.getByLabelText('Email'), 'active@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct-horse-1')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)
    expect(submitButton).toBeDisabled()
    // A second click while disabled must not fire a second request.
    await user.click(submitButton)

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    expect(getLoginCallCount()).toBe(1)
  })

  it('shows the account-locked alert with a retry-after time for a LOCKED account', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login' })

    await user.type(screen.getByLabelText('Email'), 'locked@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct-horse-1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Account temporarily locked')).toBeInTheDocument()
    expect(screen.getByText(/you can try again after/i)).toBeInTheDocument()
  })
})
