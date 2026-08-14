import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LiveClassStatusBadge } from '@/features/live-classes/components/LiveClassStatusBadge'
import { LIVE_CLASS_STATUSES } from '@/features/live-classes/types'

describe('LiveClassStatusBadge', () => {
  it.each(LIVE_CLASS_STATUSES)(
    'renders a readable text label for %s, not color alone',
    (status) => {
      render(<LiveClassStatusBadge status={status} />)

      // WCAG "never color as the only signal" — every status renders as visible text.
      expect(screen.getByText(/\w/)).toBeInTheDocument()
    },
  )
})
