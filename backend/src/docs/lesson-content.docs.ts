import { z } from 'zod'

import { bearerAuth, errorResponseSchema, registry, successResponseSchema } from '../config/swagger'
import { CONTENT_STATUSES, MEDIA_ASSET_STATUSES } from '../models/lesson.model'
import { LESSON_RESOURCE_TYPES } from '../models/lesson-resource.model'

const TAGS = ['Lesson Content']

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
const lessonIdParam = {
  params: z.object({ courseId: z.string(), moduleId: z.string(), lessonId: z.string() }),
}
const resourceIdParam = {
  params: z.object({
    courseId: z.string(),
    moduleId: z.string(),
    lessonId: z.string(),
    resourceId: z.string(),
  }),
}
const courseIdParam = { params: z.object({ courseId: z.string() }) }

const videoAssetSchema = z.object({
  format: z.string(),
  durationSeconds: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  bytes: z.number(),
  status: z.enum(MEDIA_ASSET_STATUSES),
  uploadedAt: z.iso.datetime(),
})

const documentAssetSchema = z.object({
  format: z.string(),
  bytes: z.number(),
  originalFilename: z.string(),
  uploadedAt: z.iso.datetime(),
})

const externalLinkSchema = z.object({
  url: z.string(),
  label: z.string().nullable(),
  description: z.string().nullable(),
  openInNewTab: z.boolean(),
  domain: z.string(),
})

const lessonContentSchema = z.object({
  lessonId: z.string(),
  courseId: z.string(),
  lessonType: z.string(),
  contentStatus: z.enum(CONTENT_STATUSES),
  textContent: z.string().nullable(),
  videoAsset: videoAssetSchema.nullable(),
  documentAsset: documentAssetSchema.nullable(),
  externalLink: externalLinkSchema.nullable(),
})

const signedUploadSchema = z.object({
  timestamp: z.number(),
  signature: z.string(),
  apiKey: z.string(),
  cloudName: z.string(),
  folder: z.string(),
  publicId: z.string(),
  resourceType: z.enum(['image', 'video', 'raw']),
  type: z.enum(['upload', 'authenticated']),
  allowedFormats: z.array(z.string()),
  maxFileSize: z.number(),
})

const signedDeliverySchema = z.object({ url: z.string(), expiresInSeconds: z.number() })

const contentReadinessSchema = z.object({
  contentStatus: z.enum(CONTENT_STATUSES),
  ready: z.boolean(),
  blockers: z.array(z.string()),
})

const lessonResourceSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  courseId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  resourceType: z.enum(LESSON_RESOURCE_TYPES),
  filename: z.string(),
  format: z.string(),
  mimeType: z.string(),
  bytes: z.number(),
  sortOrder: z.number(),
  isDownloadable: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

const launchReadinessSchema = z.object({
  ready: z.boolean(),
  courseMetadataReady: z.boolean(),
  curriculumStructureReady: z.boolean(),
  contentReady: z.boolean(),
  blockers: z.array(z.object({ field: z.string(), message: z.string() })),
  summary: z.object({
    publishedModuleCount: z.number(),
    publishedLessonCount: z.number(),
    publishedLessonsWithReadyContent: z.number(),
    publishedLessonsBlockingLaunch: z.number(),
  }),
})

// ---- Content ----------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/content',
  tags: TAGS,
  summary:
    "A lesson's content — exactly one of textContent/videoAsset/documentAsset/externalLink is populated, matching lessonType",
  security,
  request: lessonIdParam,
  responses: {
    200: {
      description: 'Lesson content',
      content: { 'application/json': { schema: successResponseSchema(lessonContentSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/content/readiness-check',
  tags: TAGS,
  summary:
    'Recompute and return content readiness for this lesson (server-computed, never client-settable)',
  security,
  request: lessonIdParam,
  responses: {
    200: {
      description: 'Content readiness result',
      content: { 'application/json': { schema: successResponseSchema(contentReadinessSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'put',
  path: '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/content/text',
  tags: TAGS,
  summary:
    "Set a TEXT lesson's rich-text content — sanitized server-side before storage (SECURITY.md)",
  security,
  request: { ...lessonIdParam, body: jsonBody(z.object({ textContent: z.string() })) },
  responses: {
    200: {
      description: 'Updated lesson content',
      content: { 'application/json': { schema: successResponseSchema(lessonContentSchema) } },
    },
    ...errorResponses(400, 401, 403, 404, 409),
  },
})

registry.registerPath({
  method: 'put',
  path: '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/content/external-link',
  tags: TAGS,
  summary:
    "Set an EXTERNAL_LINK lesson's link — http(s) only, javascript:/data:/file:/ftp: rejected",
  security,
  request: {
    ...lessonIdParam,
    body: jsonBody(
      z.object({
        url: z.string(),
        label: z.string().optional(),
        description: z.string().optional(),
        openInNewTab: z.boolean().optional(),
      }),
    ),
  },
  responses: {
    200: {
      description: 'Updated lesson content',
      content: { 'application/json': { schema: successResponseSchema(lessonContentSchema) } },
    },
    ...errorResponses(400, 401, 403, 404, 409),
  },
})

for (const kind of ['video', 'document'] as const) {
  registry.registerPath({
    method: 'post',
    path: `/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/content/${kind}/signature`,
    tags: TAGS,
    summary: `Get a signed direct-to-Cloudinary upload signature for this lesson's ${kind}`,
    description:
      'Folder/resource-type/allowed-formats/size-cap/public-id are all server-chosen — the client cannot request an arbitrary upload target (SECURITY.md).',
    security,
    request: lessonIdParam,
    responses: {
      200: {
        description: 'Signed upload params',
        content: { 'application/json': { schema: successResponseSchema(signedUploadSchema) } },
      },
      ...errorResponses(401, 403, 404, 409),
    },
  })

  registry.registerPath({
    method: 'post',
    path: `/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/content/${kind}/verify`,
    tags: TAGS,
    summary: `Independently verify a completed ${kind} upload against Cloudinary before trusting it`,
    description:
      'Never trusts a client-supplied secureUrl alone — calls the Cloudinary Admin API to confirm the asset exists, is the right resource type, and landed in the expected folder.',
    security,
    request: {
      ...lessonIdParam,
      body: jsonBody(
        kind === 'video'
          ? z.object({ publicId: z.string() })
          : z.object({ publicId: z.string(), originalFilename: z.string() }),
      ),
    },
    responses: {
      200: {
        description: 'Updated lesson content',
        content: { 'application/json': { schema: successResponseSchema(lessonContentSchema) } },
      },
      ...errorResponses(400, 401, 403, 404, 409),
    },
  })

  registry.registerPath({
    method: 'get',
    path: `/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/content/${kind}/preview-url`,
    tags: TAGS,
    summary: `Get a short-lived signed admin preview URL for this lesson's ${kind} (never a permanent URL)`,
    security,
    request: lessonIdParam,
    responses: {
      200: {
        description: 'Signed delivery URL',
        content: { 'application/json': { schema: successResponseSchema(signedDeliverySchema) } },
      },
      ...errorResponses(401, 403, 404, 409),
    },
  })

  registry.registerPath({
    method: 'delete',
    path: `/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/content/${kind}`,
    tags: TAGS,
    summary: `Remove this lesson's ${kind} (deletes the verified Cloudinary asset by its known public ID only)`,
    security,
    request: lessonIdParam,
    responses: {
      200: {
        description: 'Updated lesson content',
        content: { 'application/json': { schema: successResponseSchema(lessonContentSchema) } },
      },
      ...errorResponses(401, 403, 404, 409, 422),
    },
  })
}

// ---- Resources ----------------------------------------------------------------

registry.registerPath({
  method: 'post',
  path: '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/resources/signature',
  tags: TAGS,
  summary:
    'Get a signed direct-to-Cloudinary upload signature for a new downloadable lesson resource',
  security,
  request: lessonIdParam,
  responses: {
    200: {
      description: 'Signed upload params',
      content: { 'application/json': { schema: successResponseSchema(signedUploadSchema) } },
    },
    ...errorResponses(401, 403, 404, 422),
  },
})

registry.registerPath({
  method: 'post',
  path: '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/resources/verify',
  tags: TAGS,
  summary:
    'Verify a completed resource upload and add it to the lesson (resourceType/format/mimeType/bytes are server-derived)',
  security,
  request: {
    ...lessonIdParam,
    body: jsonBody(
      z.object({
        publicId: z.string(),
        filename: z.string(),
        title: z.string(),
        description: z.string().optional(),
        isDownloadable: z.boolean().optional(),
      }),
    ),
  },
  responses: {
    201: {
      description: 'Resource added',
      content: { 'application/json': { schema: successResponseSchema(lessonResourceSchema) } },
    },
    ...errorResponses(400, 401, 403, 404, 409, 422),
  },
})

registry.registerPath({
  method: 'get',
  path: '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/resources',
  tags: TAGS,
  summary: "List a lesson's downloadable resources in display order",
  security,
  request: lessonIdParam,
  responses: {
    200: {
      description: 'Resource list',
      content: {
        'application/json': { schema: successResponseSchema(z.array(lessonResourceSchema)) },
      },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'post',
  path: '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/resources/reorder',
  tags: TAGS,
  summary: "Reorder a lesson's resources — payload must name every current resource exactly once",
  security,
  request: {
    ...lessonIdParam,
    body: jsonBody(z.object({ items: z.array(z.object({ id: z.string(), order: z.number() })) })),
  },
  responses: {
    200: {
      description: 'Reordered resource list',
      content: {
        'application/json': { schema: successResponseSchema(z.array(lessonResourceSchema)) },
      },
    },
    ...errorResponses(400, 401, 403, 404),
  },
})

registry.registerPath({
  method: 'patch',
  path: '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/resources/{resourceId}',
  tags: TAGS,
  summary:
    "Update a resource's title/description/downloadability (never its file — replace via delete + re-add)",
  security,
  request: {
    ...resourceIdParam,
    body: jsonBody(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        isDownloadable: z.boolean().optional(),
      }),
    ),
  },
  responses: {
    200: {
      description: 'Updated resource',
      content: { 'application/json': { schema: successResponseSchema(lessonResourceSchema) } },
    },
    ...errorResponses(400, 401, 403, 404),
  },
})

registry.registerPath({
  method: 'get',
  path: '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/resources/{resourceId}/delivery-url',
  tags: TAGS,
  summary: 'Get a short-lived signed admin delivery URL for a resource (never a permanent URL)',
  security,
  request: resourceIdParam,
  responses: {
    200: {
      description: 'Signed delivery URL',
      content: { 'application/json': { schema: successResponseSchema(signedDeliverySchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

registry.registerPath({
  method: 'delete',
  path: '/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/resources/{resourceId}',
  tags: TAGS,
  summary:
    'Delete a resource (soft-deletes the record, deletes the verified Cloudinary asset by its known public ID only)',
  security,
  request: resourceIdParam,
  responses: {
    200: {
      description: 'Deleted',
      content: { 'application/json': { schema: successResponseSchema(z.null()) } },
    },
    ...errorResponses(401, 403, 404),
  },
})

// ---- Course launch readiness --------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/courses/{courseId}/launch-readiness',
  tags: TAGS,
  summary:
    'Course launch (learning content) readiness — a third, distinct concept from course metadata and curriculum structural readiness (ARCHITECTURE.md §21). Never implies Enrollment/payment/batch readiness.',
  security,
  request: courseIdParam,
  responses: {
    200: {
      description: 'Launch readiness result',
      content: { 'application/json': { schema: successResponseSchema(launchReadinessSchema) } },
    },
    ...errorResponses(401, 403, 404),
  },
})
