import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  confirmPhoto,
  getPhotoUploadSignature,
  removePhoto,
} from '@/features/students/api/students.api'
import { studentsKeys } from '@/features/students/api/query-keys'
import type { AdminStudent, SignedUploadParams } from '@/features/students/types'

async function uploadDirectToCloudinary(file: File, params: SignedUploadParams): Promise<void> {
  const body = new FormData()
  body.append('file', file)
  body.append('api_key', params.apiKey)
  body.append('timestamp', String(params.timestamp))
  body.append('signature', params.signature)
  body.append('folder', params.folder)
  body.append('public_id', params.publicId)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`, {
    method: 'POST',
    body,
  })

  if (!response.ok) {
    throw new Error('The image upload failed. Please try again.')
  }
}

/**
 * SECURITY.md §6: the browser uploads the file bytes directly to Cloudinary
 * using a short-lived, server-issued signature (`getPhotoUploadSignature`)
 * — our backend never proxies image bytes and never holds/leaks the
 * upload path to a Cloudinary API secret. The upload is only considered
 * real once `confirmPhoto` round-trips through the backend, which
 * independently re-verifies the asset against the Cloudinary Admin API
 * before persisting it (student-management.service.ts#confirmPhoto) — this
 * hook never trusts its own belief that the upload succeeded.
 */
export function useUploadStudentPhoto(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const signature = await getPhotoUploadSignature(id)
      await uploadDirectToCloudinary(file, signature)
      return confirmPhoto(id, signature.publicId)
    },
    onSuccess: (updated: AdminStudent) => {
      queryClient.setQueryData(studentsKeys.detail(id), updated)
    },
  })
}

export function useRemoveStudentPhoto(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => removePhoto(id),
    onSuccess: (updated: AdminStudent) => {
      queryClient.setQueryData(studentsKeys.detail(id), updated)
    },
  })
}
