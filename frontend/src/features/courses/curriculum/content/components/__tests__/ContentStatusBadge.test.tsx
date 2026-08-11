import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ContentStatusBadge } from '@/features/courses/curriculum/content/components/ContentStatusBadge'

describe('ContentStatusBadge', () => {
  it('renders a human label for each content status', () => {
    const { rerender } = render(<ContentStatusBadge status="EMPTY" />)
    expect(screen.getByText('No content')).toBeInTheDocument()

    rerender(<ContentStatusBadge status="READY" />)
    expect(screen.getByText('Content ready')).toBeInTheDocument()

    rerender(<ContentStatusBadge status="NOT_CONFIGURED" />)
    expect(screen.getByText('Coming soon')).toBeInTheDocument()

    rerender(<ContentStatusBadge status="ERROR" />)
    expect(screen.getByText('Upload failed')).toBeInTheDocument()
  })
})
