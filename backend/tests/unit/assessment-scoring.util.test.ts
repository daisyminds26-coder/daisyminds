import { Types } from 'mongoose'
import { describe, expect, it } from 'vitest'

import { finalizeAttemptScore, scoreObjectiveAnswer } from '../../src/utils/assessment-scoring.util'
import type {
  IAssessmentAttemptAnswer,
  IAssessmentAttemptQuestionSnapshot,
} from '../../src/models/assessment-attempt.model'

function answerWithSelection(optionIds: Types.ObjectId[]): IAssessmentAttemptAnswer {
  return {
    questionId: new Types.ObjectId(),
    selectedOptionIds: optionIds,
    booleanAnswer: null,
    textAnswer: null,
    numericAnswer: null,
    answeredAt: new Date(),
    flaggedForReview: false,
    marksAwarded: null,
    isCorrect: null,
    manualFeedback: null,
  }
}

const optionA = { _id: new Types.ObjectId(), text: 'A', isCorrect: true }
const optionB = { _id: new Types.ObjectId(), text: 'B', isCorrect: false }
const optionC = { _id: new Types.ObjectId(), text: 'C', isCorrect: true }

function singleChoiceSnapshot(): IAssessmentAttemptQuestionSnapshot {
  return {
    questionId: new Types.ObjectId(),
    sectionId: new Types.ObjectId(),
    order: 0,
    questionType: 'SINGLE_CHOICE',
    questionText: 'q',
    explanation: null,
    marks: 5,
    negativeMarks: 2,
    requiresManualGrading: false,
    options: [optionA, optionB],
    correctBoolean: null,
    acceptedAnswers: [],
    correctNumericAnswer: null,
  }
}

function multipleChoiceSnapshot(): IAssessmentAttemptQuestionSnapshot {
  return {
    ...singleChoiceSnapshot(),
    questionType: 'MULTIPLE_CHOICE',
    options: [optionA, optionB, optionC],
  }
}

describe('scoreObjectiveAnswer — SINGLE_CHOICE', () => {
  it('awards full marks for the correct option', () => {
    const result = scoreObjectiveAnswer(
      singleChoiceSnapshot(),
      answerWithSelection([optionA._id]),
      false,
    )
    expect(result).toEqual({ marksAwarded: 5, isCorrect: true })
  })

  it('awards 0 with isCorrect null when unanswered — never treated as wrong', () => {
    const result = scoreObjectiveAnswer(singleChoiceSnapshot(), undefined, true)
    expect(result).toEqual({ marksAwarded: 0, isCorrect: null })
  })

  it('applies the negative-marks penalty only when negative marking is enabled and the answer is wrong', () => {
    const withPenalty = scoreObjectiveAnswer(
      singleChoiceSnapshot(),
      answerWithSelection([optionB._id]),
      true,
    )
    expect(withPenalty).toEqual({ marksAwarded: -2, isCorrect: false })

    const withoutPenalty = scoreObjectiveAnswer(
      singleChoiceSnapshot(),
      answerWithSelection([optionB._id]),
      false,
    )
    expect(withoutPenalty).toEqual({ marksAwarded: 0, isCorrect: false })
  })
})

describe('scoreObjectiveAnswer — MULTIPLE_CHOICE (all-or-nothing)', () => {
  it('awards full marks only when the selected set exactly matches every correct option', () => {
    const result = scoreObjectiveAnswer(
      multipleChoiceSnapshot(),
      answerWithSelection([optionA._id, optionC._id]),
      false,
    )
    expect(result).toEqual({ marksAwarded: 5, isCorrect: true })
  })

  it('treats a partially-correct selection as wrong, not partial credit', () => {
    const result = scoreObjectiveAnswer(
      multipleChoiceSnapshot(),
      answerWithSelection([optionA._id]),
      false,
    )
    expect(result).toEqual({ marksAwarded: 0, isCorrect: false })
  })
})

describe('finalizeAttemptScore', () => {
  it('floors a negative raw objective total at 0 rather than letting the total go negative', () => {
    const result = finalizeAttemptScore(-4, 0, 20, 50)
    expect(result.objectiveMarks).toBe(0)
    expect(result.totalMarksAwarded).toBe(0)
  })

  it('computes percentage and PASS/FAIL against the assessment passing percentage', () => {
    const pass = finalizeAttemptScore(16, 4, 20, 50)
    expect(pass.percentage).toBe(100)
    expect(pass.passStatus).toBe('PASS')

    const fail = finalizeAttemptScore(2, 0, 20, 50)
    expect(fail.percentage).toBe(10)
    expect(fail.passStatus).toBe('FAIL')
  })

  it('reports NOT_APPLICABLE when the assessment has no configured passing percentage', () => {
    const result = finalizeAttemptScore(10, 0, 20, null)
    expect(result.passStatus).toBe('NOT_APPLICABLE')
  })
})
