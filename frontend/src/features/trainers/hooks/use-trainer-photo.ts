import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  confirmPhoto,
  getPhotoUploadSignature,
  removePhoto,
} from '@/features/trainers/api/trainers.api'
import { trainersKeys } from '@/features/trainers/api/query-keys'
import type { AdminTrainer, SignedUploadParams } from '@/features/trainers/types'

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

/** See `features/students/hooks/use-student-photo.ts` for the full security rationale — identical pattern. */
export function useUploadTrainerPhoto(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const signature = await getPhotoUploadSignature(id)
      await uploadDirectToCloudinary(file, signature)
      return confirmPhoto(id, signature.publicId)
    },
    onSuccess: (updated: AdminTrainer) => {
      queryClient.setQueryData(trainersKeys.detail(id), updated)
    },
  })
}

export function useRemoveTrainerPhoto(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => removePhoto(id),
    onSuccess: (updated: AdminTrainer) => {
      queryClient.setQueryData(trainersKeys.detail(id), updated)
    },
  })
}
