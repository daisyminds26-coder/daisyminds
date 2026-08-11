import type { Request, Response } from 'express'

import { ApiError } from '../utils/api-error'
import { sendCreated, sendSuccess } from '../utils/api-response'
import { curriculumService } from '../services/curriculum.service'
import { curriculumDuplicationService } from '../services/curriculum-duplication.service'
import type { RequestContext } from '../services/user-management.service'
import type {
  CourseIdParam,
  CourseLessonIdParam,
  CreateLessonInput,
  CreateModuleInput,
  LessonIdParam,
  ModuleIdParam,
  MoveLessonInput,
  ReorderLessonsInput,
  ReorderModulesInput,
  UpdateLessonInput,
  UpdateModuleInput,
} from '../validators/curriculum.validator'

function getRequestContext(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  }
}

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw ApiError.unauthorized()
  }
  return req.user
}

export async function getCurriculum(req: Request, res: Response): Promise<void> {
  const { courseId } = req.validated?.params as CourseIdParam
  const tree = await curriculumService.getCurriculumTree(courseId)
  sendSuccess(res, { data: tree })
}

export async function checkCurriculumReadiness(req: Request, res: Response): Promise<void> {
  const { courseId } = req.validated?.params as CourseIdParam
  const readiness = await curriculumService.checkCurriculumReadiness(courseId)
  sendSuccess(res, { data: readiness })
}

export async function createModule(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId } = req.validated?.params as CourseIdParam
  const input = req.validated?.body as CreateModuleInput
  const dto = await curriculumService.createModule(courseId, input, actor, getRequestContext(req))
  sendCreated(res, { message: 'Module created', data: dto })
}

export async function updateModule(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId } = req.validated?.params as ModuleIdParam
  const input = req.validated?.body as UpdateModuleInput
  const dto = await curriculumService.updateModule(
    courseId,
    moduleId,
    input,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Module updated', data: dto })
}

export async function reorderModules(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId } = req.validated?.params as CourseIdParam
  const input = req.validated?.body as ReorderModulesInput
  const dtos = await curriculumService.reorderModules(
    courseId,
    input,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Modules reordered', data: dtos })
}

export async function archiveModule(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId } = req.validated?.params as ModuleIdParam
  const dto = await curriculumService.archiveModule(
    courseId,
    moduleId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Module archived', data: dto })
}

export async function publishModule(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId } = req.validated?.params as ModuleIdParam
  const dto = await curriculumService.publishModule(
    courseId,
    moduleId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Module published', data: dto })
}

export async function unpublishModule(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId } = req.validated?.params as ModuleIdParam
  const dto = await curriculumService.unpublishModule(
    courseId,
    moduleId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Module moved to draft', data: dto })
}

export async function restoreModule(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId } = req.validated?.params as ModuleIdParam
  const dto = await curriculumService.restoreModule(
    courseId,
    moduleId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Module restored', data: dto })
}

export async function deleteModule(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId } = req.validated?.params as ModuleIdParam
  await curriculumService.deleteModule(courseId, moduleId, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Module deleted' })
}

export async function duplicateModule(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId } = req.validated?.params as ModuleIdParam
  const dto = await curriculumDuplicationService.duplicateModule(
    courseId,
    moduleId,
    actor,
    getRequestContext(req),
  )
  sendCreated(res, { message: 'Module duplicated', data: dto })
}

export async function createLesson(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId } = req.validated?.params as ModuleIdParam
  const input = req.validated?.body as CreateLessonInput
  const dto = await curriculumService.createLesson(
    courseId,
    moduleId,
    input,
    actor,
    getRequestContext(req),
  )
  sendCreated(res, { message: 'Lesson created', data: dto })
}

export async function updateLesson(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const input = req.validated?.body as UpdateLessonInput
  const dto = await curriculumService.updateLesson(
    courseId,
    moduleId,
    lessonId,
    input,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Lesson updated', data: dto })
}

export async function reorderLessons(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId } = req.validated?.params as CourseIdParam
  const input = req.validated?.body as ReorderLessonsInput
  const dtos = await curriculumService.reorderLessons(
    courseId,
    input,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Lessons reordered', data: dtos })
}

export async function moveLesson(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, lessonId } = req.validated?.params as CourseLessonIdParam
  const input = req.validated?.body as MoveLessonInput
  const dto = await curriculumService.moveLesson(
    courseId,
    lessonId,
    input,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Lesson moved', data: dto })
}

export async function archiveLesson(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const dto = await curriculumService.archiveLesson(
    courseId,
    moduleId,
    lessonId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Lesson archived', data: dto })
}

export async function publishLesson(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const dto = await curriculumService.publishLesson(
    courseId,
    moduleId,
    lessonId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Lesson published', data: dto })
}

export async function unpublishLesson(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const dto = await curriculumService.unpublishLesson(
    courseId,
    moduleId,
    lessonId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Lesson moved to draft', data: dto })
}

export async function deleteLesson(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  await curriculumService.deleteLesson(courseId, moduleId, lessonId, actor, getRequestContext(req))
  sendSuccess(res, { message: 'Lesson deleted' })
}

export async function restoreLesson(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const dto = await curriculumService.restoreLesson(
    courseId,
    moduleId,
    lessonId,
    actor,
    getRequestContext(req),
  )
  sendSuccess(res, { message: 'Lesson restored', data: dto })
}

export async function duplicateLesson(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req)
  const { courseId, moduleId, lessonId } = req.validated?.params as LessonIdParam
  const dto = await curriculumDuplicationService.duplicateLesson(
    courseId,
    moduleId,
    lessonId,
    actor,
    getRequestContext(req),
  )
  sendCreated(res, { message: 'Lesson duplicated', data: dto })
}
