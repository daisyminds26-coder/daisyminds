import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCreateTrainer } from '@/features/trainers/hooks/use-create-trainer'
import { resetTrainersMockState } from '@/test/msw/handlers/trainers.handlers'
import { createTestQueryClient } from '@/test/test-utils'
import type { CreateTrainerPayload } from '@/features/trainers/api/trainers.api'

beforeEach(() => {
  resetTrainersMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

function validPayload(overrides: Partial<CreateTrainerPayload> = {}): CreateTrainerPayload {
  return {
    email: 'new-trainer@example.com',
    password: 'correct-horse-1',
    sendInvitation: true,
    firstName: 'Kabir',
    lastName: 'Singh',
    phone: '+91 90000 00000',
    ...overrides,
  }
}

describe('useCreateTrainer', () => {
  it('creates a trainer as PENDING_VERIFICATION by default', async () => {
    const { result } = renderHook(() => useCreateTrainer(), { wrapper })

    act(() => {
      result.current.mutate(validPayload())
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.status).toBe('PENDING_VERIFICATION')
    expect(result.current.data?.trainerId).toMatch(/^DM-TRN-/)
  })

  it('creates a trainer as ACTIVE when sendInvitation is false', async () => {
    const { result } = renderHook(() => useCreateTrainer(), { wrapper })

    act(() => {
      result.current.mutate(
        validPayload({ email: 'active-new@example.com', sendInvitation: false }),
      )
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.status).toBe('ACTIVE')
  })

  it('surfaces a conflict error for a duplicate email', async () => {
    const { result } = renderHook(() => useCreateTrainer(), { wrapper })

    act(() => {
      result.current.mutate(validPayload({ email: 'active-trainer@example.com' }))
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
