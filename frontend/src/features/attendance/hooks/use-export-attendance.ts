import { useMutation } from '@tanstack/react-query'

import { exportAttendanceCsv } from '@/features/attendance/api/attendance.api'
import { downloadBlob } from '@/features/batches/utils/download-blob'
import type { ListAttendanceParams } from '@/features/attendance/types'

export function useExportAttendance() {
  return useMutation({
    mutationFn: (params: Omit<ListAttendanceParams, 'page' | 'limit'>) =>
      exportAttendanceCsv(params),
    onSuccess: (blob) => {
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `attendance-export-${timestamp}.csv`)
    },
  })
}
