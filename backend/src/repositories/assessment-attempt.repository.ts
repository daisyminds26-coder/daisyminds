import { Types } from 'mongoose'

import {
  AssessmentAttemptModel,
  type AssessmentAttemptStatus,
  type IAssessmentAttempt,
  type AssessmentAttemptDocument,
} from '../models/assessment-attempt.model'

export interface AssessmentAttemptCounts {
  totalAttempts: number
  pendingGrading: number
  graded: number
  passed: number
  failed: number
}

export const assessmentAttemptRepository = {
  findById(id: string): Promise<AssessmentAttemptDocument | null> {
    return AssessmentAttemptModel.findOne({ _id: id, isDeleted: false })
  },

  findByIds(ids: string[]): Promise<AssessmentAttemptDocument[]> {
    if (ids.length === 0) return Promise.resolve([])
    return AssessmentAttemptModel.find({ _id: { $in: ids }, isDeleted: false })
  },

  create(data: Partial<IAssessmentAttempt>): Promise<AssessmentAttemptDocument> {
    return AssessmentAttemptModel.create(data)
  },

  updateById(
    id: string,
    update: Record<string, unknown>,
  ): Promise<AssessmentAttemptDocument | null> {
    return AssessmentAttemptModel.findByIdAndUpdate(id, update, { new: true })
  },

  /** At most one can ever exist per (assessment, student) — see the model's own partial-unique-index comment. */
  findInProgressByAssessmentAndStudent(
    assessmentId: string,
    studentId: string,
  ): Promise<AssessmentAttemptDocument | null> {
    return AssessmentAttemptModel.findOne({
      assessmentId,
      studentId,
      status: 'IN_PROGRESS',
      isDeleted: false,
    })
  },

  findLatestByAssessmentAndStudent(
    assessmentId: string,
    studentId: string,
  ): Promise<AssessmentAttemptDocument | null> {
    return AssessmentAttemptModel.findOne({ assessmentId, studentId, isDeleted: false }).sort({
      attemptNumber: -1,
    })
  },

  findAttemptsByAssessmentAndStudent(
    assessmentId: string,
    studentId: string,
  ): Promise<AssessmentAttemptDocument[]> {
    return AssessmentAttemptModel.find({ assessmentId, studentId, isDeleted: false }).sort({
      attemptNumber: -1,
    })
  },

  countAttemptsByAssessmentAndStudent(assessmentId: string, studentId: string): Promise<number> {
    return AssessmentAttemptModel.countDocuments({ assessmentId, studentId, isDeleted: false })
  },

  /** One row per student — latest attempt only, same "one aggregation, never N+1" shape as `assignment-submission.repository.ts#findLatestAttemptsByAssignment`. */
  findLatestAttemptsByAssessment(assessmentId: string): Promise<AssessmentAttemptDocument[]> {
    return AssessmentAttemptModel.aggregate<AssessmentAttemptDocument>([
      { $match: { assessmentId: new Types.ObjectId(assessmentId), isDeleted: false } },
      { $sort: { attemptNumber: -1 } },
      { $group: { _id: '$studentId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ])
  },

  /** Per-assessment attempt-status/pass-fail counters for the admin/trainer list's row counters and the single-assessment results summary — one aggregation, never N+1. Counts every attempt (not just latest-per-student), matching "attempts / submitted / pending grading / graded / passed / failed" as literal attempt counts (task's own results-summary field list). */
  async countsByAssessmentIds(
    assessmentIds: string[],
  ): Promise<Map<string, AssessmentAttemptCounts>> {
    if (assessmentIds.length === 0) return new Map()

    const rows = await AssessmentAttemptModel.aggregate<{
      _id: {
        assessmentId: Types.ObjectId
        status: AssessmentAttemptStatus
        passStatus: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | null
      }
      count: number
    }>([
      {
        $match: {
          assessmentId: { $in: assessmentIds.map((id) => new Types.ObjectId(id)) },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { assessmentId: '$assessmentId', status: '$status', passStatus: '$passStatus' },
          count: { $sum: 1 },
        },
      },
    ])

    const map = new Map<string, AssessmentAttemptCounts>()
    for (const row of rows) {
      const key = row._id.assessmentId.toString()
      const entry = map.get(key) ?? {
        totalAttempts: 0,
        pendingGrading: 0,
        graded: 0,
        passed: 0,
        failed: 0,
      }
      entry.totalAttempts += row.count
      if (row._id.status === 'PENDING_MANUAL_GRADING') entry.pendingGrading += row.count
      if (row._id.status === 'GRADED') {
        entry.graded += row.count
        if (row._id.passStatus === 'PASS') entry.passed += row.count
        if (row._id.passStatus === 'FAIL') entry.failed += row.count
      }
      map.set(key, entry)
    }
    return map
  },

  countPendingManualGrading(assessmentId: string): Promise<number> {
    return AssessmentAttemptModel.countDocuments({
      assessmentId,
      status: 'PENDING_MANUAL_GRADING',
      isDeleted: false,
    })
  },

  /** Bulk-marks every already-`GRADED` attempt under this assessment as result-visible — called once from `publish-results` (§ assessment.service.ts). Never touches an attempt whose result became visible earlier via `showResultImmediately` (its `resultVisibleAt` is already set). */
  markResultsVisible(assessmentId: string, at: Date): Promise<unknown> {
    return AssessmentAttemptModel.updateMany(
      { assessmentId, status: 'GRADED', resultVisibleAt: null, isDeleted: false },
      { $set: { resultVisibleAt: at } },
    )
  },
}
