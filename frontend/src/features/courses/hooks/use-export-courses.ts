import { useMutation } from '@tanstack/react-query'

import { exportCoursesCsv } from '@/features/courses/api/courses.api'
import { downloadBlob } from '@/features/courses/utils/download-blob'
import type { ListCoursesParams } from '@/features/courses/types'

export function useExportCourses() {
  return useMutation({
    mutationFn: (params: Omit<ListCoursesParams, 'page' | 'limit'>) => exportCoursesCsv(params),
    onSuccess: (blob) => {
      const timestamp = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `courses-export-${timestamp}.csv`)
    },
  })
}
