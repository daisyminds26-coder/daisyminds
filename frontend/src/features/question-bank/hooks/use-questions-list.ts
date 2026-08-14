import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { listQuestions } from '@/features/question-bank/api/question-bank.api'
import { questionBankKeys } from '@/features/question-bank/api/query-keys'
import type { ListQuestionsParams } from '@/features/question-bank/types'

export function useQuestionsList(params: ListQuestionsParams) {
  return useQuery({
    queryKey: questionBankKeys.list(params),
    queryFn: () => listQuestions(params),
    placeholderData: keepPreviousData,
  })
}
