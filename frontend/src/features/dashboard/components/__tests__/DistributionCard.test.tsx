import { GraduationCap } from 'lucide-react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DistributionCard } from '@/features/dashboard/components/DistributionCard'

describe('DistributionCard', () => {
  it('renders a visible count and percentage next to each bar (never color-only)', () => {
    render(
      <DistributionCard
        title="Student profile completion"
        data={[
          { key: 'INCOMPLETE', count: 3 },
          { key: 'COMPLETE', count: 1 },
        ]}
        toneForKey={() => 'success'}
        labelForKey={(key) => key}
        emptyIcon={GraduationCap}
        emptyMessage="No students yet"
      />,
    )

    expect(screen.getByText('3 (75%)')).toBeInTheDocument()
    expect(screen.getByText('1 (25%)')).toBeInTheDocument()
  })

  it('exposes an accessible text alternative for each bar via aria-label', () => {
    render(
      <DistributionCard
        title="Student profile completion"
        data={[{ key: 'INCOMPLETE', count: 2 }]}
        toneForKey={() => 'error'}
        labelForKey={() => 'Incomplete'}
        emptyIcon={GraduationCap}
        emptyMessage="No students yet"
      />,
    )

    expect(screen.getByRole('img', { name: 'Incomplete: 2 of 2, 100 percent' })).toBeInTheDocument()
  })

  it('shows an empty state when there is no data', () => {
    render(
      <DistributionCard
        title="Student profile completion"
        data={[]}
        toneForKey={() => 'neutral'}
        labelForKey={(key) => key}
        emptyIcon={GraduationCap}
        emptyMessage="No students yet"
      />,
    )

    expect(screen.getByText('No students yet')).toBeInTheDocument()
  })
})
