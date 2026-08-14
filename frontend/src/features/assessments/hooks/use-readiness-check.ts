import { useMutation } from '@tanstack/react-query'

import { checkReadiness } from '@/features/assessments/api/assessments.api'

export function useReadinessCheck() {
  return useMutation({ mutationFn: checkReadiness })
}
