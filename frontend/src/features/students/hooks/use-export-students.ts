import { useMutation } from '@tanstack/react-query'

import { exportStudentsCsv } from '@/features/students/api/students.api'
import { downloadBlob } from '@/features/students/utils/download-blob'
import type { ListStudentsParams } from '@/features/students/types'

export function useExportStudents() {
  return useMutation({
    mutationFn: (params: Omit<ListStudentsParams, 'page' | 'limit'>) => exportStudentsCsv(params),
    onSuccess: (blob) => {
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `students-export-${timestamp}.csv`)
    },
  })
}
