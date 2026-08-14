/** Mirrors `backend/src/models/question.model.ts` enums exactly. */
export const QUESTION_TYPES = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'LONG_ANSWER',
  'FILL_IN_THE_BLANK',
  'NUMERIC',
] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

export const QUESTION_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number]

export const QUESTION_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const
export type QuestionStatus = (typeof QUESTION_STATUSES)[number]

export interface QuestionOption {
  id: string
  text: string
  isCorrect: boolean
}

/** Mirrors `backend/src/services/question-dto.ts#AdminQuestionDto` — authoring-only, never sent to a student. */
export interface AdminQuestion {
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
  options: QuestionOption[]
  correctBoolean: boolean | null
  acceptedAnswers: string[]
  correctNumericAnswer: number | null
  requiresManualGrading: boolean
  tags: string[]
  status: QuestionStatus
  createdAt: string
  updatedAt: string
}

export interface ListQuestionsParams {
  page?: number
  limit?: number
  sort?: `${'createdAt' | 'questionText'}:${'asc' | 'desc'}`
  courseId?: string
  questionType?: QuestionType
  difficulty?: QuestionDifficulty
  status?: QuestionStatus
  tag?: string
  search?: string
}

export interface QuestionOptionPayload {
  text: string
  isCorrect: boolean
}

export interface CreateQuestionPayload {
  courseId: string
  moduleId?: string
  lessonId?: string
  questionType: QuestionType
  difficulty?: QuestionDifficulty
  questionText: string
  explanation?: string
  marks: number
  negativeMarks?: number
  options?: QuestionOptionPayload[]
  correctBoolean?: boolean
  acceptedAnswers?: string[]
  correctNumericAnswer?: number
  tags?: string[]
}

export type UpdateQuestionPayload = Partial<CreateQuestionPayload>
