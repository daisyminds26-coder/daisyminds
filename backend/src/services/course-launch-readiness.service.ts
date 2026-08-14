import { curriculumRepository } from '../repositories/curriculum.repository'
import { assertCourseExists } from './curriculum-helpers'
import { courseManagementService } from './course-management.service'
import { curriculumService } from './curriculum.service'

export interface LaunchReadinessBlocker {
  field: string
  message: string
}

export interface LaunchReadinessSummary {
  publishedModuleCount: number
  publishedLessonCount: number
  publishedLessonsWithReadyContent: number
  publishedLessonsBlockingLaunch: number
}

/**
 * The third, distinct readiness concept (ARCHITECTURE.md §21) — never
 * collapsed with course metadata readiness (Phase 9A,
 * `courseManagementService.getReadiness`) or curriculum structural
 * readiness (Phase 9B, `curriculumService.checkCurriculumReadiness`). This
 * composes both of those plus a content-readiness pass over published
 * lessons; it deliberately never checks for Enrollllments/batches, since those
 * modules don't exist yet — "launch readiness" here means "learning content
 * is ready to be consumed once those modules ship," not "students can
 * Enrollll now."
 */
export interface CourseLaunchReadinessResult {
  ready: boolean
  courseMetadataReady: boolean
  curriculumStructureReady: boolean
  contentReady: boolean
  blockers: LaunchReadinessBlocker[]
  summary: LaunchReadinessSummary
}

export const courseLaunchReadinessService = {
  async checkLaunchReadiness(courseId: string): Promise<CourseLaunchReadinessResult> {
    await assertCourseExists(courseId)

    const [metadataReadiness, curriculumReadiness, modules, lessons] = await Promise.all([
      courseManagementService.getReadiness(courseId),
      curriculumService.checkCurriculumReadiness(courseId),
      curriculumRepository.findModulesByCourse(courseId),
      curriculumRepository.findLessonsByCourse(courseId),
    ])

    const blockers: LaunchReadinessBlocker[] = []

    for (const blocker of metadataReadiness.blockers) {
      blockers.push({ field: `course.${blocker.field}`, message: blocker.message })
    }
    for (const blocker of curriculumReadiness.blockers) {
      blockers.push({ field: `curriculum.${blocker.field}`, message: blocker.message })
    }

    const publishedModules = modules.filter((module) => module.status === 'PUBLISHED')
    if (publishedModules.length === 0) {
      blockers.push({
        field: 'modules',
        message: 'At least one published module is required for learning content to be ready',
      })
    }

    const publishedLessons = lessons.filter((lesson) => lesson.status === 'PUBLISHED')
    const lessonsNotReady = publishedLessons.filter((lesson) => lesson.contentStatus !== 'READY')
    for (const lesson of lessonsNotReady) {
      blockers.push({
        field: `lessons.${lesson._id.toString()}`,
        message:
          lesson.contentStatus === 'NOT_CONFIGURED'
            ? `"${lesson.title}" is published but its lesson type does not support content yet`
            : `"${lesson.title}" is published but its content is not ready (${lesson.contentStatus})`,
      })
    }

    const contentReady = publishedModules.length > 0 && lessonsNotReady.length === 0

    return {
      ready: metadataReadiness.ready && curriculumReadiness.ready && contentReady,
      courseMetadataReady: metadataReadiness.ready,
      curriculumStructureReady: curriculumReadiness.ready,
      contentReady,
      blockers,
      summary: {
        publishedModuleCount: publishedModules.length,
        publishedLessonCount: publishedLessons.length,
        publishedLessonsWithReadyContent: publishedLessons.length - lessonsNotReady.length,
        publishedLessonsBlockingLaunch: lessonsNotReady.length,
      },
    }
  },
}
