import { useMutation } from '@tanstack/react-query'

import { exportBatchesCsv } from '@/features/batches/api/batches.api'
import { downloadBlob } from '@/features/batches/utils/download-blob'
import type { ListBatchesParams } from '@/features/batches/types'

export function useExportBatches() {
  return useMutation({
    mutationFn: (params: Omit<ListBatchesParams, 'page' | 'limit'>) => exportBatchesCsv(params),
    onSuccess: (blob) => {
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `batches-export-${timestamp}.csv`)
    },
  })
}
