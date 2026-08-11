import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ConflictsPanel } from '@/features/batches/components/ConflictsPanel'

describe('ConflictsPanel', () => {
  it('shows a clean state when there are no conflicts', () => {
    render(<ConflictsPanel conflicts={[]} isLoading={false} />)

    expect(screen.getByText('No trainer conflicts detected')).toBeInTheDocument()
  })

  it('renders AVAILABILITY and CROSS_BATCH conflicts with distinct labels', () => {
    render(
      <MemoryRouter>
        <ConflictsPanel
          conflicts={[
            {
              type: 'AVAILABILITY',
              trainerId: 'trainer-1',
              message: 'Trainer has declared unavailability during this weekly slot',
            },
            {
              type: 'CROSS_BATCH',
              trainerId: 'trainer-1',
              message: 'Trainer is already booked on another batch at this time',
              conflictingBatchId: 'batch-9',
              conflictingBatchCode: 'DM-BAT-2026-000009',
            },
          ]}
          isLoading={false}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Availability conflict')).toBeInTheDocument()
    expect(screen.getByText('Cross-batch conflict')).toBeInTheDocument()
  })

  it('links to the conflicting batch when a conflictingBatchId is present', () => {
    render(
      <MemoryRouter>
        <ConflictsPanel
          conflicts={[
            {
              type: 'CROSS_BATCH',
              trainerId: 'trainer-1',
              message: 'Trainer is already booked on another batch at this time',
              conflictingBatchId: 'batch-9',
              conflictingBatchCode: 'DM-BAT-2026-000009',
            },
          ]}
          isLoading={false}
        />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: /view conflicting batch/i })
    expect(link).toHaveAttribute('href', '/admin/batches/batch-9')
  })

  it('shows a loading skeleton while conflicts are unresolved', () => {
    const { container } = render(<ConflictsPanel conflicts={undefined} isLoading={true} />)
    expect(container.querySelector('[role="status"]')).toBeInTheDocument()
  })
})
