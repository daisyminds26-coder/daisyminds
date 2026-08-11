import type { z } from 'zod'

import type { createCourseSchema } from '../../src/validators/course.validator'

/** The pre-parse *input* shape — see `student-fixtures.ts` for why `z.input`, not `z.infer`, is used here. */
type CreateCoursePayload = z.input<typeof createCourseSchema>

/** A minimal, always-valid `POST /courses` body — every test builds on top of this via overrides. */
export function validCreateCoursePayload(
  overrides: Partial<CreateCoursePayload> = {},
): CreateCoursePayload {
  return {
    title: 'Full Stack Web Development',
    category: 'Web Development',
    level: 'BEGINNER',
    deliveryMode: 'ONLINE',
    pricing: { pricingType: 'FREE' },
    ...overrides,
  }
}

/** A payload with every field a course needs to pass the publication-readiness check. */
export function readyToPublishCoursePayload(
  overrides: Partial<CreateCoursePayload> = {},
): CreateCoursePayload {
  return validCreateCoursePayload({
    description: 'A comprehensive course covering the full web development stack.',
    durationValue: 12,
    durationUnit: 'WEEKS',
    learningOutcomes: ['Build a full-stack web application', 'Deploy to production'],
    ...overrides,
  })
}
