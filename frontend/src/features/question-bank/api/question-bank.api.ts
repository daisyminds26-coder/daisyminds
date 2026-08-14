import { apiGet, apiGetPaginated, apiPatch, apiPost, type ApiMeta } from '@/shared/lib/api-client'
import type {
  AdminQuestion,
  CreateQuestionPayload,
  ListQuestionsParams,
  UpdateQuestionPayload,
} from '@/features/question-bank/types'

export function listQuestions(
  params: ListQuestionsParams,
): Promise<{ data: AdminQuestion[]; meta: ApiMeta }> {
  return apiGetPaginated<AdminQuestion>('/questions', { params })
}

export function getQuestion(id: string): Promise<AdminQuestion> {
  return apiGet<AdminQuestion>(`/questions/${id}`)
}

export function createQuestion(payload: CreateQuestionPayload): Promise<AdminQuestion> {
  return apiPost<AdminQuestion>('/questions', payload)
}

export function updateQuestion(id: string, payload: UpdateQuestionPayload): Promise<AdminQuestion> {
  return apiPatch<AdminQuestion>(`/questions/${id}`, payload)
}

export function archiveQuestion(id: string): Promise<AdminQuestion> {
  return apiPost<AdminQuestion>(`/questions/${id}/archive`)
}

export function duplicateQuestion(id: string): Promise<AdminQuestion> {
  return apiPost<AdminQuestion>(`/questions/${id}/duplicate`)
}
