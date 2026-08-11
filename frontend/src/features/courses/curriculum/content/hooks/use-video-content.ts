import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getVideoPreviewUrl,
  getVideoUploadSignature,
  removeVideo,
  verifyVideo,
} from '@/features/courses/curriculum/content/api/lesson-content.api'
import { lessonContentKeys } from '@/features/courses/curriculum/content/api/query-keys'
import { curriculumKeys } from '@/features/courses/curriculum/api/query-keys'
import { uploadDirectToCloudinary } from '@/features/courses/curriculum/content/lib/upload-to-cloudinary'
import type { LessonContentParams } from '@/features/courses/curriculum/content/hooks/use-lesson-content'
import type { LessonContent } from '@/features/courses/curriculum/content/types'

function useInvalidateLessonContent(courseId: string, lessonId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: lessonContentKeys.all(lessonId) })
    void queryClient.invalidateQueries({ queryKey: curriculumKeys.tree(courseId) })
  }
}

/**
 * Combines the signature → direct-upload → verify steps into one mutation
 * so the video content editor doesn't have to orchestrate three separate
 * network calls itself, while still exposing live upload progress (task's
 * "upload zone/progress" UX requirement).
 */
export function useUploadVideo({ courseId, moduleId, lessonId }: LessonContentParams) {
  const invalidate = useInvalidateLessonContent(courseId, lessonId)
  const [progress, setProgress] = useState(0)

  const mutation = useMutation({
    mutationFn: async (file: File): Promise<LessonContent> => {
      setProgress(0)
      const signature = await getVideoUploadSignature(courseId, moduleId, lessonId)
      await uploadDirectToCloudinary(file, signature, setProgress)
      return verifyVideo(courseId, moduleId, lessonId, signature.publicId)
    },
    onSuccess: invalidate,
    onSettled: () => {
      setProgress(0)
    },
  })

  return { ...mutation, progress }
}

export function useRemoveVideo({ courseId, moduleId, lessonId }: LessonContentParams) {
  const invalidate = useInvalidateLessonContent(courseId, lessonId)
  return useMutation({
    mutationFn: () => removeVideo(courseId, moduleId, lessonId),
    onSuccess: invalidate,
  })
}

/** Fetched lazily (`enabled: false` + `refetch()`) — a preview URL is short-lived, so it's never pre-fetched, only requested the moment the admin opens the preview. */
export function useVideoPreviewUrl({ courseId, moduleId, lessonId }: LessonContentParams) {
  return useQuery({
    queryKey: [...lessonContentKeys.detail(lessonId), 'video-preview-url'],
    queryFn: () => getVideoPreviewUrl(courseId, moduleId, lessonId),
    enabled: false,
    staleTime: 0,
    gcTime: 0,
  })
}
