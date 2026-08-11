import { useState } from 'react'
import { AlertTriangle, Loader2, Play, RefreshCw, Trash2 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { MediaUploadZone } from '@/features/courses/curriculum/content/components/MediaUploadZone'
import {
  useRemoveVideo,
  useUploadVideo,
  useVideoPreviewUrl,
} from '@/features/courses/curriculum/content/hooks/use-video-content'
import type { VideoAsset } from '@/features/courses/curriculum/content/types'
import type { LessonContentParams } from '@/features/courses/curriculum/content/hooks/use-lesson-content'

const ACCEPT = '.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime'

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Unknown length'
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60)
  return `${minutes.toString()}:${remaining.toString().padStart(2, '0')}`
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface VideoContentEditorProps extends LessonContentParams {
  videoAsset: VideoAsset | null
}

export function VideoContentEditor({ videoAsset, ...params }: VideoContentEditorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const uploadVideo = useUploadVideo(params)
  const removeVideo = useRemoveVideo(params)
  const previewUrl = useVideoPreviewUrl(params)

  function startUpload(file: File) {
    uploadVideo.mutate(file, {
      onSuccess: () => {
        toast.success('Video uploaded')
        setSelectedFile(null)
      },
      onError: (error) => toast.error('Video upload failed', getSafeErrorMessage(error)),
    })
  }

  function handleSelectFile(file: File | null) {
    if (file && videoAsset) {
      setSelectedFile(file)
      setConfirmReplace(true)
      return
    }
    setSelectedFile(file)
  }

  async function openPreview() {
    const result = await previewUrl.refetch()
    if (result.data) setPreviewOpen(true)
    else toast.error('Could not load preview', 'Please try again.')
  }

  return (
    <div className="flex flex-col gap-4">
      {videoAsset && (
        <div className="border-input flex flex-col gap-3 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-body-sm font-medium uppercase">{videoAsset.format}</span>
            <span className="text-caption text-muted-foreground">
              {formatDuration(videoAsset.durationSeconds)}
            </span>
            <span className="text-caption text-muted-foreground">
              {formatBytes(videoAsset.bytes)}
            </span>
            {videoAsset.width && videoAsset.height && (
              <span className="text-caption text-muted-foreground">
                {videoAsset.width}×{videoAsset.height}
              </span>
            )}
          </div>

          {videoAsset.status === 'PROCESSING' && (
            <p className="text-caption text-info flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Processing…
            </p>
          )}
          {videoAsset.status === 'FAILED' && (
            <p className="text-caption text-destructive flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              The last upload failed. Remove it and try again.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={videoAsset.status !== 'READY' || previewUrl.isFetching}
              onClick={() => void openPreview()}
            >
              <Play className="size-3.5" />
              Preview
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive gap-1.5"
              disabled={removeVideo.isPending}
              onClick={() => {
                setConfirmRemove(true)
              }}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          </div>
        </div>
      )}

      <MediaUploadZone
        accept={ACCEPT}
        selectedFile={selectedFile}
        onSelectFile={handleSelectFile}
        disabled={uploadVideo.isPending}
        helperText="MP4, WebM, or MOV"
      />

      {uploadVideo.isPending && (
        <div className="flex flex-col gap-1.5">
          <Progress value={uploadVideo.progress} />
          <p className="text-caption text-muted-foreground">
            Uploading… {uploadVideo.progress.toString()}%
          </p>
        </div>
      )}

      {uploadVideo.isError && selectedFile && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-1.5"
          onClick={() => {
            startUpload(selectedFile)
          }}
        >
          <RefreshCw className="size-3.5" />
          Retry upload
        </Button>
      )}

      {selectedFile && !videoAsset && !uploadVideo.isPending && (
        <Button
          type="button"
          className="w-fit"
          onClick={() => {
            startUpload(selectedFile)
          }}
        >
          Upload video
        </Button>
      )}

      <ConfirmDialog
        open={confirmReplace}
        onOpenChange={(open) => {
          setConfirmReplace(open)
          if (!open) setSelectedFile(null)
        }}
        title="Replace the existing video?"
        description="The current video will be removed once the new one finishes uploading and is verified."
        confirmLabel="Continue"
        onConfirm={() => {
          setConfirmReplace(false)
          if (selectedFile) startUpload(selectedFile)
        }}
      />

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remove this video?"
        description="Students will no longer be able to see this lesson's video. This cannot be undone."
        confirmLabel="Remove"
        tone="destructive"
        isConfirming={removeVideo.isPending}
        onConfirm={() => {
          removeVideo.mutate(undefined, {
            onSuccess: () => {
              toast.success('Video removed')
              setConfirmRemove(false)
            },
            onError: (error) => {
              toast.error('Could not remove video', getSafeErrorMessage(error))
              setConfirmRemove(false)
            },
          })
        }}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Video preview</DialogTitle>
          </DialogHeader>
          {previewUrl.data && (
            <video controls src={previewUrl.data.url} className="w-full rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
