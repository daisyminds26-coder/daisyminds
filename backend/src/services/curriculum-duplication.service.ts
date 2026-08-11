import { Types } from 'mongoose'

import { ApiError } from '../utils/api-error'
import { withTransaction } from '../utils/transaction'
import { curriculumRepository } from '../repositories/curriculum.repository'
import {
  assertEditableCourse,
  recordCurriculumAudit,
  requireLesson,
  requireModule,
} from './curriculum-helpers'
import { toLessonDto, toModuleDto, type LessonDto, type ModuleDto } from './curriculum-dto'
import type { AuthenticatedUser } from '../types/auth'
import type { RequestContext } from './user-management.service'

/**
 * Split out of `curriculum.service.ts` — duplication has its own,
 * genuinely distinct shape (multi-document copy + id remapping) that would
 * otherwise bloat the main service file (CODING-STANDARDS.md §2's "split
 * domain helpers only when it improves maintainability").
 */
export const curriculumDuplicationService = {
  /**
   * Copies the module and every one of its active lessons in one
   * transaction. Prerequisites are remapped only when *both* the lesson
   * and its prerequisite were duplicated together within this same module
   * — a lesson's prerequisite pointing outside the module (to a lesson
   * that wasn't copied) is dropped, never left pointing at the original,
   * un-duplicated lesson (task's recommended strategy, ARCHITECTURE.md §20).
   */
  async duplicateModule(
    courseId: string,
    moduleId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<ModuleDto> {
    await assertEditableCourse(courseId)
    const source = await requireModule(courseId, moduleId)
    const sourceLessons = await curriculumRepository.findLessonsByModule(moduleId)

    const newModuleId = await withTransaction(async (session) => {
      const newOrder = await curriculumRepository.nextModuleOrder(courseId, session)
      const newModule = await curriculumRepository.createModule(
        {
          courseId: new Types.ObjectId(courseId),
          title: `${source.title} (Copy)`,
          description: source.description,
          estimatedDurationMinutes: source.estimatedDurationMinutes,
          order: newOrder,
          status: 'DRAFT',
          createdBy: new Types.ObjectId(actor.id),
          updatedBy: new Types.ObjectId(actor.id),
        },
        session,
      )

      const idMap = new Map<string, string>()
      const created: { newId: string; oldPrerequisiteIds: string[] }[] = []

      for (const [index, lesson] of sourceLessons.entries()) {
        const duplicate = await curriculumRepository.createLesson(
          {
            courseId: new Types.ObjectId(courseId),
            courseModuleId: newModule._id,
            title: lesson.title,
            shortDescription: lesson.shortDescription,
            lessonType: lesson.lessonType,
            estimatedDurationMinutes: lesson.estimatedDurationMinutes,
            isPreview: lesson.isPreview,
            isMandatory: lesson.isMandatory,
            prerequisiteLessonIds: [],
            order: index,
            status: 'DRAFT',
            createdBy: new Types.ObjectId(actor.id),
            updatedBy: new Types.ObjectId(actor.id),
          },
          session,
        )
        idMap.set(lesson._id.toString(), duplicate._id.toString())
        created.push({
          newId: duplicate._id.toString(),
          oldPrerequisiteIds: lesson.prerequisiteLessonIds.map((id) => id.toString()),
        })
      }

      for (const item of created) {
        const remapped = item.oldPrerequisiteIds
          .map((oldId) => idMap.get(oldId))
          .filter((id): id is string => id !== undefined)
        if (remapped.length > 0) {
          await curriculumRepository.updateLessonById(
            item.newId,
            { prerequisiteLessonIds: remapped.map((id) => new Types.ObjectId(id)) },
            session,
          )
        }
      }

      return newModule._id.toString()
    })

    await recordCurriculumAudit(courseId, 'curriculum.module.duplicated', actor, context, {
      sourceModuleId: moduleId,
      newModuleId,
      lessonCount: sourceLessons.length,
    })

    const created = await requireModule(courseId, newModuleId)
    return toModuleDto(created)
  },

  /** Inserted immediately after the source lesson in the same module; prerequisites are copied as-is (still valid — duplicate lives in the same course). */
  async duplicateLesson(
    courseId: string,
    moduleId: string,
    lessonId: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<LessonDto> {
    await assertEditableCourse(courseId)
    const source = await requireLesson(courseId, lessonId)
    if (source.courseModuleId.toString() !== moduleId) {
      throw ApiError.notFound('Lesson not found in this module')
    }

    const newLessonId = await withTransaction(async (session) => {
      const siblings = await curriculumRepository.findLessonsByModule(moduleId, { session })
      const laterSiblings = siblings.filter((sibling) => sibling.order > source.order)

      await curriculumRepository.bulkUpdateLessonOrders(
        laterSiblings.map((sibling) => ({ id: sibling._id.toString(), order: sibling.order + 1 })),
        session,
      )

      const duplicate = await curriculumRepository.createLesson(
        {
          courseId: new Types.ObjectId(courseId),
          courseModuleId: new Types.ObjectId(moduleId),
          title: `${source.title} (Copy)`,
          shortDescription: source.shortDescription,
          lessonType: source.lessonType,
          estimatedDurationMinutes: source.estimatedDurationMinutes,
          isPreview: source.isPreview,
          isMandatory: source.isMandatory,
          prerequisiteLessonIds: source.prerequisiteLessonIds,
          order: source.order + 1,
          status: 'DRAFT',
          createdBy: new Types.ObjectId(actor.id),
          updatedBy: new Types.ObjectId(actor.id),
        },
        session,
      )
      return duplicate._id.toString()
    })

    await recordCurriculumAudit(courseId, 'curriculum.lesson.duplicated', actor, context, {
      sourceLessonId: lessonId,
      newLessonId,
      moduleId,
    })

    const created = await requireLesson(courseId, newLessonId)
    return toLessonDto(created)
  },
}
