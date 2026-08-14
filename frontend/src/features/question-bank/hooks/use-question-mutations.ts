import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  activateQuestion,
  archiveQuestion,
  createQuestion,
  duplicateQuestion,
  updateQuestion,
} from '@/features/question-bank/api/question-bank.api'
import { questionBankKeys } from '@/features/question-bank/api/query-keys'
import type { AdminQuestion, UpdateQuestionPayload } from '@/features/question-bank/types'

export function useCreateQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createQuestion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: questionBankKeys.lists() })
    },
  })
}

export function useUpdateQuestion(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateQuestionPayload) => updateQuestion(id, payload),
    onSuccess: async (updated: AdminQuestion) => {
      queryClient.setQueryData(questionBankKeys.detail(id), updated)
      await queryClient.invalidateQueries({ queryKey: questionBankKeys.lists() })
    },
  })
}

export function useArchiveQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: archiveQuestion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: questionBankKeys.lists() })
    },
  })
}

export function useActivateQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: activateQuestion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: questionBankKeys.lists() })
    },
  })
}

export function useDuplicateQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: duplicateQuestion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: questionBankKeys.lists() })
    },
  })
}
