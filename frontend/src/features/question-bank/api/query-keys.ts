import type { ListQuestionsParams } from '@/features/question-bank/types'

export const questionBankKeys = {
  all: ['questions'] as const,
  lists: () => [...questionBankKeys.all, 'list'] as const,
  list: (params: ListQuestionsParams) => [...questionBankKeys.lists(), params] as const,
  detail: (id: string) => [...questionBankKeys.all, 'detail', id] as const,
}
