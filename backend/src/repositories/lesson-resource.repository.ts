import type { ClientSession } from 'mongoose'

import {
  LessonResourceModel,
  type ILessonResource,
  type LessonResourceDocument,
} from '../models/lesson-resource.model'

export interface OrderUpdate {
  id: string
  order: number
}

/** Data access for `lesson_resources` — kept separate from `curriculum.repository.ts` since resources have an independent add/reorder/remove lifecycle from modules/lessons (ARCHITECTURE.md §21). */
export const lessonResourceRepository = {
  findByLesson(lessonId: string, session?: ClientSession): Promise<LessonResourceDocument[]> {
    return LessonResourceModel.find({ lessonId, isDeleted: false })
      .sort({ sortOrder: 1 })
      .session(session ?? null)
  },

  findById(
    lessonId: string,
    resourceId: string,
    session?: ClientSession,
  ): Promise<LessonResourceDocument | null> {
    return LessonResourceModel.findOne({ _id: resourceId, lessonId, isDeleted: false }).session(
      session ?? null,
    )
  },

  countByLesson(lessonId: string): Promise<number> {
    return LessonResourceModel.countDocuments({ lessonId, isDeleted: false })
  },

  /** Every active resource across a whole course — one query for the student Resources page instead of one per lesson (`courseId` is denormalized for exactly this). */
  findActiveByCourse(courseId: string, session?: ClientSession): Promise<LessonResourceDocument[]> {
    return LessonResourceModel.find({ courseId, isDeleted: false })
      .sort({ lessonId: 1, sortOrder: 1 })
      .session(session ?? null)
  },

  findByIdAcrossLessons(
    resourceId: string,
    session?: ClientSession,
  ): Promise<LessonResourceDocument | null> {
    return LessonResourceModel.findOne({ _id: resourceId, isDeleted: false }).session(
      session ?? null,
    )
  },

  async nextSortOrder(lessonId: string, session?: ClientSession): Promise<number> {
    const last = await LessonResourceModel.findOne({ lessonId, isDeleted: false })
      .sort({ sortOrder: -1 })
      .session(session ?? null)
    return last ? last.sortOrder + 1 : 0
  },

  async create(
    data: Partial<ILessonResource>,
    session?: ClientSession,
  ): Promise<LessonResourceDocument> {
    const [resource] = await LessonResourceModel.create([data], { session })
    if (!resource) throw new Error('Failed to create lesson resource')
    return resource
  },

  updateById(
    id: string,
    update: Record<string, unknown>,
    session?: ClientSession,
  ): Promise<LessonResourceDocument | null> {
    return LessonResourceModel.findByIdAndUpdate(id, update, { new: true, session })
  },

  bulkUpdateOrders(items: OrderUpdate[], session: ClientSession): Promise<unknown> {
    return LessonResourceModel.bulkWrite(
      items.map((item) => ({
        updateOne: { filter: { _id: item.id }, update: { $set: { sortOrder: item.order } } },
      })),
      { session },
    )
  },
}
