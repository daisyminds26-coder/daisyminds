import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAdminDashboard } from '@/features/dashboard/hooks/use-admin-dashboard'
import { resetDashboardMockState } from '@/test/msw/handlers/dashboard.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  resetDashboardMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useAdminDashboard', () => {
  it('loads the dashboard summary for the requested range', async () => {
    const { result } = renderHook(
      () => useAdminDashboard({ range: 'LAST_30_DAYS', timezone: 'Asia/Kolkata' }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.summary.activeStudents).toBeGreaterThanOrEqual(0)
    expect(result.current.data?.period.range).toBe('LAST_30_DAYS')
  })

  it('does not fetch when disabled', () => {
    const { result } = renderHook(
      () => useAdminDashboard({ range: 'CUSTOM', timezone: 'Asia/Kolkata' }, false),
      { wrapper },
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
  })
})
