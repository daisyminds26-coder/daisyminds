import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AttendanceStatusBadge } from '@/features/attendance/components/AttendanceStatusBadge'
import { ATTENDANCE_STATUSES } from '@/features/attendance/types'

describe('AttendanceStatusBadge', () => {
  it.each([...ATTENDANCE_STATUSES, 'UNMARKED'] as const)(
    'renders a readable text label for %s, not color alone',
    (status) => {
      render(<AttendanceStatusBadge status={status} />)

      // WCAG "never color as the only signal" — every status renders as visible text.
      expect(screen.getByText(/\w/)).toBeInTheDocument()
    },
  )
})
