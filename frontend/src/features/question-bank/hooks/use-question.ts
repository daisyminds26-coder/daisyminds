import { useQuery } from '@tanstack/react-query'

import { getQuestion } from '@/features/question-bank/api/question-bank.api'
import { questionBankKeys } from '@/features/question-bank/api/query-keys'

export function useQuestion(id: string | undefined) {
  return useQuery({
    queryKey: questionBankKeys.detail(id ?? ''),
    queryFn: () => getQuestion(id ?? ''),
    enabled: Boolean(id),
  })
}
