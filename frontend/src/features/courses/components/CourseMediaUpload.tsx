import { useRef } from 'react'
import { ImageIcon, Trash2, UploadCloud } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { toast } from '@/shared/lib/toast'
import type { AdminCourse } from '@/features/courses/types'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

interface MediaSlotProps {
  label: string
  description: string
  imageUrl: string | null
  isUploading: boolean
  isRemoving: boolean
  aspectClassName: string
  onUpload: (file: File) => void
  onRemove: () => void
}

function MediaSlot({
  label,
  description,
  imageUrl,
  isUploading,
  isRemoving,
  aspectClassName,
  onUpload,
  onRemove,
}: MediaSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileSelected(file: File | undefined) {
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Unsupported file type', 'Please upload a JPG, PNG, or WEBP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('File too large', `${label} images must be 5MB or smaller.`)
      return
    }
    onUpload(file)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm font-medium">{label}</p>
      <div
        className={`bg-muted border-border relative flex w-full items-center justify-center overflow-hidden rounded-lg border ${aspectClassName}`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <ImageIcon className="text-muted-foreground size-8" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          handleFileSelected(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud className="size-3.5" />
          {isUploading ? 'Uploading…' : imageUrl ? 'Replace' : 'Upload'}
        </Button>
        {imageUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive gap-1.5"
            disabled={isRemoving}
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
            Remove
          </Button>
        )}
      </div>
      <p className="text-caption text-muted-foreground">{description}</p>
    </div>
  )
}

interface CourseMediaUploadProps {
  course: AdminCourse
  uploadThumbnail: (file: File) => void
  removeThumbnail: () => void
  isUploadingThumbnail: boolean
  isRemovingThumbnail: boolean
  uploadBanner: (file: File) => void
  removeBanner: () => void
  isUploadingBanner: boolean
  isRemovingBanner: boolean
}

/** Two independent signed-upload slots — see `use-course-media.ts` for the full security rationale (identical pattern to the student/trainer profile photo flow, just doubled). */
export function CourseMediaUpload({
  course,
  uploadThumbnail,
  removeThumbnail,
  isUploadingThumbnail,
  isRemovingThumbnail,
  uploadBanner,
  removeBanner,
  isUploadingBanner,
  isRemovingBanner,
}: CourseMediaUploadProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <MediaSlot
        label="Thumbnail"
        description="JPG, PNG, or WEBP. Max 5MB. Required to publish."
        imageUrl={course.thumbnailUrl}
        isUploading={isUploadingThumbnail}
        isRemoving={isRemovingThumbnail}
        aspectClassName="aspect-square"
        onUpload={(file) => {
          uploadThumbnail(file)
        }}
        onRemove={() => {
          removeThumbnail()
        }}
      />
      <MediaSlot
        label="Banner"
        description="JPG, PNG, or WEBP. Max 5MB. Used on the course detail preview."
        imageUrl={course.bannerUrl}
        isUploading={isUploadingBanner}
        isRemoving={isRemovingBanner}
        aspectClassName="aspect-video"
        onUpload={(file) => {
          uploadBanner(file)
        }}
        onRemove={() => {
          removeBanner()
        }}
      />
    </div>
  )
}
