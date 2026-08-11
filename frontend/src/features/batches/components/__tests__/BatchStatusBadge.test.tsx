import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BatchStatusBadge } from '@/features/batches/components/BatchStatusBadge'
import { BATCH_STATUSES } from '@/features/batches/types'

describe('BatchStatusBadge', () => {
  it.each(BATCH_STATUSES)('renders a readable text label for %s, not color alone', (status) => {
    render(<BatchStatusBadge status={status} />)

    // The badge must always carry accessible text, not just a background
    // color — WCAG's "never color as the only signal" rule.
    const label = screen.getByText(new RegExp(status.replace(/_/g, ' '), 'i'))
    expect(label).toBeInTheDocument()
    expect(label.textContent).toBeTruthy()
  })
})
