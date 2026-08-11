import { z } from 'zod'

import { bearerAuth, errorResponseSchema, registry, successResponseSchema } from '../config/swagger'
import { LESSON_TYPES } from '../models/lesson.model'
import { APPROVAL_STATUSES } from '../models/shared/enums'

const TAGS = ['Curriculum']

function jsonBody<T extends z.ZodType>(schema: T) {
  return { content: { 'application/json': { schema } } }
}
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

const security = [{ [bearerAuth.name]: [] }]
const courseIdParam = { params: z.object({ courseId: z.string() }) }
const moduleIdParam = { params: z.object({ courseId: z.string(), moduleId: z.string() }) }
const lessonIdParam = {
  params: z.object({ courseId: z.string(), moduleId: z.string(), lessonId: z.string() }),
}
const courseLessonIdParam = { params: z.object({ courseId: z.string(), lessonId: z.string() }) }

const moduleSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z.string(),
  description: z.string(),
  order: z.number(),
  status: z.enum(APPROVAL_STATUSES),
  estimatedDurationMinutes: z.number().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

const lessonSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  courseModuleId: z.string(),
  title: z.string(),
  shortDescription: z.string(),
  order: z.number(),
  lessonType: z.enum(LESSON_TYPES),
  status: z.enum(APPROVAL_STATUSES),
  estimatedDurationMinutes: z.number().nullable(),
  isPreview: z.boolean(),
  isMandatory: z.boolean(),
  prerequisiteLessonIds: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

const curriculumTreeSchema = z.object({
  courseId: z.string(),
  modules: z.array(moduleSchema.extend({ lessons: z.array(lessonSchema) })),
})

const readinessSchema = z.object({
  ready: z.boolean(),
  blockers: z.array(z.object({ field: z.string(), message: z.string() })),
  summary: z.object({
    moduleCount: z.number(),
    publishedModuleCount: z.number(),
    draftModuleCount: z.number(),
    lessonCount: z.number(),
    publishedLessonCount: z.number(),
    draftLessonCount: z.number(),
  }),
})

registry.registerPath({
  method: 'get',
  path: '/courses/{courseId}/curriculum',
  tags: TAGS,
  summary: "A course's full curriculum tree (modules with their nested lessons)",
  security,
  request: courseIdParam,
  responses: {
    200: {
      description: 'Curriculum tree',
      content: { 'application/json': { schema: successResponseSchema(curriculumTreeSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/courses/{courseId}/curriculum/readiness-check',
  tags: TAGS,
  summary:
    'Structural curriculum readiness — distinct from course publication readiness (ARCHITECTURE.md §20)',
  security,
  request: courseIdParam,
  responses: {
    200: {
      description: 'Readiness result',
      content: { 'application/json': { schema: successResponseSchema(readinessSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/courses/{courseId}/modules',
  tags: TAGS,
  summary: 'Create a module (always appended to the end; always starts DRAFT)',
  security,
  request: {
    ...courseIdParam,
    body: jsonBody(z.object({ title: z.string(), description: z.string().optional() })),
  },
  responses: {
    201: {
      description: 'Module created',
      content: { 'application/json': { schema: successResponseSchema(moduleSchema) } },
    },
    ...errorResponses(400, 401, 403, 404, 409),
  },
})

registry.registerPath({
  method: 'post',
  path: '/courses/{courseId}/modules/reorder',
  tags: TAGS,
  summary: 'Reorder modules — payload must name every current active module exactly once',
  security,
  request: {
    ...courseIdParam,
    body: jsonBody(z.object({ items: z.array(z.object({ id: z.string(), order: z.number() })) })),
  },
  responses: {
    200: {
      description: 'Modules reordered',
      content: { 'application/json': { schema: successResponseSchema(z.array(moduleSchema)) } },
    },
    ...errorResponses(400, 401, 403, 404, 409),
  },
})

for (const [method, path, summary, statuses] of [
  [
    'patch',
    '/courses/{courseId}/modules/{moduleId}',
    'Update a module — title/description/duration only, never its order',
    [400, 401, 403, 404, 409],
  ],
  [
    'delete',
    '/courses/{courseId}/modules/{moduleId}',
    'Soft-delete a module and cascade its active lessons',
    [401, 403, 404, 409],
  ],
  [
    'post',
    '/courses/{courseId}/modules/{moduleId}/archive',
    'Archive a module',
    [401, 403, 404, 409],
  ],
  [
    'post',
    '/courses/{courseId}/modules/{moduleId}/restore',
    'Restore a deleted or archived module (cascades tombstoned lessons)',
    [401, 403, 404, 409],
  ],
  [
    'post',
    '/courses/{courseId}/modules/{moduleId}/duplicate',
    'Duplicate a module and all of its active lessons',
    [401, 403, 404, 409],
  ],
  [
    'post',
    '/courses/{courseId}/modules/{moduleId}/publish',
    'Publish a module',
    [401, 403, 404, 409],
  ],
  [
    'post',
    '/courses/{courseId}/modules/{moduleId}/unpublish',
    'Move a published module back to draft',
    [401, 403, 404, 409],
  ],
] as const) {
  registry.registerPath({
    method,
    path,
    tags: TAGS,
    summary,
    security,
    request:
      method === 'patch'
        ? { ...moduleIdParam, body: jsonBody(z.object({ title: z.string().optional() })) }
        : moduleIdParam,
    responses: {
      200: {
        description: summary,
        content: {
          'application/json': {
            schema: successResponseSchema(method === 'delete' ? z.null() : moduleSchema),
          },
        },
      },
      ...errorResponses(...statuses),
    },
  })
}

registry.registerPath({
  method: 'post',
  path: '/courses/{courseId}/modules/{moduleId}/lessons',
  tags: TAGS,
  summary: 'Create a lesson (always appended to the end of the module; always starts DRAFT)',
  security,
  request: {
    ...moduleIdParam,
    body: jsonBody(z.object({ title: z.string(), lessonType: z.enum(LESSON_TYPES) })),
  },
  responses: {
    201: {
      description: 'Lesson created',
      content: { 'application/json': { schema: successResponseSchema(lessonSchema) } },
    },
    ...errorResponses(400, 401, 403, 404, 409),
  },
})

for (const [method, path, summary] of [
  [
    'patch',
    '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}',
    'Update a lesson — module/course reassignment must go through the move endpoint',
  ],
  ['delete', '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}', 'Soft-delete a lesson'],
  ['post', '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/archive', 'Archive a lesson'],
  [
    'post',
    '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/restore',
    'Restore a deleted lesson',
  ],
  [
    'post',
    '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/duplicate',
    'Duplicate a lesson, inserted immediately after the source',
  ],
  ['post', '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/publish', 'Publish a lesson'],
  [
    'post',
    '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/unpublish',
    'Move a published lesson back to draft',
  ],
] as const) {
  registry.registerPath({
    method,
    path,
    tags: TAGS,
    summary,
    security,
    request:
      method === 'patch'
        ? {
            ...lessonIdParam,
            body: jsonBody(
              z.object({
                title: z.string().optional(),
                prerequisiteLessonIds: z.array(z.string()).optional(),
              }),
            ),
          }
        : lessonIdParam,
    responses: {
      200: {
        description: summary,
        content: {
          'application/json': {
            schema: successResponseSchema(method === 'delete' ? z.null() : lessonSchema),
          },
        },
      },
      ...errorResponses(400, 401, 403, 404, 409),
    },
  })
}

registry.registerPath({
  method: 'post',
  path: '/courses/{courseId}/lessons/reorder',
  tags: TAGS,
  summary:
    'Reorder lessons within one module — payload must name every current active lesson in that module exactly once',
  security,
  request: {
    ...courseIdParam,
    body: jsonBody(
      z.object({
        moduleId: z.string(),
        items: z.array(z.object({ id: z.string(), order: z.number() })),
      }),
    ),
  },
  responses: {
    200: {
      description: 'Lessons reordered',
      content: { 'application/json': { schema: successResponseSchema(z.array(lessonSchema)) } },
    },
    ...errorResponses(400, 401, 403, 404, 409),
  },
})

registry.registerPath({
  method: 'post',
  path: '/courses/{courseId}/lessons/{lessonId}/move',
  tags: TAGS,
  summary:
    'Move a lesson to a different module and/or position — target module must belong to the same course',
  security,
  request: {
    ...courseLessonIdParam,
    body: jsonBody(z.object({ targetModuleId: z.string(), targetOrder: z.number() })),
  },
  responses: {
    200: {
      description: 'Lesson moved',
      content: { 'application/json': { schema: successResponseSchema(lessonSchema) } },
    },
    ...errorResponses(400, 401, 403, 404, 409),
  },
})
