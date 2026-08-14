import { z } from 'zod'

import { errorResponseSchema, registry, successResponseSchema } from '../config/swagger'

const TAGS = ['Public — Programs']

function errorResponses(
  ...statusCodes: number[]
): Record<number, { description: string; content: unknown }> {
  return Object.fromEntries(
    statusCodes.map((code) => [
      code,
      { description: 'Error', content: { 'application/json': { schema: errorResponseSchema } } },
    ]),
  )
}

const publicProgramListItemSchema = z.object({
  id: z.string(),
  courseCode: z.string(),
  slug: z.string(),
  title: z.string(),
  shortDescription: z.string(),
  thumbnailUrl: z.string().nullable(),
  category: z.string(),
  level: z.string(),
  deliveryMode: z.string(),
  duration: z.string().nullable(),
  skills: z.array(z.string()),
  certificateAvailable: z.boolean(),
  featured: z.boolean(),
  featuredOrder: z.number().nullable(),
})

const publicLessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  lessonType: z.string(),
  estimatedDurationMinutes: z.number().nullable(),
})

const publicModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  lessons: z.array(publicLessonSchema),
})

const publicUpcomingBatchSchema = z.object({
  id: z.string(),
  batchCode: z.string(),
  name: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  deliveryMode: z.string(),
  timezone: z.string(),
  weeklyScheduleSummary: z.array(z.string()),
  availability: z.enum(['AVAILABLE', 'LIMITED', 'FULL']),
})

const publicProgramDetailSchema = publicProgramListItemSchema.extend({
  description: z.string(),
  bannerUrl: z.string().nullable(),
  language: z.string(),
  durationValue: z.number().nullable(),
  durationUnit: z.string().nullable(),
  learningOutcomes: z.array(z.string()),
  seo: z.object({ title: z.string(), description: z.string() }),
  publishedAt: z.string().nullable(),
  curriculum: z.array(publicModuleSchema),
  upcomingBatches: z.array(publicUpcomingBatchSchema),
})

registry.registerPath({
  method: 'get',
  path: '/public/programs',
  tags: TAGS,
  summary: 'List published, publicly-visible training programs',
  description:
    'Unauthenticated. Always scoped to status=PUBLISHED and visibility=PUBLIC server-side — these cannot be overridden by the client.',
  responses: {
    200: {
      description: 'Paginated public program list',
      content: {
        'application/json': { schema: successResponseSchema(z.array(publicProgramListItemSchema)) },
      },
    },
    ...errorResponses(400),
  },
})

registry.registerPath({
  method: 'get',
  path: '/public/programs/{slug}',
  tags: TAGS,
  summary: 'Get one public program by slug, with curriculum preview and upcoming batches',
  description:
    'Unauthenticated. Returns 404 (never 403) for a draft/private/nonexistent slug alike — real existence of unpublished courses is never inferable.',
  request: { params: z.object({ slug: z.string() }) },
  responses: {
    200: {
      description: 'Public program detail',
      content: { 'application/json': { schema: successResponseSchema(publicProgramDetailSchema) } },
    },
    ...errorResponses(400, 404),
  },
})
