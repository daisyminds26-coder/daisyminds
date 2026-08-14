import { useMutation, useQueryClient } from '@tanstack/react-query'

import { uploadDirectToCloudinary } from '@/features/courses/curriculum/content/lib/upload-to-cloudinary'
import {
  confirmAttachment,
  getAttachmentUploadSignature,
  removeAttachment,
} from '@/features/assignments/api/assignments.api'
import { assignmentsKeys } from '@/features/assignments/api/query-keys'
import type { AdminAssignment } from '@/features/assignments/types'

/** Signature → direct browser-to-Cloudinary upload → server-side verify-and-confirm, one mutation — the backend never proxies file bytes (ARCHITECTURE.md §21). */
export function useUploadAssignmentAttachment(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const params = await getAttachmentUploadSignature(assignmentId)
      await uploadDirectToCloudinary(file, params)
      return confirmAttachment(assignmentId, params.publicId, file.name)
    },
    onSuccess: (updated: AdminAssignment) => {
      queryClient.setQueryData(assignmentsKeys.detail(assignmentId), updated)
    },
  })
}

export function useRemoveAssignmentAttachment(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) => removeAttachment(assignmentId, attachmentId),
    onSuccess: (updated: AdminAssignment) => {
      queryClient.setQueryData(assignmentsKeys.detail(assignmentId), updated)
    },
  })
}
