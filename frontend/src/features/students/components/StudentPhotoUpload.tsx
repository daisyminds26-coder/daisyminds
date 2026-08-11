import { useRef } from 'react'
import { Trash2, UploadCloud } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import {
  useRemoveStudentPhoto,
  useUploadStudentPhoto,
} from '@/features/students/hooks/use-student-photo'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { toast } from '@/shared/lib/toast'
import type { AdminStudent } from '@/features/students/types'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

interface StudentPhotoUploadProps {
  student: AdminStudent
}

/** Direct-to-Cloudinary signed upload — see use-student-photo.ts for the full security rationale. */
export function StudentPhotoUpload({ student }: StudentPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadStudentPhoto(student.id)
  const remove = useRemoveStudentPhoto(student.id)
  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase()

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
        {student.profilePhotoUrl && <AvatarImage src={student.profilePhotoUrl} alt="" />}
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
              : student.profilePhotoUrl
                ? 'Replace photo'
                : 'Upload photo'}
          </Button>
          {student.profilePhotoUrl && (
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
