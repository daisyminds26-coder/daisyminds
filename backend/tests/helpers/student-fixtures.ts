import type { z } from 'zod'

import type { createStudentSchema } from '../../src/validators/student.validator'

/**
 * The pre-parse *input* shape (`z.input`, not `z.infer`/`z.output`) — the
 * output type makes `tags`/`educationRecords`/etc. required because Zod
 * guarantees they're present *after* `.default()` runs, but a raw HTTP
 * request body (what these fixtures build) is allowed to omit them.
 */
type CreateStudentPayload = z.input<typeof createStudentSchema>

/** A minimal, always-valid `POST /students` body — every test builds on top of this via overrides. */
export function validCreateStudentPayload(
  overrides: Partial<CreateStudentPayload> = {},
): CreateStudentPayload {
  return {
    email: 'new-student@example.com',
    password: 'correct-horse-1',
    firstName: 'Priya',
    lastName: 'Sharma',
    dateOfBirth: new Date('2005-06-15'),
    phone: '+91 98765 43210',
    address: {
      line1: '221B Baker Street',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
    },
    emergencyContacts: [{ name: 'Anita Sharma', phone: '+91 98765 00000', relationship: 'Mother' }],
    ...overrides,
  }
}
