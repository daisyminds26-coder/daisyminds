import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getDocumentPreviewUrl,
  getDocumentUploadSignature,
  removeDocument,
  verifyDocument,
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

export function useUploadDocument({ courseId, moduleId, lessonId }: LessonContentParams) {
  const invalidate = useInvalidateLessonContent(courseId, lessonId)
  const [progress, setProgress] = useState(0)

  const mutation = useMutation({
    mutationFn: async (file: File): Promise<LessonContent> => {
      setProgress(0)
      const signature = await getDocumentUploadSignature(courseId, moduleId, lessonId)
      await uploadDirectToCloudinary(file, signature, setProgress)
      return verifyDocument(courseId, moduleId, lessonId, signature.publicId, file.name)
    },
    onSuccess: invalidate,
    onSettled: () => {
      setProgress(0)
    },
  })

  return { ...mutation, progress }
}

export function useRemoveDocument({ courseId, moduleId, lessonId }: LessonContentParams) {
  const invalidate = useInvalidateLessonContent(courseId, lessonId)
  return useMutation({
    mutationFn: () => removeDocument(courseId, moduleId, lessonId),
    onSuccess: invalidate,
  })
}

export function useDocumentPreviewUrl({ courseId, moduleId, lessonId }: LessonContentParams) {
  return useQuery({
    queryKey: [...lessonContentKeys.detail(lessonId), 'document-preview-url'],
    queryFn: () => getDocumentPreviewUrl(courseId, moduleId, lessonId),
    enabled: false,
    staleTime: 0,
    gcTime: 0,
  })
}
