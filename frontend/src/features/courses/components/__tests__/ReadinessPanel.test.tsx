import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ReadinessPanel } from '@/features/courses/components/ReadinessPanel'

describe('ReadinessPanel', () => {
  it('shows a ready message when there are no blockers', () => {
    render(<ReadinessPanel readiness={{ ready: true, blockers: [] }} isLoading={false} />)

    expect(screen.getByText('Ready to publish')).toBeInTheDocument()
  })

  it('lists every blocker message when not ready', () => {
    render(
      <ReadinessPanel
        readiness={{
          ready: false,
          blockers: [
            { field: 'description', message: 'Description is required' },
            { field: 'thumbnailUrl', message: 'A thumbnail image is required to publish' },
          ],
        }}
        isLoading={false}
      />,
    )

    expect(screen.getByText(/not ready to publish/i)).toBeInTheDocument()
    expect(screen.getByText('Description is required')).toBeInTheDocument()
    expect(screen.getByText('A thumbnail image is required to publish')).toBeInTheDocument()
  })
})
