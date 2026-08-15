import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCreateStudent } from '@/features/students/hooks/use-create-student'
import { resetStudentsMockState } from '@/test/msw/handlers/students.handlers'
import { createTestQueryClient } from '@/test/test-utils'
import type { CreateStudentPayload } from '@/features/students/api/students.api'

beforeEach(() => {
  resetStudentsMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

function validPayload(overrides: Partial<CreateStudentPayload> = {}): CreateStudentPayload {
  return {
    email: 'new-student@example.com',
    password: 'correct-horse-1',
    sendInvitation: true,
    firstName: 'Ananya',
    lastName: 'Rao',
    dateOfBirth: '2005-01-01T00:00:00.000Z',
    phone: '+91 90000 00000',
    address: {
      line1: '1 Main St',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600001',
      country: 'India',
    },
    emergencyContacts: [{ name: 'Parent', phone: '+91 90000 11111', relationship: 'Mother' }],
    ...overrides,
  }
}

describe('useCreateStudent', () => {
  it('creates a student as PENDING_VERIFICATION by default', async () => {
    const { result } = renderHook(() => useCreateStudent(), { wrapper })

    act(() => {
      result.current.mutate(validPayload())
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.status).toBe('PENDING_VERIFICATION')
    expect(result.current.data?.studentId).toMatch(/^DM-STU-/)
  })

  it('creates a student as ACTIVE when sendInvitation is false', async () => {
    const { result } = renderHook(() => useCreateStudent(), { wrapper })

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
    const { result } = renderHook(() => useCreateStudent(), { wrapper })

    act(() => {
      result.current.mutate(validPayload({ email: 'active-student@example.com' }))
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
