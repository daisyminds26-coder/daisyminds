import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from '@/app/App'

beforeEach(() => {
  window.history.pushState({}, '', '/')
})

describe('App', () => {
  it('renders the homepage hero and primary navigation', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /build skills\. create opportunities/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    for (const link of screen.getAllByRole('link', { name: /explore programs/i })) {
      expect(link).toHaveAttribute('href', '/services')
    }
  })

  it('navigates to the Services page via the navbar mega menu', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { level: 1, name: /build skills\. create opportunities/i })
    await user.click(screen.getByRole('button', { name: 'Services' }))
    await user.click(await screen.findByRole('link', { name: /view all programs/i }))

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: /build skills that move your career forward/i,
      }),
    ).toBeInTheDocument()
  })

  it('opens and closes the mobile menu', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { level: 1, name: /build skills\. create opportunities/i })
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    const mobileMenu = document.getElementById('mobile-menu')
    if (!mobileMenu) throw new Error('Expected the mobile menu panel to be in the document')
    expect(within(mobileMenu).getByRole('link', { name: 'Contact' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close menu' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    })
  })

  it('points "Student Login" at the configured LMS URL, external and never a local route', async () => {
    render(<App />)

    await screen.findByRole('heading', { level: 1, name: /build skills\. create opportunities/i })
    const loginLinks = screen.getAllByRole('link', { name: 'Student Login' })
    for (const link of loginLinks) {
      expect(link).toHaveAttribute('href', 'http://localhost:5173/login')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noreferrer')
    }
  })

  it('routes from a program card to its own program detail page', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/services')
    render(<App />)

    const heading = await screen.findByRole('heading', {
      level: 3,
      name: 'Web Development',
    })
    const card = heading.closest('a')
    if (!card) throw new Error('Expected the program title to be wrapped in a link')
    await user.click(card)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Web Development' }),
    ).toBeInTheDocument()
    for (const link of screen.getAllByRole('link', { name: 'Apply for Program' })) {
      expect(link).toHaveAttribute('href', '/apply?program=web-development')
    }
  })

  it('filters the programs list by category', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/services')
    render(<App />)

    await screen.findByRole('heading', { level: 3, name: 'Web Development' })
    expect(
      screen.getByRole('heading', { level: 3, name: 'Android Development' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Security' }))

    expect(screen.getByRole('heading', { level: 3, name: 'Cybersecurity' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Web Development' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Android Development' }),
    ).not.toBeInTheDocument()
  })

  it('exposes an accessible, keyboard-operable FAQ accordion', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/faq')
    render(<App />)

    const question = await screen.findByRole('button', {
      name: /do i need prior experience to Enrollll/i,
    })
    expect(question).toHaveAttribute('aria-expanded', 'false')

    await user.click(question)
    expect(question).toHaveAttribute('aria-expanded', 'true')
    const panelId = question.getAttribute('aria-controls')
    if (!panelId) throw new Error('Expected the question button to declare aria-controls')
    const panel = document.getElementById(panelId)
    if (!panel) throw new Error('Expected the FAQ answer panel to be in the document')
    expect(panel).toHaveAttribute('role', 'region')
    expect(within(panel).getByText(/beginner/i)).toBeInTheDocument()
  })

  it('validates the contact form before allowing submission, then accepts valid input', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/contact')
    render(<App />)

    const submit = await screen.findByRole('button', { name: /send message/i })
    await user.click(submit)

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.some((alert) => /enter your full name/i.test(alert.textContent))).toBe(true)

    await user.type(screen.getByLabelText(/full name/i), 'Asha Rao')
    await user.type(screen.getByLabelText(/^email/i), 'asha@example.com')
    await user.type(
      screen.getByLabelText(/what are you hoping to learn/i),
      'I want to move into frontend engineering.',
    )
    await user.click(screen.getByRole('button', { name: /send message/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/thanks/i)
  })
})
