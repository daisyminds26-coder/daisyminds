import { useMutation } from '@tanstack/react-query'

import { exportEnrollmentsCsv } from '@/features/enrollments/api/enrollments.api'
import { downloadBlob } from '@/features/batches/utils/download-blob'
import type { ListEnrollmentsParams } from '@/features/enrollments/types'

export function useExportEnrollments() {
  return useMutation({
    mutationFn: (params: Omit<ListEnrollmentsParams, 'page' | 'limit'>) =>
      exportEnrollmentsCsv(params),
    onSuccess: (blob) => {
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `daisy-minds-enrollments-${timestamp}.csv`)
    },
  })
}
