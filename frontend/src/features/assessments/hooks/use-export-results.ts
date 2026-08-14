import { useMutation } from '@tanstack/react-query'

import { exportResultsCsv } from '@/features/assessments/api/assessments.api'
import { downloadBlob } from '@/features/batches/utils/download-blob'

export function useExportResults() {
  return useMutation({
    mutationFn: (params: { assessmentId?: string; courseId?: string; batchId?: string }) =>
      exportResultsCsv(params),
    onSuccess: (blob) => {
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `assessment-results-export-${timestamp}.csv`)
    },
  })
}
