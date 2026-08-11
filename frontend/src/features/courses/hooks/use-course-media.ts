import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getBannerUploadSignature,
  getThumbnailUploadSignature,
  removeBanner,
  removeThumbnail,
  verifyBanner,
  verifyThumbnail,
} from '@/features/courses/api/courses.api'
import { coursesKeys } from '@/features/courses/api/query-keys'
import type { AdminCourse, SignedUploadParams } from '@/features/courses/types'

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

/** See `features/students/hooks/use-student-photo.ts` for the full security rationale — identical signed-upload/re-verify pattern, generalized here for two independent media slots (thumbnail/banner) instead of one. */
export function useUploadCourseThumbnail(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const signature = await getThumbnailUploadSignature(id)
      await uploadDirectToCloudinary(file, signature)
      return verifyThumbnail(id, signature.publicId)
    },
    onSuccess: (updated: AdminCourse) => {
      queryClient.setQueryData(coursesKeys.detail(id), updated)
    },
  })
}

export function useRemoveCourseThumbnail(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => removeThumbnail(id),
    onSuccess: (updated: AdminCourse) => {
      queryClient.setQueryData(coursesKeys.detail(id), updated)
    },
  })
}

export function useUploadCourseBanner(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const signature = await getBannerUploadSignature(id)
      await uploadDirectToCloudinary(file, signature)
      return verifyBanner(id, signature.publicId)
    },
    onSuccess: (updated: AdminCourse) => {
      queryClient.setQueryData(coursesKeys.detail(id), updated)
    },
  })
}

export function useRemoveCourseBanner(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => removeBanner(id),
    onSuccess: (updated: AdminCourse) => {
      queryClient.setQueryData(coursesKeys.detail(id), updated)
    },
  })
}
