import { useMutation } from '@tanstack/react-query'

import { exportSubmissionsCsv } from '@/features/assignments/api/assignments.api'
import { downloadBlob } from '@/features/batches/utils/download-blob'

export function useExportSubmissions() {
  return useMutation({
    mutationFn: (params: { assignmentId?: string; courseId?: string; batchId?: string }) =>
      exportSubmissionsCsv(params),
    onSuccess: (blob) => {
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `assignment-submissions-export-${timestamp}.csv`)
    },
  })
}
