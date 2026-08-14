import { ApiError } from '../utils/api-error'
import { courseRepository } from '../repositories/course.repository'
import { curriculumRepository } from '../repositories/curriculum.repository'
import { batchRepository } from '../repositories/batch.repository'
import type { CourseModuleDocument } from '../models/course-module.model'
import type { LessonDocument } from '../models/lesson.model'
import type { ListPublicProgramsQuery } from '../validators/public-programs.validator'
import {
  toPublicProgramListItemDto,
  toPublicProgramDetailDto,
  toPublicModuleDto,
  toPublicUpcomingBatchDto,
  type PublicProgramListItemDto,
  type PublicProgramDetailDto,
  type PublicModuleDto,
} from './public-programs-dto'

const MAX_UPCOMING_BATCHES = 5

export interface ListPublicProgramsResult {
  dtos: PublicProgramListItemDto[]
  total: number
}

/**
 * The public program surface — every query here fixes `status: 'PUBLISHED'`
 * and `visibility: 'PUBLIC'` server-side; neither is ever accepted from the
 * client (see `public-programs.validator.ts`), so a draft/private/internal
 * course can never appear here regardless of what a caller requests.
 */
export const publicProgramsService = {
  async listPrograms(query: ListPublicProgramsQuery): Promise<ListPublicProgramsResult> {
    const baseFilter = {
      status: 'PUBLISHED' as const,
      visibility: 'PUBLIC' as const,
      category: query.category,
      level: query.level,
      deliveryMode: query.deliveryMode,
      search: query.search,
    }
    const options = {
      page: query.page,
      limit: query.limit,
      sortField: query.sort.field,
      sortDirection: query.sort.direction,
    }

    const { rows, total } = await courseRepository.list(
      { ...baseFilter, isFeatured: query.featured },
      options,
    )

    // A featured-only request that matches nothing falls back to the same
    // query without the featured filter, rather than showing an empty
    // homepage section — the spec's own stated behavior for "if none exist."
    if (query.featured && rows.length === 0) {
      const fallback = await courseRepository.list(baseFilter, options)
      return { dtos: fallback.rows.map(toPublicProgramListItemDto), total: fallback.total }
    }

    return { dtos: rows.map(toPublicProgramListItemDto), total }
  },

  async getProgramBySlug(slug: string): Promise<PublicProgramDetailDto> {
    const course = await courseRepository.findBySlug(slug)

    // Never distinguish "doesn't exist" from "exists but not public" — both
    // 404. A private/draft course's real existence must not be inferable by
    // slug-guessing.
    if (course?.status !== 'PUBLISHED' || course.visibility !== 'PUBLIC') {
      throw ApiError.notFound('Program not found')
    }

    const courseId = course._id.toString()
    const [modules, lessons, upcomingBatches] = await Promise.all([
      curriculumRepository.findModulesByCourse(courseId),
      curriculumRepository.findLessonsByCourse(courseId),
      batchRepository.list(
        { courseId, temporal: 'upcoming', status: 'ACTIVE' },
        { page: 1, limit: MAX_UPCOMING_BATCHES, sortField: 'startDate', sortDirection: 'asc' },
      ),
    ])

    const curriculum = buildPublishedCurriculum(modules, lessons)
    const batchDtos = upcomingBatches.rows.map(toPublicUpcomingBatchDto)

    return toPublicProgramDetailDto(course, curriculum, batchDtos)
  },
}

/**
 * Same published-only double-filter as `student-learning.service.ts`'s
 * `getPublishedOrderedLessons` (module AND lesson must each independently be
 * `PUBLISHED`) — the repository queries carry no status filter themselves,
 * so this is the one place that rule is enforced for the public surface.
 */
function buildPublishedCurriculum(
  modules: CourseModuleDocument[],
  lessons: LessonDocument[],
): PublicModuleDto[] {
  return modules
    .filter((courseModule) => courseModule.status === 'PUBLISHED')
    .map((courseModule) => {
      const moduleLessons = lessons.filter(
        (lesson) =>
          lesson.courseModuleId.toString() === courseModule._id.toString() &&
          lesson.status === 'PUBLISHED',
      )
      return toPublicModuleDto(courseModule, moduleLessons)
    })
}
