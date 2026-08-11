import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { withTransaction } from '../utils/transaction'
import { findSetMismatch, normalizeOrders } from '../utils/curriculum-order.util'
import { hasCycle, type LessonPrerequisiteEdge } from '../utils/curriculum-prerequisite.util'
import { computeContentStatus, hasExistingContent } from '../utils/lesson-content-status.util'
import { curriculumRepository } from '../repositories/curriculum.repository'
import {
  assertCourseExists,
  assertEditableCourse,
  assertLessonInModule,
  assertValidPrerequisites,
  recordCurriculumAudit,
  requireLesson,
  requireModule,
} from './curriculum-helpers'
import {
  toLessonDto,
  toModuleDto,
  type CurriculumReadinessResult,
  type CurriculumTreeDto,
  type LessonDto,
  type ModuleDto,
} from './curriculum-dto'
import type {
  CreateLessonInput,
  CreateModuleInput,
  MoveLessonInput,
  ReorderLessonsInput,
  ReorderModulesInput,
  UpdateLessonInput,
  UpdateModuleInput,
} from '../validators/curriculum.validator'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'

export const curriculumService = {
  async getCurriculumTree(courseId: string): Promise<CurriculumTreeDto> {
    await assertCourseExists(courseId)

    const [modules, lessons] = await Promise.all([
      curriculumRepository.findModulesByCourse(courseId),
      curriculumRepository.findLessonsByCourse(courseId),
    ])

    const lessonsByModule = new Map<string, LessonDto[]>()
    for (const lesson of lessons) {
      const key = lesson.courseModuleId.toString()
      const existing = lessonsByModule.get(key) ?? []
      existing.push(toLessonDto(lesson))
      lessonsByModule.set(key, existing)
    }

    return {
      courseId,
      modules: modules.map((module) => ({
        ...toModuleDto(module),
        lessons: lessonsByModule.get(module._id.toString()) ?? [],
      })),
    }
  },

  /**
   * Structural readiness only (ARCHITECTURE.md §20) — never checks for
   * actual lesson content (Phase 9C). Blank-title/duplicate-order/invalid-
   * lesson-type checks are deliberately omitted: they're structurally
   * unreachable given create/update validation and server-controlled
   * ordering, matching the same "don't check the unreachable" precedent
   * `course-management.service.ts#checkReadiness` set in Phase 9A.
   */
  async checkCurriculumReadiness(courseId: string): Promise<CurriculumReadinessResult> {
    await assertCourseExists(courseId)

    const [modules, lessons] = await Promise.all([
      curriculumRepository.findModulesByCourse(courseId),
      curriculumRepository.findLessonsByCourse(courseId),
    ])

    const blockers: CurriculumReadinessResult['blockers'] = []
    const moduleIds = new Set(modules.map((module) => module._id.toString()))
    const moduleById = new Map(modules.map((module) => [module._id.toString(), module]))

    if (modules.length === 0) {
      blockers.push({ field: 'modules', message: 'At least one module is required' })
    }
    if (lessons.length === 0) {
      blockers.push({ field: 'lessons', message: 'At least one lesson is required' })
    }

    for (const lesson of lessons) {
      const moduleIdStr = lesson.courseModuleId.toString()
      if (!moduleIds.has(moduleIdStr)) {
        blockers.push({
          field: `lessons.${lesson._id.toString()}`,
          message: `"${lesson.title}" does not belong to an active module`,
        })
        continue
      }
      if (lesson.status === 'PUBLISHED' && moduleById.get(moduleIdStr)?.status === 'ARCHIVED') {
        blockers.push({
          field: `lessons.${lesson._id.toString()}`,
          message: `"${lesson.title}" is published but its module is archived`,
        })
      }
    }

    const edges: LessonPrerequisiteEdge[] = lessons.map((lesson) => ({
      lessonId: lesson._id.toString(),
      prerequisiteLessonIds: lesson.prerequisiteLessonIds.map((id) => id.toString()),
    }))
    if (hasCycle(edges)) {
      blockers.push({
        field: 'prerequisites',
        message: 'The prerequisite graph contains a circular dependency',
      })
    }

    return {
      ready: blockers.length === 0,
      blockers,
      summary: {
        moduleCount: modules.length,
        publishedModuleCount: modules.filter((m) => m.status === 'PUBLISHED').length,
        draftModuleCount: modules.filter((m) => m.status === 'DRAFT').length,
        lessonCount: lessons.length,
        publishedLessonCount: lessons.filter((l) => l.status === 'PUBLISHED').length,
        draftLessonCount: lessons.filter((l) => l.status === 'DRAFT').length,
      },
    }
  },

  // ---- Modules ----------------------------------------------------------

  async createModule(
    courseId: string,
    input: CreateModuleInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<ModuleDto> {
    await assertEditableCourse(courseId)
    const order = await curriculumRepository.nextModuleOrder(courseId)

    const module = await curriculumRepository.createModule({
      courseId: new Types.ObjectId(courseId),
      title: input.title,
      description: input.description ?? '',
      estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
      order,
      status: 'DRAFT',
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    })

    await recordCurriculumAudit(courseId, 'curriculum.module.created', actor, context, {
      moduleId: module._id.toString(),
      title: module.title,
    })

    return toModuleDto(module)
  },

  async updateModule(
    courseId: string,
    moduleId: string,
    input: UpdateModuleInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<ModuleDto> {
    await assertEditableCourse(courseId)
    await requireModule(courseId, moduleId)

    const updated = await curriculumRepository.updateModuleById(moduleId, {
      ...input,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Module not found')

    await recordCurriculumAudit(courseId, 'curriculum.module.updated', actor, context, {
      moduleId: updated._id.toString(),
    })

    return toModuleDto(updated)
  },

  async reorderModules(
    courseId: string,
    input: ReorderModulesInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<ModuleDto[]> {
    await assertEditableCourse(courseId)
    const existing = await curriculumRepository.findModulesByCourse(courseId)
    const existingIds = existing.map((module) => module._id.toString())

    const { missingIds, unknownIds } = findSetMismatch(existingIds, input.items)
    if (missingIds.length > 0 || unknownIds.length > 0) {
      throw ApiError.badRequest('Reorder payload must include exactly the current modules', [
        { field: 'items', message: 'Reorder payload must include exactly the current modules' },
      ])
    }

    const updates = normalizeOrders(input.items)
    await withTransaction((session) =>
      curriculumRepository.bulkUpdateModuleOrders(updates, session),
    )

    await recordCurriculumAudit(courseId, 'curriculum.module.reordered', actor, context, {
      moduleIds: updates.map((item) => item.id),
    })

    const reordered = await curriculumRepository.findModulesByCourse(courseId)
    return reordered.map(toModuleDto)
  },

  async archiveModule(
    courseId: string,
    moduleId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<ModuleDto> {
    await assertEditableCourse(courseId)
    const module = await requireModule(courseId, moduleId)
    if (module.status === 'ARCHIVED') {
      throw ApiError.conflict('Module is already archived')
    }

    const updated = await curriculumRepository.updateModuleById(moduleId, {
      status: 'ARCHIVED',
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Module not found')

    await recordCurriculumAudit(courseId, 'curriculum.module.archived', actor, context, {
      moduleId,
    })
    return toModuleDto(updated)
  },

  async publishModule(
    courseId: string,
    moduleId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<ModuleDto> {
    await assertEditableCourse(courseId)
    const module = await requireModule(courseId, moduleId)
    if (module.status === 'PUBLISHED') {
      throw ApiError.conflict('Module is already published')
    }

    const updated = await curriculumRepository.updateModuleById(moduleId, {
      status: 'PUBLISHED',
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Module not found')

    await recordCurriculumAudit(courseId, 'curriculum.item.published', actor, context, {
      itemType: 'module',
      moduleId,
    })
    return toModuleDto(updated)
  },

  async unpublishModule(
    courseId: string,
    moduleId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<ModuleDto> {
    await assertEditableCourse(courseId)
    const module = await requireModule(courseId, moduleId)
    if (module.status !== 'PUBLISHED') {
      throw ApiError.conflict('Only a published module can be unpublished')
    }

    const updated = await curriculumRepository.updateModuleById(moduleId, {
      status: 'DRAFT',
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Module not found')

    await recordCurriculumAudit(courseId, 'curriculum.item.unpublished', actor, context, {
      itemType: 'module',
      moduleId,
    })
    return toModuleDto(updated)
  },

  /** Soft-deletes the module and every one of its currently-active lessons in one transaction, tombstoning the cascaded lessons (`deletedWithModule: true`) so `restoreModule` restores only them, never a lesson deleted independently beforehand. */
  async deleteModule(
    courseId: string,
    moduleId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    await assertEditableCourse(courseId)
    await requireModule(courseId, moduleId)

    const cascadedLessonIds = await withTransaction(async (session) => {
      const lessons = await curriculumRepository.findLessonsByModule(moduleId, { session })
      await curriculumRepository.updateModuleById(
        moduleId,
        { isDeleted: true, deletedAt: new Date(), updatedBy: actor.id },
        session,
      )
      for (const lesson of lessons) {
        await curriculumRepository.updateLessonById(
          lesson._id.toString(),
          { isDeleted: true, deletedAt: new Date(), deletedWithModule: true, updatedBy: actor.id },
          session,
        )
      }
      return lessons.map((lesson) => lesson._id.toString())
    })

    await recordCurriculumAudit(courseId, 'curriculum.module.deleted', actor, context, {
      moduleId,
      cascadedLessonIds,
    })
  },

  /** Dual-purpose, mirroring `course-management.service.ts#restoreCourse`: un-deletes if soft-deleted (cascading back only the lessons tombstoned by the matching delete), otherwise moves an `ARCHIVED` module back to `DRAFT`. */
  async restoreModule(
    courseId: string,
    moduleId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<ModuleDto> {
    await assertEditableCourse(courseId)
    const module = await curriculumRepository.findModuleById(courseId, moduleId, {
      includeDeleted: true,
    })
    if (!module) throw ApiError.notFound('Module not found')

    if (module.isDeleted) {
      const restoredLessonIds = await withTransaction(async (session) => {
        const tombstoned = await curriculumRepository.findLessonsDeletedWithModule(
          moduleId,
          session,
        )
        for (const lesson of tombstoned) {
          await curriculumRepository.updateLessonById(
            lesson._id.toString(),
            { isDeleted: false, deletedAt: null, deletedWithModule: false, updatedBy: actor.id },
            session,
          )
        }
        await curriculumRepository.updateModuleById(
          moduleId,
          { isDeleted: false, deletedAt: null, updatedBy: actor.id },
          session,
        )
        return tombstoned.map((lesson) => lesson._id.toString())
      })

      await recordCurriculumAudit(courseId, 'curriculum.module.restored', actor, context, {
        moduleId,
        from: 'deleted',
        restoredLessonIds,
      })

      const updated = await requireModule(courseId, moduleId)
      return toModuleDto(updated)
    }

    if (module.status !== 'ARCHIVED') {
      throw ApiError.conflict('Only an archived or deleted module can be restored')
    }

    const updated = await curriculumRepository.updateModuleById(moduleId, {
      status: 'DRAFT',
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Module not found')

    await recordCurriculumAudit(courseId, 'curriculum.module.restored', actor, context, {
      moduleId,
      from: 'archived',
    })
    return toModuleDto(updated)
  },

  // ---- Lessons ------------------------------------------------------------

  async createLesson(
    courseId: string,
    moduleId: string,
    input: CreateLessonInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonDto> {
    await assertEditableCourse(courseId)
    await requireModule(courseId, moduleId)
    await assertValidPrerequisites(courseId, undefined, input.prerequisiteLessonIds)

    const order = await curriculumRepository.nextLessonOrder(moduleId)

    const lesson = await curriculumRepository.createLesson({
      courseId: new Types.ObjectId(courseId),
      courseModuleId: new Types.ObjectId(moduleId),
      title: input.title,
      shortDescription: input.shortDescription ?? '',
      lessonType: input.lessonType,
      estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
      isPreview: input.isPreview,
      isMandatory: input.isMandatory,
      prerequisiteLessonIds: input.prerequisiteLessonIds.map((id) => new Types.ObjectId(id)),
      order,
      status: 'DRAFT',
      contentStatus: computeContentStatus({
        lessonType: input.lessonType,
        textContent: null,
        videoAsset: null,
        documentAsset: null,
        externalLink: null,
      }),
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    })

    await recordCurriculumAudit(courseId, 'curriculum.lesson.created', actor, context, {
      moduleId,
      lessonId: lesson._id.toString(),
      title: lesson.title,
    })

    return toLessonDto(lesson)
  },

  async updateLesson(
    courseId: string,
    moduleId: string,
    lessonId: string,
    input: UpdateLessonInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonDto> {
    await assertEditableCourse(courseId)
    const lesson = await requireLesson(courseId, lessonId)
    if (lesson.courseModuleId.toString() !== moduleId) {
      throw ApiError.notFound('Lesson not found in this module')
    }

    if (input.prerequisiteLessonIds) {
      await assertValidPrerequisites(courseId, lessonId, input.prerequisiteLessonIds)
    }

    const newLessonType = input.lessonType
    const typeChanging = newLessonType !== undefined && newLessonType !== lesson.lessonType
    const discardsExistingContent = typeChanging && hasExistingContent(lesson)
    if (discardsExistingContent && !input.confirmContentReset) {
      throw ApiError.conflict(
        "Changing this lesson's type would discard its existing content. Resubmit with confirmContentReset: true to proceed.",
      )
    }

    const update: Record<string, unknown> = { ...input, updatedBy: actor.id }
    delete update.confirmContentReset
    if (input.prerequisiteLessonIds) {
      update.prerequisiteLessonIds = input.prerequisiteLessonIds.map((id) => new Types.ObjectId(id))
    }
    if (typeChanging) {
      update.textContent = null
      update.videoAsset = null
      update.documentAsset = null
      update.externalLink = null
      update.contentStatus = computeContentStatus({
        lessonType: newLessonType,
        textContent: null,
        videoAsset: null,
        documentAsset: null,
        externalLink: null,
      })
    }

    const updated = await curriculumRepository.updateLessonById(lessonId, update)
    if (!updated) throw ApiError.notFound('Lesson not found')

    await recordCurriculumAudit(courseId, 'curriculum.lesson.updated', actor, context, {
      moduleId,
      lessonId,
    })
    if (input.prerequisiteLessonIds) {
      await recordCurriculumAudit(courseId, 'curriculum.prerequisites.changed', actor, context, {
        lessonId,
        prerequisiteLessonIds: input.prerequisiteLessonIds,
      })
    }
    if (discardsExistingContent) {
      await recordCurriculumAudit(courseId, 'lesson.content.reset_on_type_change', actor, context, {
        lessonId,
        moduleId,
        fromLessonType: lesson.lessonType,
        toLessonType: newLessonType,
      })
    }

    return toLessonDto(updated)
  },

  async reorderLessons(
    courseId: string,
    input: ReorderLessonsInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonDto[]> {
    await assertEditableCourse(courseId)
    await requireModule(courseId, input.moduleId)

    const existing = await curriculumRepository.findLessonsByModule(input.moduleId)
    const existingIds = existing.map((lesson) => lesson._id.toString())

    const { missingIds, unknownIds } = findSetMismatch(existingIds, input.items)
    if (missingIds.length > 0 || unknownIds.length > 0) {
      throw ApiError.badRequest('Reorder payload must include exactly the current lessons', [
        { field: 'items', message: 'Reorder payload must include exactly the current lessons' },
      ])
    }

    const updates = normalizeOrders(input.items)
    await withTransaction((session) =>
      curriculumRepository.bulkUpdateLessonOrders(updates, session),
    )

    await recordCurriculumAudit(courseId, 'curriculum.lesson.reordered', actor, context, {
      moduleId: input.moduleId,
      lessonIds: updates.map((item) => item.id),
    })

    const reordered = await curriculumRepository.findLessonsByModule(input.moduleId)
    return reordered.map(toLessonDto)
  },

  async moveLesson(
    courseId: string,
    lessonId: string,
    input: MoveLessonInput,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonDto> {
    await assertEditableCourse(courseId)
    const lesson = await requireLesson(courseId, lessonId)
    const targetModule = await requireModule(courseId, input.targetModuleId)

    const sourceModuleId = lesson.courseModuleId.toString()
    const targetModuleId = targetModule._id.toString()

    await withTransaction(async (session) => {
      if (sourceModuleId === targetModuleId) {
        const siblings = await curriculumRepository.findLessonsByModule(sourceModuleId, { session })
        const others = siblings.filter((sibling) => sibling._id.toString() !== lessonId)
        const clampedOrder = Math.min(input.targetOrder, others.length)
        others.splice(clampedOrder, 0, lesson)
        await curriculumRepository.bulkUpdateLessonOrders(
          others.map((item, index) => ({ id: item._id.toString(), order: index })),
          session,
        )
        return
      }

      const sourceSiblings = (
        await curriculumRepository.findLessonsByModule(sourceModuleId, { session })
      ).filter((sibling) => sibling._id.toString() !== lessonId)
      const targetSiblings = await curriculumRepository.findLessonsByModule(targetModuleId, {
        session,
      })
      const clampedOrder = Math.min(input.targetOrder, targetSiblings.length)
      targetSiblings.splice(clampedOrder, 0, lesson)

      await curriculumRepository.bulkUpdateLessonOrders(
        sourceSiblings.map((item, index) => ({ id: item._id.toString(), order: index })),
        session,
      )
      await curriculumRepository.updateLessonById(
        lessonId,
        { courseModuleId: new Types.ObjectId(targetModuleId), updatedBy: actor.id },
        session,
      )
      await curriculumRepository.bulkUpdateLessonOrders(
        targetSiblings.map((item, index) => ({ id: item._id.toString(), order: index })),
        session,
      )
    })

    await recordCurriculumAudit(courseId, 'curriculum.lesson.moved', actor, context, {
      lessonId,
      fromModuleId: sourceModuleId,
      toModuleId: targetModuleId,
    })

    const updated = await requireLesson(courseId, lessonId)
    return toLessonDto(updated)
  },

  async archiveLesson(
    courseId: string,
    moduleId: string,
    lessonId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonDto> {
    await assertEditableCourse(courseId)
    const lesson = await requireLesson(courseId, lessonId)
    assertLessonInModule(lesson, moduleId)
    if (lesson.status === 'ARCHIVED') {
      throw ApiError.conflict('Lesson is already archived')
    }

    const updated = await curriculumRepository.updateLessonById(lessonId, {
      status: 'ARCHIVED',
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Lesson not found')

    await recordCurriculumAudit(courseId, 'curriculum.lesson.archived', actor, context, {
      lessonId,
    })
    return toLessonDto(updated)
  },

  async publishLesson(
    courseId: string,
    moduleId: string,
    lessonId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonDto> {
    await assertEditableCourse(courseId)
    const lesson = await requireLesson(courseId, lessonId)
    assertLessonInModule(lesson, moduleId)
    if (lesson.status === 'PUBLISHED') {
      throw ApiError.conflict('Lesson is already published')
    }

    const updated = await curriculumRepository.updateLessonById(lessonId, {
      status: 'PUBLISHED',
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Lesson not found')

    await recordCurriculumAudit(courseId, 'curriculum.item.published', actor, context, {
      itemType: 'lesson',
      lessonId,
    })
    return toLessonDto(updated)
  },

  async unpublishLesson(
    courseId: string,
    moduleId: string,
    lessonId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonDto> {
    await assertEditableCourse(courseId)
    const lesson = await requireLesson(courseId, lessonId)
    assertLessonInModule(lesson, moduleId)
    if (lesson.status !== 'PUBLISHED') {
      throw ApiError.conflict('Only a published lesson can be unpublished')
    }

    const updated = await curriculumRepository.updateLessonById(lessonId, {
      status: 'DRAFT',
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Lesson not found')

    await recordCurriculumAudit(courseId, 'curriculum.item.unpublished', actor, context, {
      itemType: 'lesson',
      lessonId,
    })
    return toLessonDto(updated)
  },

  async deleteLesson(
    courseId: string,
    moduleId: string,
    lessonId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    await assertEditableCourse(courseId)
    const lesson = await requireLesson(courseId, lessonId)
    assertLessonInModule(lesson, moduleId)

    await withTransaction(async (session) => {
      const siblings = (
        await curriculumRepository.findLessonsByModule(lesson.courseModuleId.toString(), {
          session,
        })
      ).filter((sibling) => sibling._id.toString() !== lessonId)
      await curriculumRepository.updateLessonById(
        lessonId,
        { isDeleted: true, deletedAt: new Date(), updatedBy: actor.id },
        session,
      )
      await curriculumRepository.bulkUpdateLessonOrders(
        siblings.map((item, index) => ({ id: item._id.toString(), order: index })),
        session,
      )
    })

    await recordCurriculumAudit(courseId, 'curriculum.lesson.deleted', actor, context, { lessonId })
  },

  async restoreLesson(
    courseId: string,
    moduleId: string,
    lessonId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonDto> {
    await assertEditableCourse(courseId)
    const lesson = await curriculumRepository.findLessonById(courseId, lessonId, {
      includeDeleted: true,
    })
    if (!lesson) throw ApiError.notFound('Lesson not found')
    assertLessonInModule(lesson, moduleId)
    if (!lesson.isDeleted) {
      throw ApiError.conflict('Only a deleted lesson can be restored')
    }

    const order = await curriculumRepository.nextLessonOrder(lesson.courseModuleId.toString())
    const updated = await curriculumRepository.updateLessonById(lessonId, {
      isDeleted: false,
      deletedAt: null,
      deletedWithModule: false,
      order,
      updatedBy: actor.id,
    })
    if (!updated) throw ApiError.notFound('Lesson not found')

    await recordCurriculumAudit(courseId, 'curriculum.lesson.restored', actor, context, {
      lessonId,
    })
    return toLessonDto(updated)
  },
}
