import { useRef } from 'react'
import { Trash2, UploadCloud } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import {
  useRemoveTrainerPhoto,
  useUploadTrainerPhoto,
} from '@/features/trainers/hooks/use-trainer-photo'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import type { AdminTrainer } from '@/features/trainers/types'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

interface TrainerPhotoUploadProps {
  trainer: AdminTrainer
}

/** Direct-to-Cloudinary signed upload — see use-trainer-photo.ts for the full security rationale. */
export function TrainerPhotoUpload({ trainer }: TrainerPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadTrainerPhoto(trainer.id)
  const remove = useRemoveTrainerPhoto(trainer.id)
  const initials = `${trainer.firstName.charAt(0)}${trainer.lastName.charAt(0)}`.toUpperCase()

  function handleFileSelected(file: File | undefined) {
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Unsupported file type', 'Please upload a JPG, PNG, or WEBP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('File too large', 'Profile photos must be 5MB or smaller.')
      return
    }

    upload.mutate(file, {
      onSuccess: () => toast.success('Profile photo updated'),
      onError: (error) => toast.error('Could not upload photo', getSafeErrorMessage(error)),
    })
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {trainer.profilePhotoUrl && <AvatarImage src={trainer.profilePhotoUrl} alt="" />}
        <AvatarFallback className="text-h2">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
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
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud className="size-3.5" />
            {upload.isPending
              ? 'Uploading…'
              : trainer.profilePhotoUrl
                ? 'Replace photo'
                : 'Upload photo'}
          </Button>
          {trainer.profilePhotoUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive gap-1.5"
              disabled={remove.isPending}
              onClick={() => {
                remove.mutate(undefined, {
                  onSuccess: () => toast.success('Profile photo removed'),
                  onError: (error) =>
                    toast.error('Could not remove photo', getSafeErrorMessage(error)),
                })
              }}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-caption text-muted-foreground">JPG, PNG, or WEBP. Max 5MB.</p>
      </div>
    </div>
  )
}
