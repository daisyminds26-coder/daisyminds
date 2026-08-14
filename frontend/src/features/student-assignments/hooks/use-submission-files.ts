import { useMutation, useQueryClient } from '@tanstack/react-query'

import { uploadDirectToCloudinary } from '@/features/courses/curriculum/content/lib/upload-to-cloudinary'
import {
  confirmFile,
  getFileUploadSignature,
  removeFile,
} from '@/features/student-assignments/api/student-assignments.api'
import { studentAssignmentsKeys } from '@/features/student-assignments/api/query-keys'

export function useUploadSubmissionFile(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const params = await getFileUploadSignature(assignmentId)
      await uploadDirectToCloudinary(file, params)
      return confirmFile(assignmentId, params.publicId, file.name)
    },
    // The uploaded file lives on the current-attempt submission doc, read
    // via the history endpoint (not the assignment detail DTO) — both are
    // invalidated so the roster-level `canSubmit`/attempt-count summary
    // and the actual file list both stay in sync.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studentAssignmentsKeys.detail(assignmentId) })
      await queryClient.invalidateQueries({
        queryKey: studentAssignmentsKeys.history(assignmentId),
      })
    },
  })
}

export function useRemoveSubmissionFile(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fileId: string) => removeFile(assignmentId, fileId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studentAssignmentsKeys.detail(assignmentId) })
      await queryClient.invalidateQueries({
        queryKey: studentAssignmentsKeys.history(assignmentId),
      })
    },
  })
}
