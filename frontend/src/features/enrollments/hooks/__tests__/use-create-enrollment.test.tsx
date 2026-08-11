import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCreateEnrollment } from '@/features/enrollments/hooks/use-create-enrollment'
import { createStudent } from '@/features/students/api/students.api'
import { resetBatchesMockState, findBatchById } from '@/test/msw/handlers/batches.handlers'
import { resetStudentsMockState } from '@/test/msw/handlers/students.handlers'
import { resetCoursesMockState } from '@/test/msw/handlers/courses.handlers'
import { resetEnrollmentsMockState } from '@/test/msw/handlers/enrollments.handlers'
import { createTestQueryClient } from '@/test/test-utils'

beforeEach(() => {
  // Order matters: enrollment seeding bumps the freshly-reset batches'
  // occupiedSeats — see `enrollments.handlers.ts#resetEnrollmentsMockState`.
  resetBatchesMockState()
  resetStudentsMockState()
  resetCoursesMockState()
  resetEnrollmentsMockState()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

/** A fresh, never-enrolled-anywhere student — avoids colliding with the seeded confirmed/active/waitlisted enrolments already occupying every `student-1`/`student-2` × `batch-1`/`batch-2` pair. */
async function createFreshStudent() {
  return createStudent({
    email: `new-student-${Date.now().toString()}@example.com`,
    password: 'correct-horse-1',
    sendInvitation: false,
    firstName: 'New',
    lastName: 'Student',
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
    guardianAddressSameAsStudent: false,
  })
}

describe('useCreateEnrollment', () => {
  it('confirms the enrollment immediately when a seat is available', async () => {
    const student = await createFreshStudent()
    const { result } = renderHook(() => useCreateEnrollment(), { wrapper })

    act(() => {
      result.current.mutate({ studentId: student.id, batchId: 'batch-1' })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.status).toBe('CONFIRMED')
    expect(result.current.data?.accessState).toBe('NONE')
    expect(findBatchById('batch-1')?.occupiedSeats).toBe(2)
  })

  it('waitlists the enrollment when the batch is full and waitlisting is enabled', async () => {
    const batch = findBatchById('batch-2')
    if (batch) {
      batch.maxStudents = 1
      batch.occupiedSeats = 1
      batch.availableSeats = 0
      batch.waitlistEnabled = true
    }
    const student = await createFreshStudent()

    const { result } = renderHook(() => useCreateEnrollment(), { wrapper })

    act(() => {
      result.current.mutate({ studentId: student.id, batchId: 'batch-2' })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.status).toBe('WAITLISTED')
    expect(result.current.data?.waitlistPosition).toBe(1)
  })

  it('rejects with a duplicate-enrollment error when the student is already enrolled in the batch', async () => {
    const { result } = renderHook(() => useCreateEnrollment(), { wrapper })

    // student-1 is already CONFIRMED in batch-1 via the default seed.
    act(() => {
      result.current.mutate({ studentId: 'student-1', batchId: 'batch-1' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.error?.message).toMatch(/already enrolled/i)
  })
})
