import type {
  QuestionDocument,
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
} from '../models/question.model'
import type { CourseDocument } from '../models/course.model'
import { requiresManualGrading } from '../utils/assessment-scoring.util'

/**
 * The one question-bank read shape — authoring-only (admin), so it's the
 * only question DTO that ever includes `isCorrect`/`correctBoolean`/
 * `acceptedAnswers`/`correctNumericAnswer`. A student never receives this
 * shape directly; the only question data a student ever sees is a stripped
 * snapshot projection inside `assessment-attempt-dto.ts`.
 */
export interface AdminQuestionOptionDto {
  id: string
  text: string
  isCorrect: boolean
}

export interface AdminQuestionDto {
  id: string
  questionCode: string
  courseId: string
  courseTitle: string
  moduleId: string | null
  lessonId: string | null
  questionType: QuestionType
  difficulty: QuestionDifficulty | null
  questionText: string
  explanation: string | null
  marks: number
  negativeMarks: number | null
  options: AdminQuestionOptionDto[]
  correctBoolean: boolean | null
  acceptedAnswers: string[]
  correctNumericAnswer: number | null
  requiresManualGrading: boolean
  tags: string[]
  status: QuestionStatus
  createdAt: string
  updatedAt: string
}

export function toAdminQuestionDto(
  question: QuestionDocument,
  course: Pick<CourseDocument, '_id' | 'title'>,
): AdminQuestionDto {
  return {
    id: question._id.toString(),
    questionCode: question.questionCode,
    courseId: course._id.toString(),
    courseTitle: course.title,
    moduleId: question.moduleId ? question.moduleId.toString() : null,
    lessonId: question.lessonId ? question.lessonId.toString() : null,
    questionType: question.questionType,
    difficulty: question.difficulty,
    questionText: question.questionText,
    explanation: question.explanation,
    marks: question.marks,
    negativeMarks: question.negativeMarks,
    options: question.options.map((option) => ({
      id: option._id.toString(),
      text: option.text,
      isCorrect: option.isCorrect,
    })),
    correctBoolean: question.correctBoolean,
    acceptedAnswers: question.acceptedAnswers,
    correctNumericAnswer: question.correctNumericAnswer,
    requiresManualGrading: requiresManualGrading(question),
    tags: question.tags,
    status: question.status,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
  }
}
