import { http, HttpResponse } from 'msw'

import { TEST_API_BASE_URL } from '@/test/api-base-url'
import type { CurriculumLesson, CurriculumModule } from '@/features/courses/curriculum/types'

/** Mirrors `backend/src/services/curriculum.service.ts`'s DTO shapes for the endpoints the frontend actually calls. */

let modules: CurriculumModule[] = []
let lessons: CurriculumLesson[] = []
let moduleCounter = 0
let lessonCounter = 0

function makeModule(
  overrides: Partial<CurriculumModule> & { courseId: string; order: number },
): CurriculumModule {
  moduleCounter += 1
  const now = new Date().toISOString()
  return {
    id: `module-${moduleCounter.toString()}`,
    title: 'Module',
    description: '',
    status: 'DRAFT',
    estimatedDurationMinutes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeLesson(
  overrides: Partial<CurriculumLesson> & {
    courseId: string
    courseModuleId: string
    order: number
  },
): CurriculumLesson {
  lessonCounter += 1
  const now = new Date().toISOString()
  return {
    id: `lesson-${lessonCounter.toString()}`,
    title: 'Lesson',
    shortDescription: '',
    lessonType: 'VIDEO',
    status: 'DRAFT',
    estimatedDurationMinutes: null,
    isPreview: false,
    isMandatory: true,
    prerequisiteLessonIds: [],
    contentStatus: 'EMPTY',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function resetCurriculumMockState(): void {
  moduleCounter = 0
  lessonCounter = 0
  const module1 = makeModule({ courseId: 'course-1', order: 0, title: 'Getting Started' })
  const module2 = makeModule({ courseId: 'course-1', order: 1, title: 'Advanced Topics' })
  modules = [module1, module2]
  lessons = [
    makeLesson({
      courseId: 'course-1',
      courseModuleId: module1.id,
      order: 0,
      title: 'Welcome',
      lessonType: 'VIDEO',
    }),
    makeLesson({
      courseId: 'course-1',
      courseModuleId: module1.id,
      order: 1,
      title: 'Setup',
      lessonType: 'DOCUMENT',
    }),
  ]
}

resetCurriculumMockState()

function successEnvelope<T>(data: T, message = 'Request completed successfully') {
  return { success: true, message, data, requestId: 'test-request-id' }
}

function errorEnvelope(message: string, code: string) {
  return { success: false, message, code, requestId: 'test-request-id' }
}

function courseModules(courseId: string): CurriculumModule[] {
  return modules.filter((module) => module.courseId === courseId).sort((a, b) => a.order - b.order)
}

function moduleLessons(moduleId: string): CurriculumLesson[] {
  return lessons
    .filter((lesson) => lesson.courseModuleId === moduleId)
    .sort((a, b) => a.order - b.order)
}

/** Cross-handler accessors (`lesson-content.handlers.ts`) — content-status changes must stay visible to the Curriculum Builder's own lesson list without duplicating this module's in-memory state. */
export function findLessonById(lessonId: string): CurriculumLesson | undefined {
  return lessons.find((lesson) => lesson.id === lessonId)
}
export function getModulesForCourse(courseId: string): CurriculumModule[] {
  return courseModules(courseId)
}
export function getLessonsForCourse(courseId: string): CurriculumLesson[] {
  return lessons.filter((lesson) => lesson.courseId === courseId)
}

function buildTree(courseId: string) {
  return {
    courseId,
    modules: courseModules(courseId).map((module) => ({
      ...module,
      lessons: moduleLessons(module.id),
    })),
  }
}

export const curriculumHandlers = [
  http.get(`${TEST_API_BASE_URL}/courses/:courseId/curriculum`, ({ params }) => {
    return HttpResponse.json(successEnvelope(buildTree(String(params.courseId))))
  }),

  http.post(`${TEST_API_BASE_URL}/courses/:courseId/curriculum/readiness-check`, ({ params }) => {
    const courseId = String(params.courseId)
    const mods = courseModules(courseId)
    const lsns = lessons.filter((lesson) => lesson.courseId === courseId)
    const ready = mods.length > 0 && lsns.length > 0
    return HttpResponse.json(
      successEnvelope({
        ready,
        blockers: ready ? [] : [{ field: 'modules', message: 'At least one module is required' }],
        summary: {
          moduleCount: mods.length,
          publishedModuleCount: mods.filter((m) => m.status === 'PUBLISHED').length,
          draftModuleCount: mods.filter((m) => m.status === 'DRAFT').length,
          lessonCount: lsns.length,
          publishedLessonCount: lsns.filter((l) => l.status === 'PUBLISHED').length,
          draftLessonCount: lsns.filter((l) => l.status === 'DRAFT').length,
        },
      }),
    )
  }),

  // Order matters: `/modules/reorder` must be registered before `/modules/:moduleId`.
  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/reorder`,
    async ({ params, request }) => {
      const courseId = String(params.courseId)
      const body = (await request.json()) as { items: { id: string; order: number }[] }
      for (const item of body.items) {
        const module = modules.find((m) => m.id === item.id)
        if (module) module.order = item.order
      }
      return HttpResponse.json(successEnvelope(courseModules(courseId)))
    },
  ),

  http.post(`${TEST_API_BASE_URL}/courses/:courseId/modules`, async ({ params, request }) => {
    const courseId = String(params.courseId)
    const body = (await request.json()) as {
      title: string
      description?: string
      estimatedDurationMinutes?: number
    }
    const order = courseModules(courseId).length
    const module = makeModule({
      courseId,
      order,
      title: body.title,
      description: body.description ?? '',
      estimatedDurationMinutes: body.estimatedDurationMinutes ?? null,
    })
    modules.push(module)
    return HttpResponse.json(successEnvelope(module, 'Module created'), { status: 201 })
  }),

  http.patch(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId`,
    async ({ params, request }) => {
      const module = modules.find((m) => m.id === params.moduleId)
      if (!module)
        return HttpResponse.json(errorEnvelope('Module not found', 'NOT_FOUND'), { status: 404 })
      const body = (await request.json()) as Partial<CurriculumModule>
      Object.assign(module, body)
      return HttpResponse.json(successEnvelope(module, 'Module updated'))
    },
  ),

  http.delete(`${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId`, ({ params }) => {
    const module = modules.find((m) => m.id === params.moduleId)
    if (!module)
      return HttpResponse.json(errorEnvelope('Module not found', 'NOT_FOUND'), { status: 404 })
    modules = modules.filter((m) => m.id !== module.id)
    lessons = lessons.filter((lesson) => lesson.courseModuleId !== module.id)
    return HttpResponse.json(successEnvelope(null, 'Module deleted'))
  }),

  http.post(`${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/archive`, ({ params }) => {
    const module = modules.find((m) => m.id === params.moduleId)
    if (!module)
      return HttpResponse.json(errorEnvelope('Module not found', 'NOT_FOUND'), { status: 404 })
    module.status = 'ARCHIVED'
    return HttpResponse.json(successEnvelope(module, 'Module archived'))
  }),

  http.post(`${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/restore`, ({ params }) => {
    const module = modules.find((m) => m.id === params.moduleId)
    if (!module)
      return HttpResponse.json(errorEnvelope('Module not found', 'NOT_FOUND'), { status: 404 })
    module.status = 'DRAFT'
    return HttpResponse.json(successEnvelope(module, 'Module restored'))
  }),

  http.post(`${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/duplicate`, ({ params }) => {
    const source = modules.find((m) => m.id === params.moduleId)
    if (!source)
      return HttpResponse.json(errorEnvelope('Module not found', 'NOT_FOUND'), { status: 404 })
    const order = courseModules(source.courseId).length
    const duplicate = makeModule({
      courseId: source.courseId,
      order,
      title: `${source.title} (Copy)`,
      description: source.description,
      estimatedDurationMinutes: source.estimatedDurationMinutes,
    })
    modules.push(duplicate)
    return HttpResponse.json(successEnvelope(duplicate, 'Module duplicated'), { status: 201 })
  }),

  http.post(`${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/publish`, ({ params }) => {
    const module = modules.find((m) => m.id === params.moduleId)
    if (!module)
      return HttpResponse.json(errorEnvelope('Module not found', 'NOT_FOUND'), { status: 404 })
    module.status = 'PUBLISHED'
    return HttpResponse.json(successEnvelope(module, 'Module published'))
  }),

  http.post(`${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/unpublish`, ({ params }) => {
    const module = modules.find((m) => m.id === params.moduleId)
    if (!module)
      return HttpResponse.json(errorEnvelope('Module not found', 'NOT_FOUND'), { status: 404 })
    module.status = 'DRAFT'
    return HttpResponse.json(successEnvelope(module, 'Module moved to draft'))
  }),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons`,
    async ({ params, request }) => {
      const courseId = String(params.courseId)
      const moduleId = String(params.moduleId)
      const body = (await request.json()) as Partial<CurriculumLesson> & { title: string }
      const order = moduleLessons(moduleId).length
      const lesson = makeLesson({
        courseId,
        courseModuleId: moduleId,
        order,
        title: body.title,
        shortDescription: body.shortDescription ?? '',
        lessonType: body.lessonType ?? 'VIDEO',
        estimatedDurationMinutes: body.estimatedDurationMinutes ?? null,
        isPreview: body.isPreview ?? false,
        isMandatory: body.isMandatory ?? true,
        prerequisiteLessonIds: body.prerequisiteLessonIds ?? [],
      })
      lessons.push(lesson)
      return HttpResponse.json(successEnvelope(lesson, 'Lesson created'), { status: 201 })
    },
  ),

  http.patch(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId`,
    async ({ params, request }) => {
      const lesson = lessons.find((l) => l.id === params.lessonId)
      if (!lesson)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      const body = (await request.json()) as Partial<CurriculumLesson>
      Object.assign(lesson, body)
      return HttpResponse.json(successEnvelope(lesson, 'Lesson updated'))
    },
  ),

  http.delete(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId`,
    ({ params }) => {
      const lesson = lessons.find((l) => l.id === params.lessonId)
      if (!lesson)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      lessons = lessons.filter((l) => l.id !== lesson.id)
      return HttpResponse.json(successEnvelope(null, 'Lesson deleted'))
    },
  ),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/archive`,
    ({ params }) => {
      const lesson = lessons.find((l) => l.id === params.lessonId)
      if (!lesson)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      lesson.status = 'ARCHIVED'
      return HttpResponse.json(successEnvelope(lesson, 'Lesson archived'))
    },
  ),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/restore`,
    ({ params }) => {
      const lesson = lessons.find((l) => l.id === params.lessonId)
      if (!lesson)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      lesson.status = 'DRAFT'
      return HttpResponse.json(successEnvelope(lesson, 'Lesson restored'))
    },
  ),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/duplicate`,
    ({ params }) => {
      const source = lessons.find((l) => l.id === params.lessonId)
      if (!source)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      const order = moduleLessons(source.courseModuleId).length
      const duplicate = makeLesson({
        courseId: source.courseId,
        courseModuleId: source.courseModuleId,
        order,
        title: `${source.title} (Copy)`,
        shortDescription: source.shortDescription,
        lessonType: source.lessonType,
        estimatedDurationMinutes: source.estimatedDurationMinutes,
        isPreview: source.isPreview,
        isMandatory: source.isMandatory,
        prerequisiteLessonIds: source.prerequisiteLessonIds,
      })
      lessons.push(duplicate)
      return HttpResponse.json(successEnvelope(duplicate, 'Lesson duplicated'), { status: 201 })
    },
  ),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/publish`,
    ({ params }) => {
      const lesson = lessons.find((l) => l.id === params.lessonId)
      if (!lesson)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      lesson.status = 'PUBLISHED'
      return HttpResponse.json(successEnvelope(lesson, 'Lesson published'))
    },
  ),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/modules/:moduleId/lessons/:lessonId/unpublish`,
    ({ params }) => {
      const lesson = lessons.find((l) => l.id === params.lessonId)
      if (!lesson)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      lesson.status = 'DRAFT'
      return HttpResponse.json(successEnvelope(lesson, 'Lesson moved to draft'))
    },
  ),

  // Order matters: `/lessons/reorder` must be registered before `/lessons/:lessonId/move`.
  http.post(`${TEST_API_BASE_URL}/courses/:courseId/lessons/reorder`, async ({ request }) => {
    const body = (await request.json()) as {
      moduleId: string
      items: { id: string; order: number }[]
    }
    for (const item of body.items) {
      const lesson = lessons.find((l) => l.id === item.id)
      if (lesson) lesson.order = item.order
    }
    return HttpResponse.json(successEnvelope(moduleLessons(body.moduleId)))
  }),

  http.post(
    `${TEST_API_BASE_URL}/courses/:courseId/lessons/:lessonId/move`,
    async ({ params, request }) => {
      const lesson = lessons.find((l) => l.id === params.lessonId)
      if (!lesson)
        return HttpResponse.json(errorEnvelope('Lesson not found', 'NOT_FOUND'), { status: 404 })
      const body = (await request.json()) as { targetModuleId: string; targetOrder: number }
      lesson.courseModuleId = body.targetModuleId
      lesson.order = body.targetOrder
      return HttpResponse.json(successEnvelope(lesson, 'Lesson moved'))
    },
  ),
]
