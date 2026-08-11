import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ReadinessPanel } from '@/features/batches/components/ReadinessPanel'

describe('ReadinessPanel (batches)', () => {
  it('shows a ready message when there are no blockers', () => {
    render(<ReadinessPanel readiness={{ ready: true, blockers: [] }} isLoading={false} />)

    expect(screen.getByText('Ready to schedule')).toBeInTheDocument()
  })

  it('lists every blocker message when not ready', () => {
    render(
      <ReadinessPanel
        readiness={{
          ready: false,
          blockers: [
            {
              field: 'primaryTrainerId',
              code: 'MISSING_PRIMARY_TRAINER',
              message: 'A primary trainer must be assigned before scheduling',
            },
            {
              field: 'weeklySchedule',
              code: 'EMPTY_WEEKLY_SCHEDULE',
              message: 'At least one weekly session must be added before scheduling',
            },
          ],
        }}
        isLoading={false}
      />,
    )

    expect(screen.getByText(/not ready to schedule/i)).toBeInTheDocument()
    expect(
      screen.getByText('A primary trainer must be assigned before scheduling'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('At least one weekly session must be added before scheduling'),
    ).toBeInTheDocument()
  })

  it('shows a loading skeleton while readiness is unresolved', () => {
    const { container } = render(<ReadinessPanel readiness={undefined} isLoading={true} />)
    expect(container.querySelector('[role="status"]')).toBeInTheDocument()
  })
})
