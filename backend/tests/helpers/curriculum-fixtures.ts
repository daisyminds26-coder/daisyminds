import type { z } from 'zod'

import type {
  createLessonSchema,
  createModuleSchema,
} from '../../src/validators/curriculum.validator'

type CreateModulePayload = z.input<typeof createModuleSchema>
type CreateLessonPayload = z.input<typeof createLessonSchema>

export function validCreateModulePayload(
  overrides: Partial<CreateModulePayload> = {},
): CreateModulePayload {
  return {
    title: 'Getting Started',
    description: 'An introduction to the course.',
    ...overrides,
  }
}

export function validCreateLessonPayload(
  overrides: Partial<CreateLessonPayload> = {},
): CreateLessonPayload {
  return {
    title: 'Welcome',
    lessonType: 'VIDEO',
    ...overrides,
  }
}
