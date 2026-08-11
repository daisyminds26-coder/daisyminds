import type { BatchDocument } from '../models/batch.model'
import { UserModel } from '../models/user.model'
import { courseRepository } from '../repositories/course.repository'
import { trainerRepository } from '../repositories/trainer.repository'
import { batchConflictService } from './batch-conflict.service'

export interface ReadinessBlocker {
  field: string
  code: string
  message: string
}

export interface ReadinessResult {
  ready: boolean
  blockers: ReadinessBlocker[]
}

const MIN_DAYS_FOR_WEEKLY_SCHEDULE = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000

function requiresPhysicalLocation(deliveryMode: BatchDocument['deliveryMode']): boolean {
  return deliveryMode === 'OFFLINE' || deliveryMode === 'HYBRID'
}

function locationIsComplete(location: BatchDocument['location']): boolean {
  return Boolean(
    location.venueName?.trim() &&
    location.addressLine1?.trim() &&
    location.city?.trim() &&
    location.state?.trim() &&
    location.postalCode?.trim() &&
    location.country?.trim(),
  )
}

/**
 * The single source of truth for "can this batch be scheduled" — used by
 * both the dedicated `POST /:id/readiness-check` endpoint and the
 * `schedule` lifecycle action itself (which rejects with the same blocker
 * list rather than duplicating the rule set), mirroring
 * `course-management.service.ts#checkReadiness`'s exact role for courses.
 * Deliberately omits checks the write path already makes structurally
 * unreachable (end-date-before-start-date, overlapping weekly slots,
 * invalid capacity/timezone) — same "don't check the unreachable"
 * discipline `curriculum.service.ts#checkCurriculumReadiness` established.
 * No enrolment-related blocker exists — Phase 10B's concern, not this one's.
 */
export const batchReadinessService = {
  async checkReadiness(batch: BatchDocument): Promise<ReadinessResult> {
    const blockers: ReadinessBlocker[] = []

    const course = await courseRepository.findById(batch.courseId.toString())
    if (!course) {
      blockers.push({
        field: 'courseId',
        code: 'COURSE_MISSING',
        message: 'The linked course no longer exists',
      })
    } else {
      if (course.status === 'ARCHIVED') {
        blockers.push({
          field: 'courseId',
          code: 'COURSE_ARCHIVED',
          message: 'The linked course is archived',
        })
      } else if (course.status !== 'PUBLISHED') {
        blockers.push({
          field: 'courseId',
          code: 'COURSE_NOT_PUBLISHED',
          message: 'The linked course must be published before this batch can be scheduled',
        })
      }
    }

    if (!batch.startDate) {
      blockers.push({
        field: 'startDate',
        code: 'START_DATE_MISSING',
        message: 'A start date is required',
      })
    }
    if (!batch.endDate) {
      blockers.push({
        field: 'endDate',
        code: 'END_DATE_MISSING',
        message: 'An end date is required',
      })
    }

    if (batch.weeklySchedule.length === 0) {
      blockers.push({
        field: 'weeklySchedule',
        code: 'SCHEDULE_MISSING',
        message: 'At least one weekly class slot is required',
      })
    } else if (batch.startDate && batch.endDate) {
      const spanDays = (batch.endDate.getTime() - batch.startDate.getTime()) / MS_PER_DAY
      if (spanDays < MIN_DAYS_FOR_WEEKLY_SCHEDULE) {
        blockers.push({
          field: 'weeklySchedule',
          code: 'SCHEDULE_OUTSIDE_RANGE',
          message:
            'The batch date range is too short to fit every configured weekly slot at least once',
        })
      }
    }

    if (!batch.primaryTrainerId) {
      blockers.push({
        field: 'primaryTrainerId',
        code: 'TRAINER_MISSING',
        message: 'Assign a primary trainer',
      })
    } else {
      const trainer = await trainerRepository.findById(batch.primaryTrainerId.toString())
      if (!trainer) {
        blockers.push({
          field: 'primaryTrainerId',
          code: 'TRAINER_DELETED',
          message: 'The assigned primary trainer no longer exists',
        })
      } else {
        if (trainer.employmentStatus === 'TERMINATED' || trainer.employmentStatus === 'INACTIVE') {
          blockers.push({
            field: 'primaryTrainerId',
            code: 'TRAINER_NOT_ACTIVE',
            message: `The primary trainer's employment status (${trainer.employmentStatus}) does not permit teaching`,
          })
        }
        const user = await UserModel.findOne({ _id: trainer.userId, isDeleted: false })
        if (user?.status !== 'ACTIVE') {
          blockers.push({
            field: 'primaryTrainerId',
            code: 'TRAINER_ACCOUNT_NOT_ACTIVE',
            message: "The primary trainer's user account is not active",
          })
        }

        if (course && course.eligibleTrainerIds.length > 0) {
          const eligible = course.eligibleTrainerIds.some(
            (id) => id.toString() === batch.primaryTrainerId?.toString(),
          )
          if (!eligible) {
            blockers.push({
              field: 'primaryTrainerId',
              code: 'TRAINER_NOT_ELIGIBLE',
              message: "The primary trainer is not in this course's eligible-trainers list",
            })
          }
        }
      }
    }

    if (requiresPhysicalLocation(batch.deliveryMode) && !locationIsComplete(batch.location)) {
      blockers.push({
        field: 'location',
        code: 'LOCATION_INCOMPLETE',
        message: 'Offline/hybrid batches require a complete venue address',
      })
    }

    const conflicts = await batchConflictService.checkConflicts(batch)
    for (const conflict of conflicts) {
      blockers.push({
        field: conflict.type === 'AVAILABILITY' ? 'weeklySchedule' : 'primaryTrainerId',
        code:
          conflict.type === 'AVAILABILITY'
            ? 'TRAINER_AVAILABILITY_CONFLICT'
            : 'TRAINER_DOUBLE_BOOKED',
        message: conflict.message,
      })
    }

    return { ready: blockers.length === 0, blockers }
  },
}
