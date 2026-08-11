import type { z } from 'zod'

import type { createTrainerSchema } from '../../src/validators/trainer.validator'

/** The pre-parse *input* shape — see `student-fixtures.ts` for why `z.input`, not `z.infer`, is used here. */
type CreateTrainerPayload = z.input<typeof createTrainerSchema>

/** A minimal, always-valid `POST /trainers` body — every test builds on top of this via overrides. */
export function validCreateTrainerPayload(
  overrides: Partial<CreateTrainerPayload> = {},
): CreateTrainerPayload {
  return {
    email: 'new-trainer@example.com',
    password: 'correct-horse-1',
    firstName: 'Arjun',
    lastName: 'Mehta',
    phone: '+91 98765 12345',
    ...overrides,
  }
}
