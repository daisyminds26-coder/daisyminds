import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ContentReadinessPanel } from '@/features/courses/curriculum/content/components/ContentReadinessPanel'

describe('ContentReadinessPanel', () => {
  it('shows "Content ready" when ready', () => {
    render(
      <ContentReadinessPanel
        readiness={{ contentStatus: 'READY', ready: true, blockers: [] }}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Content ready')).toBeInTheDocument()
  })

  it('lists blockers when not ready', () => {
    render(
      <ContentReadinessPanel
        readiness={{
          contentStatus: 'EMPTY',
          ready: false,
          blockers: ['No content has been added yet'],
        }}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Not ready yet')).toBeInTheDocument()
    expect(screen.getByText('No content has been added yet')).toBeInTheDocument()
  })
})
