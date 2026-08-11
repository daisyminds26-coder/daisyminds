import { useMutation } from '@tanstack/react-query'

import { exportUsersCsv } from '@/features/users/api/users.api'
import { downloadBlob } from '@/features/users/utils/download-blob'
import type { ListUsersParams } from '@/features/users/types'

export function useExportUsers() {
  return useMutation({
    mutationFn: (params: Omit<ListUsersParams, 'page' | 'limit'>) => exportUsersCsv(params),
    onSuccess: (blob) => {
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `users-export-${timestamp}.csv`)
    },
  })
}
