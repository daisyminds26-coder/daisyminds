import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deleteResource,
  getResourceDeliveryUrl,
  getResourceUploadSignature,
  listResources,
  reorderResources,
  updateResourceMetadata,
  verifyAndAddResource,
  type UpdateResourceMetadataPayload,
} from '@/features/courses/curriculum/content/api/lesson-resource.api'
import { lessonContentKeys } from '@/features/courses/curriculum/content/api/query-keys'
import { uploadDirectToCloudinary } from '@/features/courses/curriculum/content/lib/upload-to-cloudinary'
import type { LessonContentParams } from '@/features/courses/curriculum/content/hooks/use-lesson-content'
import type {
  LessonResource,
  ReorderResourceItem,
} from '@/features/courses/curriculum/content/types'

function useInvalidateResources(lessonId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: lessonContentKeys.resources(lessonId) })
  }
}

export function useLessonResources({ courseId, moduleId, lessonId }: LessonContentParams) {
  return useQuery({
    queryKey: lessonContentKeys.resources(lessonId),
    queryFn: () => listResources(courseId, moduleId, lessonId),
  })
}

export interface AddResourceInput {
  file: File
  title: string
  description?: string
  isDownloadable?: boolean
}

export function useAddResource({ courseId, moduleId, lessonId }: LessonContentParams) {
  const invalidate = useInvalidateResources(lessonId)
  const [progress, setProgress] = useState(0)

  const mutation = useMutation({
    mutationFn: async ({
      file,
      title,
      description,
      isDownloadable,
    }: AddResourceInput): Promise<LessonResource> => {
      setProgress(0)
      const signature = await getResourceUploadSignature(courseId, moduleId, lessonId)
      await uploadDirectToCloudinary(file, signature, setProgress)
      return verifyAndAddResource(courseId, moduleId, lessonId, {
        publicId: signature.publicId,
        filename: file.name,
        title,
        description,
        isDownloadable,
      })
    },
    onSuccess: invalidate,
    onSettled: () => {
      setProgress(0)
    },
  })

  return { ...mutation, progress }
}

export function useUpdateResourceMetadata({ courseId, moduleId, lessonId }: LessonContentParams) {
  const invalidate = useInvalidateResources(lessonId)
  return useMutation({
    mutationFn: ({
      resourceId,
      payload,
    }: {
      resourceId: string
      payload: UpdateResourceMetadataPayload
    }) => updateResourceMetadata(courseId, moduleId, lessonId, resourceId, payload),
    onSuccess: invalidate,
  })
}

export function useReorderResources({ courseId, moduleId, lessonId }: LessonContentParams) {
  const invalidate = useInvalidateResources(lessonId)
  return useMutation({
    mutationFn: (items: ReorderResourceItem[]) =>
      reorderResources(courseId, moduleId, lessonId, items),
    onSuccess: invalidate,
  })
}

export function useDeleteResource({ courseId, moduleId, lessonId }: LessonContentParams) {
  const invalidate = useInvalidateResources(lessonId)
  return useMutation({
    mutationFn: (resourceId: string) => deleteResource(courseId, moduleId, lessonId, resourceId),
    onSuccess: invalidate,
  })
}

export function useResourceDeliveryUrl({ courseId, moduleId, lessonId }: LessonContentParams) {
  return useMutation({
    mutationFn: (resourceId: string) =>
      getResourceDeliveryUrl(courseId, moduleId, lessonId, resourceId),
  })
}
