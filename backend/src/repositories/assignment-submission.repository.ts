import { Types } from 'mongoose'

import {
  AssignmentSubmissionModel,
  type AssignmentSubmissionStatus,
  type IAssignmentSubmission,
  type AssignmentSubmissionDocument,
} from '../models/assignment-submission.model'

export interface AssignmentCounts {
  submitted: number
  graded: number
  pendingGrading: number
}

export const assignmentSubmissionRepository = {
  findById(id: string): Promise<AssignmentSubmissionDocument | null> {
    return AssignmentSubmissionModel.findOne({ _id: id, isDeleted: false })
  },

  findByIds(ids: string[]): Promise<AssignmentSubmissionDocument[]> {
    if (ids.length === 0) return Promise.resolve([])
    return AssignmentSubmissionModel.find({ _id: { $in: ids }, isDeleted: false })
  },

  create(data: Partial<IAssignmentSubmission>): Promise<AssignmentSubmissionDocument> {
    return AssignmentSubmissionModel.create(data)
  },

  updateById(
    id: string,
    update: Record<string, unknown>,
  ): Promise<AssignmentSubmissionDocument | null> {
    return AssignmentSubmissionModel.findByIdAndUpdate(id, update, { new: true })
  },

  /** Every attempt for one student on one assignment, newest first — the student's own (and trainer/admin's) attempt-history view. */
  findAttemptsByAssignmentAndStudent(
    assignmentId: string,
    studentId: string,
  ): Promise<AssignmentSubmissionDocument[]> {
    return AssignmentSubmissionModel.find({ assignmentId, studentId, isDeleted: false }).sort({
      attemptNumber: -1,
    })
  },

  /** The current attempt in progress or most recently submitted/graded — the single row every "your submission" view reads. */
  findLatestAttemptByAssignmentAndStudent(
    assignmentId: string,
    studentId: string,
  ): Promise<AssignmentSubmissionDocument | null> {
    return AssignmentSubmissionModel.findOne({ assignmentId, studentId, isDeleted: false }).sort({
      attemptNumber: -1,
    })
  },

  async countAttemptsByAssignmentAndStudent(
    assignmentId: string,
    studentId: string,
  ): Promise<number> {
    return AssignmentSubmissionModel.countDocuments({
      assignmentId,
      studentId,
      isDeleted: false,
      status: { $ne: 'DRAFT' },
    })
  },

  /**
   * One row per student — the latest attempt only (a grading workspace
   * cares about current state, not every historical attempt; full history
   * is its own drill-down view). One aggregation, never N+1: `$match` this
   * assignment's real (non-draft) attempts, `$sort` newest-attempt-first,
   * `$group` by student keeping the first (=latest) doc.
   */
  findLatestAttemptsByAssignment(assignmentId: string): Promise<AssignmentSubmissionDocument[]> {
    return AssignmentSubmissionModel.aggregate<AssignmentSubmissionDocument>([
      {
        $match: {
          assignmentId: new Types.ObjectId(assignmentId),
          isDeleted: false,
          status: { $ne: 'DRAFT' },
        },
      },
      { $sort: { attemptNumber: -1 } },
      { $group: { _id: '$studentId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ])
  },

  /** Submitted / graded / pending-grading counts for a batch of assignments in one query — the admin/trainer list's own per-row counters, never N+1. */
  async countsByAssignmentIds(assignmentIds: string[]): Promise<Map<string, AssignmentCounts>> {
    if (assignmentIds.length === 0) return new Map()

    const rows = await AssignmentSubmissionModel.aggregate<{
      _id: { assignmentId: Types.ObjectId; status: AssignmentSubmissionStatus }
      count: number
    }>([
      {
        $match: {
          assignmentId: { $in: assignmentIds.map((id) => new Types.ObjectId(id)) },
          isDeleted: false,
          status: { $ne: 'DRAFT' },
        },
      },
      { $group: { _id: { assignmentId: '$assignmentId', status: '$status' }, count: { $sum: 1 } } },
    ])

    const map = new Map<string, AssignmentCounts>()
    for (const row of rows) {
      const key = row._id.assignmentId.toString()
      const entry = map.get(key) ?? { submitted: 0, graded: 0, pendingGrading: 0 }
      entry.submitted += row.count
      if (row._id.status === 'GRADED') entry.graded += row.count
      else entry.pendingGrading += row.count
      map.set(key, entry)
    }
    return map
  },

  /** A student's own submitted/graded/returned attempts across every assignment (or one course) — their assignments-list "submission status" read. */
  findByStudent(studentId: string, courseId?: string): Promise<AssignmentSubmissionDocument[]> {
    const query: Record<string, unknown> = { studentId, isDeleted: false, status: { $ne: 'DRAFT' } }
    if (courseId) query.courseId = courseId
    return AssignmentSubmissionModel.find(query).sort({ attemptNumber: -1 })
  },
}
