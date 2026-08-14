import axios from 'axios'

import type { SignedUploadParams } from '@/features/courses/curriculum/content/types'

/**
 * Direct browser-to-Cloudinary upload — the backend never proxies file
 * bytes (ARCHITECTURE.md §21). Generalizes `features/courses/hooks/use-
 * course-media.ts`'s image-only helper to any resource type the signature
 * specifies, and switches to `axios` (already installed) so upload
 * progress can be reported for the video/document/resource UX requirement
 * a plain `fetch` can't give us.
 */
export async function uploadDirectToCloudinary(
  file: File,
  params: SignedUploadParams,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const body = new FormData()
  body.append('file', file)
  body.append('api_key', params.apiKey)
  body.append('timestamp', String(params.timestamp))
  body.append('signature', params.signature)
  body.append('public_id', params.publicId)
  body.append('allowed_formats', params.allowedFormats.join(','))
  if (params.type !== 'upload') {
    body.append('type', params.type)
  }

  try {
    await axios.post(
      `https://api.cloudinary.com/v1_1/${params.cloudName}/${params.resourceType}/upload`,
      body,
      {
        onUploadProgress: (event) => {
          if (!onProgress || !event.total) return
          onProgress(Math.round((event.loaded / event.total) * 100))
        },
      },
    )
  } catch {
    throw new Error('The upload failed. Please try again.')
  }
}
