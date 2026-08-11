import type { ClientSession } from 'mongoose'

import {
  CourseModuleModel,
  type CourseModuleDocument,
  type ICourseModule,
} from '../models/course-module.model'
import { LessonModel, type ILesson, type LessonDocument } from '../models/lesson.model'

export interface FindOptions {
  includeDeleted?: boolean
  session?: ClientSession
}

/** `id` position in an in-memory (`{id, order}`) bulk update — never the full document, matching the reorder endpoints' compact-payload contract. */
export interface OrderUpdate {
  id: string
  order: number
}

function scopedQuery(base: Record<string, unknown>, includeDeleted?: boolean) {
  return includeDeleted ? base : { ...base, isDeleted: false }
}

/**
 * Data access for `course_modules`/`lessons`. Kept separate from
 * `course.repository.ts` — curriculum has genuinely different query shapes
 * (tree fetch, bulk reorder, cascade soft-delete) and mixing it into the
 * course repository would blur the module boundary (CODING-STANDARDS.md §2).
 */
export const curriculumRepository = {
  findModuleById(
    courseId: string,
    moduleId: string,
    options: FindOptions = {},
  ): Promise<CourseModuleDocument | null> {
    return CourseModuleModel.findOne(
      scopedQuery({ _id: moduleId, courseId }, options.includeDeleted),
    ).session(options.session ?? null)
  },

  findModulesByCourse(
    courseId: string,
    options: FindOptions = {},
  ): Promise<CourseModuleDocument[]> {
    return CourseModuleModel.find(scopedQuery({ courseId }, options.includeDeleted))
      .sort({ order: 1 })
      .session(options.session ?? null)
  },

  countModules(courseId: string, options: FindOptions = {}): Promise<number> {
    return CourseModuleModel.countDocuments(scopedQuery({ courseId }, options.includeDeleted))
  },

  /** Highest `order` currently in use among the course's non-deleted modules — a create appends after it. */
  async nextModuleOrder(courseId: string, session?: ClientSession): Promise<number> {
    const last = await CourseModuleModel.findOne({ courseId, isDeleted: false })
      .sort({ order: -1 })
      .session(session ?? null)
    return last ? last.order + 1 : 0
  },

  async createModule(
    data: Partial<ICourseModule>,
    session?: ClientSession,
  ): Promise<CourseModuleDocument> {
    const [module] = await CourseModuleModel.create([data], { session })
    if (!module) throw new Error('Failed to create module')
    return module
  },

  async updateModuleById(
    id: string,
    update: Record<string, unknown>,
    session?: ClientSession,
  ): Promise<CourseModuleDocument | null> {
    return CourseModuleModel.findByIdAndUpdate(id, update, { new: true, session })
  },

  bulkUpdateModuleOrders(items: OrderUpdate[], session: ClientSession): Promise<unknown> {
    return CourseModuleModel.bulkWrite(
      items.map((item) => ({
        updateOne: { filter: { _id: item.id }, update: { $set: { order: item.order } } },
      })),
      { session },
    )
  },

  findLessonById(
    courseId: string,
    lessonId: string,
    options: FindOptions = {},
  ): Promise<LessonDocument | null> {
    return LessonModel.findOne(
      scopedQuery({ _id: lessonId, courseId }, options.includeDeleted),
    ).session(options.session ?? null)
  },

  findLessonsByModule(moduleId: string, options: FindOptions = {}): Promise<LessonDocument[]> {
    return LessonModel.find(scopedQuery({ courseModuleId: moduleId }, options.includeDeleted))
      .sort({ order: 1 })
      .session(options.session ?? null)
  },

  /** Lessons soft-deleted as a side effect of their parent module's own delete — the exact set `restoreModule` should bring back, see `Lesson.deletedWithModule`. */
  findLessonsDeletedWithModule(
    moduleId: string,
    session?: ClientSession,
  ): Promise<LessonDocument[]> {
    return LessonModel.find({
      courseModuleId: moduleId,
      isDeleted: true,
      deletedWithModule: true,
    }).session(session ?? null)
  },

  /** Whole-course lesson set — the tree endpoint, readiness check, and cycle detection all need every lesson in one round trip (performance guidance: one query, not N+1 per module). */
  findLessonsByCourse(courseId: string, options: FindOptions = {}): Promise<LessonDocument[]> {
    return LessonModel.find(scopedQuery({ courseId }, options.includeDeleted))
      .sort({ order: 1 })
      .session(options.session ?? null)
  },

  async nextLessonOrder(moduleId: string, session?: ClientSession): Promise<number> {
    const last = await LessonModel.findOne({ courseModuleId: moduleId, isDeleted: false })
      .sort({ order: -1 })
      .session(session ?? null)
    return last ? last.order + 1 : 0
  },

  async createLesson(data: Partial<ILesson>, session?: ClientSession): Promise<LessonDocument> {
    const [lesson] = await LessonModel.create([data], { session })
    if (!lesson) throw new Error('Failed to create lesson')
    return lesson
  },

  async updateLessonById(
    id: string,
    update: Record<string, unknown>,
    session?: ClientSession,
  ): Promise<LessonDocument | null> {
    return LessonModel.findByIdAndUpdate(id, update, { new: true, session })
  },

  bulkUpdateLessonOrders(items: OrderUpdate[], session: ClientSession): Promise<unknown> {
    return LessonModel.bulkWrite(
      items.map((item) => ({
        updateOne: { filter: { _id: item.id }, update: { $set: { order: item.order } } },
      })),
      { session },
    )
  },

  /** Every lesson referencing `lessonId` as a prerequisite — used to reject deleting/archiving a lesson other lessons still depend on being findable for cycle-recheck, and to strip it from the prerequisite lookup service. */
  findLessonsReferencingPrerequisite(
    courseId: string,
    lessonId: string,
    session?: ClientSession,
  ): Promise<LessonDocument[]> {
    return LessonModel.find({
      courseId,
      isDeleted: false,
      prerequisiteLessonIds: lessonId,
    }).session(session ?? null)
  },
}
