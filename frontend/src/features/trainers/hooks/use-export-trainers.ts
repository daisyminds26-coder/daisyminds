import { useMutation } from '@tanstack/react-query'

import { exportTrainersCsv } from '@/features/trainers/api/trainers.api'
import { downloadBlob } from '@/features/trainers/utils/download-blob'
import type { ListTrainersParams } from '@/features/trainers/types'

export function useExportTrainers() {
  return useMutation({
    mutationFn: (params: Omit<ListTrainersParams, 'page' | 'limit'>) => exportTrainersCsv(params),
    onSuccess: (blob) => {
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `trainers-export-${timestamp}.csv`)
    },
  })
}
