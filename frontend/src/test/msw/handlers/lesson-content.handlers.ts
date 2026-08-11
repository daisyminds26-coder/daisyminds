import { http, HttpResponse } from 'msw'

import { TEST_API_BASE_URL } from '@/test/api-base-url'
import { findCourseById } from '@/test/msw/handlers/courses.handlers'
import {
  findLessonById,
  getLessonsForCourse,
  getModulesForCourse,
} from '@/test/msw/handlers/curriculum.handlers'
import type {
  ContentStatus,
  CourseLaunchReadiness,
  LessonContent,
  LessonResource,
  SignedUploadParams,
} from '@/features/courses/curriculum/content/types'

let contents = new Map<string, LessonContent>()
let resources: LessonResource[] = []
let resourceCounter = 0
let uploadCounter = 0

function emptyContent(
  lessonId: string,
  courseId: string,
  lessonType: LessonContent['lessonType'],
): LessonContent {
  return {
    lessonId,
    courseId,
    lessonType,
    contentStatus: 'EMPTY',
    textContent: null,
    videoAsset: null,
    documentAsset: null,
    externalLink: null,
  }
}

export function resetLessonContentMockState(): void {
  contents = new Map()
  resources = []
  resourceCounter = 0
  uploadCounter = 0
}

function successEnvelope<T>(data: T, message = 'Request completed successfully') {
  return { success: true, message, data, requestId: 'test-request-id' }
}

function errorEnvelope(message: string, code: string) {
  return { success: false, message, code, requestId: 'test-request-id' }
}

function getOrInitContent(lessonId: string): LessonContent | null {
  const existing = contents.get(lessonId)
  if (existing) return existing
  const lesson = findLessonById(lessonId)
  if (!lesson) return null
  const created = emptyContent(lessonId, lesson.courseId, lesson.lessonType)
  contents.set(lessonId, created)
  return created
}

function setContentStatus(lessonId: string, status: ContentStatus) {
  const lesson = findLessonById(lessonId)
  if (lesson) lesson.contentStatus = status
}

function computeStatus(content: LessonContent): ContentStatus {
  switch (content.lessonType) {
    case 'TEXT':
      if (!content.textContent) return 'EMPTY'
      return content.textContent.replace(/<[^>]*>/g, '').trim().length === 0
        ? 'INCOMPLETE'
        : 'READY'
    case 'VIDEO':
      if (!content.videoAsset) return 'EMPTY'
      return content.videoAsset.status === 'READY' ? 'READY' : 'PROCESSING'
    case 'DOCUMENT':
      return content.documentAsset ? 'READY' : 'EMPTY'
    case 'EXTERNAL_LINK':
      return content.externalLink?.url ? 'READY' : 'EMPTY'
    default:
      return 'NOT_CONFIGURED'
  }
}

function signature(
  folder: string,
  resourceType: SignedUploadParams['resourceType'],
): SignedUploadParams {
  uploadCounter += 1
  return {
    timestamp: Date.now(),
    signature: 'fake-signature',
    apiKey: 'fake-key',
    cloudName: 'fake-cloud',
    folder,
    publicId: `${folder}/upload-${uploadCounter.toString()}`,
    resourceType,
    type: 'authenticated',
    allowedFormats: resourceType === 'video' ? ['mp4', 'webm', 'mov'] : ['pdf'],
    maxFileSize: 500 * 1024 * 1024,
  }
}

export const lessonContentHandlers = [
  // The direct-to-Cloudinary upload itself — a real external URL, never proxied through the backend (ARCHITECTURE.md §21) — so tests must intercept it too, not just the backend API.
  http.post('https://api.cloudinary.com/v1_1/:cloudName/:resourceType/upload', () => {
    return HttpResponse.json({ secure_url: 'https://res.cloudinary.com/fake-cloud/fake-upload' })
  }),

  http.get(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/content`,
    ({ params }) => {
      const content = getOrInitContent(String(params.lessonId))
      if (!content)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      return HttpResponse.json(successEnvelope(content))
    },
  ),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/readiness-check`,
    ({ params }) => {
      const content = getOrInitContent(String(params.lessonId))
      if (!content)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      const status = computeStatus(content)
      return HttpResponse.json(
        successEnvelope({
          contentStatus: status,
          ready: status === 'READY',
          blockers: status === 'READY' ? [] : ['No content has been added yet'],
        }),
      )
    },
  ),

  http.put(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/text`,
    async ({ params, request }) => {
      const lessonId = String(params.lessonId)
      const content = getOrInitContent(lessonId)
      if (!content)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      const body = (await request.json()) as { textContent: string }
      content.textContent = body.textContent
      content.contentStatus = computeStatus(content)
      setContentStatus(lessonId, content.contentStatus)
      return HttpResponse.json(successEnvelope(content, 'Text content updated'))
    },
  ),

  http.put(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/external-link`,
    async ({ params, request }) => {
      const lessonId = String(params.lessonId)
      const content = getOrInitContent(lessonId)
      if (!content)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      const body = (await request.json()) as {
        url: string
        label?: string
        description?: string
        openInNewTab?: boolean
      }
      const domain = (() => {
        try {
          return new URL(body.url).hostname
        } catch {
          return ''
        }
      })()
      content.externalLink = {
        url: body.url,
        label: body.label ?? null,
        description: body.description ?? null,
        openInNewTab: body.openInNewTab ?? true,
        domain,
      }
      content.contentStatus = computeStatus(content)
      setContentStatus(lessonId, content.contentStatus)
      return HttpResponse.json(successEnvelope(content, 'External link updated'))
    },
  ),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/video/signature`,
    ({ params }) => {
      const folder = `daisy-minds/courses/${String(params.courseId)}/lessons/${String(params.lessonId)}/video`
      return HttpResponse.json(successEnvelope(signature(folder, 'video')))
    },
  ),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/video/verify`,
    ({ params }) => {
      const lessonId = String(params.lessonId)
      const content = getOrInitContent(lessonId)
      if (!content)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      content.videoAsset = {
        format: 'mp4',
        durationSeconds: 90,
        width: 1280,
        height: 720,
        bytes: 5 * 1024 * 1024,
        status: 'READY',
        uploadedAt: new Date().toISOString(),
      }
      content.contentStatus = computeStatus(content)
      setContentStatus(lessonId, content.contentStatus)
      return HttpResponse.json(successEnvelope(content, 'Video updated'))
    },
  ),

  http.get(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/video/preview-url`,
    ({ params }) => {
      const content = getOrInitContent(String(params.lessonId))
      if (!content?.videoAsset) {
        return HttpResponse.json(
          errorEnvelope('This lesson has no video to preview', 'UNPROCESSABLE_ENTITY'),
          { status: 422 },
        )
      }
      return HttpResponse.json(
        successEnvelope({
          url: 'https://res.cloudinary.com/demo/video/authenticated/preview.mp4',
          expiresInSeconds: 300,
        }),
      )
    },
  ),

  http.delete(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/video`,
    ({ params }) => {
      const lessonId = String(params.lessonId)
      const content = getOrInitContent(lessonId)
      if (!content)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      content.videoAsset = null
      content.contentStatus = computeStatus(content)
      setContentStatus(lessonId, content.contentStatus)
      return HttpResponse.json(successEnvelope(content, 'Video removed'))
    },
  ),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/document/signature`,
    ({ params }) => {
      const folder = `daisy-minds/courses/${String(params.courseId)}/lessons/${String(params.lessonId)}/document`
      return HttpResponse.json(successEnvelope(signature(folder, 'raw')))
    },
  ),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/document/verify`,
    async ({ params, request }) => {
      const lessonId = String(params.lessonId)
      const content = getOrInitContent(lessonId)
      if (!content)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      const body = (await request.json()) as { originalFilename: string }
      content.documentAsset = {
        format: 'pdf',
        bytes: 512 * 1024,
        originalFilename: body.originalFilename,
        uploadedAt: new Date().toISOString(),
      }
      content.contentStatus = computeStatus(content)
      setContentStatus(lessonId, content.contentStatus)
      return HttpResponse.json(successEnvelope(content, 'Document updated'))
    },
  ),

  http.get(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/document/preview-url`,
    ({ params }) => {
      const content = getOrInitContent(String(params.lessonId))
      if (!content?.documentAsset) {
        return HttpResponse.json(
          errorEnvelope('This lesson has no document to preview', 'UNPROCESSABLE_ENTITY'),
          { status: 422 },
        )
      }
      return HttpResponse.json(
        successEnvelope({
          url: 'https://res.cloudinary.com/demo/raw/authenticated/preview.pdf',
          expiresInSeconds: 300,
        }),
      )
    },
  ),

  http.delete(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/document`,
    ({ params }) => {
      const lessonId = String(params.lessonId)
      const content = getOrInitContent(lessonId)
      if (!content)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      content.documentAsset = null
      content.contentStatus = computeStatus(content)
      setContentStatus(lessonId, content.contentStatus)
      return HttpResponse.json(successEnvelope(content, 'Document removed'))
    },
  ),

  // ---- Resources ----------------------------------------------------------

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/resources/signature`,
    ({ params }) => {
      const folder = `daisy-minds/courses/${String(params.courseId)}/lessons/${String(params.lessonId)}/resources`
      return HttpResponse.json(successEnvelope(signature(folder, 'raw')))
    },
  ),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/resources/verify`,
    async ({ params, request }) => {
      const lessonId = String(params.lessonId)
      const lesson = findLessonById(lessonId)
      if (!lesson)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      const body = (await request.json()) as {
        filename: string
        title: string
        description?: string
        isDownloadable?: boolean
      }
      resourceCounter += 1
      const resource: LessonResource = {
        id: `resource-${resourceCounter.toString()}`,
        lessonId,
        courseId: lesson.courseId,
        title: body.title,
        description: body.description ?? null,
        resourceType: 'PDF',
        filename: body.filename,
        format: 'pdf',
        mimeType: 'application/pdf',
        bytes: 200 * 1024,
        sortOrder: resources.filter((r) => r.lessonId === lessonId).length,
        isDownloadable: body.isDownloadable ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      resources.push(resource)
      return HttpResponse.json(successEnvelope(resource, 'Resource added'), { status: 201 })
    },
  ),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/resources/reorder`,
    async ({ params, request }) => {
      const lessonId = String(params.lessonId)
      const body = (await request.json()) as { items: { id: string; order: number }[] }
      for (const item of body.items) {
        const resource = resources.find((r) => r.id === item.id)
        if (resource) resource.sortOrder = item.order
      }
      const list = resources
        .filter((r) => r.lessonId === lessonId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      return HttpResponse.json(successEnvelope(list))
    },
  ),

  http.get(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/resources`,
    ({ params }) => {
      const lessonId = String(params.lessonId)
      const list = resources
        .filter((r) => r.lessonId === lessonId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      return HttpResponse.json(successEnvelope(list))
    },
  ),

  http.patch(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/resources/:resourceId`,
    async ({ params, request }) => {
      const resource = resources.find((r) => r.id === params.resourceId)
      if (!resource) {
        return HttpResponse.json(errorEnvelope('Resource not found', 'NOT_FOUND'), { status: 404 })
      }
      const body = (await request.json()) as Partial<LessonResource>
      Object.assign(resource, body)
      return HttpResponse.json(successEnvelope(resource, 'Resource updated'))
    },
  ),

  http.get(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/resources/:resourceId/delivery-url`,
    ({ params }) => {
      const resource = resources.find((r) => r.id === params.resourceId)
      if (!resource) {
        return HttpResponse.json(errorEnvelope('Resource not found', 'NOT_FOUND'), { status: 404 })
      }
      return HttpResponse.json(
        successEnvelope({
          url: 'https://res.cloudinary.com/demo/raw/authenticated/resource.pdf',
          expiresInSeconds: 300,
        }),
      )
    },
  ),

  http.delete(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/resources/:resourceId`,
    ({ params }) => {
      const resource = resources.find((r) => r.id === params.resourceId)
      if (!resource) {
        return HttpResponse.json(errorEnvelope('Resource not found', 'NOT_FOUND'), { status: 404 })
      }
      resources = resources.filter((r) => r.id !== resource.id)
      return HttpResponse.json(successEnvelope(null, 'Resource deleted'))
    },
  ),

  // ---- Course launch readiness --------------------------------------------

  http.get(`${TEST_API_BASE_URL}/courses/:courseId/launch-readiness`, ({ params }) => {
    const courseId = String(params.courseId)
    const course = findCourseById(courseId)
    if (!course)
      return HttpResponse.json(errorEnvelope('Course not found', 'NOT_FOUND'), { status: 404 })

    const courseMetadataReady = Boolean(course.thumbnailUrl)
    const modules = getModulesForCourse(courseId)
    const lessons = getLessonsForCourse(courseId)
    const curriculumStructureReady = modules.length > 0 && lessons.length > 0
    const publishedModules = modules.filter((m) => m.status === 'PUBLISHED')
    const publishedLessons = lessons.filter((l) => l.status === 'PUBLISHED')
    const notReady = publishedLessons.filter((l) => l.contentStatus !== 'READY')
    const contentReady = publishedModules.length > 0 && notReady.length === 0

    const result: CourseLaunchReadiness = {
      ready: courseMetadataReady && curriculumStructureReady && contentReady,
      courseMetadataReady,
      curriculumStructureReady,
      contentReady,
      blockers: [
        ...(courseMetadataReady
          ? []
          : [
              { field: 'course.thumbnailUrl', message: 'A thumbnail image is required to publish' },
            ]),
        ...(publishedModules.length === 0
          ? [{ field: 'modules', message: 'At least one published module is required' }]
          : []),
        ...notReady.map((lesson) => ({
          field: `lessons.${lesson.id}`,
          message: `"${lesson.title}" is published but its content is not ready`,
        })),
      ],
      summary: {
        publishedModuleCount: publishedModules.length,
        publishedLessonCount: publishedLessons.length,
        publishedLessonsWithReadyContent: publishedLessons.length - notReady.length,
        publishedLessonsBlockingLaunch: notReady.length,
      },
    }
    return HttpResponse.json(successEnvelope(result))
  }),
]
