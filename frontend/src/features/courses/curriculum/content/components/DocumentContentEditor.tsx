import { useState } from 'react'
import { ExternalLink, RefreshCw, Trash2 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import { ConfirmDialog } from '@/shared/components/overlays/confirm-dialog'
import { toast } from '@/shared/lib/toast'
import { getSafeErrorMessage } from '@/features/auth/utils/error-messages'
import { MediaUploadZone } from '@/features/courses/curriculum/content/components/MediaUploadZone'
import {
  useDocumentPreviewUrl,
  useRemoveDocument,
  useUploadDocument,
} from '@/features/courses/curriculum/content/hooks/use-document-content'
import type { DocumentAsset } from '@/features/courses/curriculum/content/types'
import type { LessonContentParams } from '@/features/courses/curriculum/content/hooks/use-lesson-content'

const ACCEPT = '.pdf,application/pdf'

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DocumentContentEditorProps extends LessonContentParams {
  documentAsset: DocumentAsset | null
}

export function DocumentContentEditor({ documentAsset, ...params }: DocumentContentEditorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const uploadDocument = useUploadDocument(params)
  const removeDocument = useRemoveDocument(params)
  const previewUrl = useDocumentPreviewUrl(params)

  function startUpload(file: File) {
    uploadDocument.mutate(file, {
      onSuccess: () => {
        toast.success('Document uploaded')
        setSelectedFile(null)
      },
      onError: (error) => toast.error('Document upload failed', getSafeErrorMessage(error)),
    })
  }

  function handleSelectFile(file: File | null) {
    if (file && documentAsset) {
      setSelectedFile(file)
      setConfirmReplace(true)
      return
    }
    setSelectedFile(file)
  }

  async function openPreview() {
    const result = await previewUrl.refetch()
    if (result.data) {
      window.open(result.data.url, '_blank', 'noopener,noreferrer')
    } else {
      toast.error('Could not load preview', 'Please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {documentAsset && (
        <div className="border-input flex flex-col gap-3 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-body-sm truncate font-medium">
              {documentAsset.originalFilename}
            </span>
            <span className="text-caption text-muted-foreground uppercase">
              {documentAsset.format}
            </span>
            <span className="text-caption text-muted-foreground">
              {formatBytes(documentAsset.bytes)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={previewUrl.isFetching}
              onClick={() => void openPreview()}
            >
              <ExternalLink className="size-3.5" />
              Preview
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive gap-1.5"
              disabled={removeDocument.isPending}
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
        disabled={uploadDocument.isPending}
        helperText="PDF only"
      />

      {uploadDocument.isPending && (
        <div className="flex flex-col gap-1.5">
          <Progress value={uploadDocument.progress} />
          <p className="text-caption text-muted-foreground">
            Uploading… {uploadDocument.progress.toString()}%
          </p>
        </div>
      )}

      {uploadDocument.isError && selectedFile && (
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

      {selectedFile && !documentAsset && !uploadDocument.isPending && (
        <Button
          type="button"
          className="w-fit"
          onClick={() => {
            startUpload(selectedFile)
          }}
        >
          Upload document
        </Button>
      )}

      <ConfirmDialog
        open={confirmReplace}
        onOpenChange={(open) => {
          setConfirmReplace(open)
          if (!open) setSelectedFile(null)
        }}
        title="Replace the existing document?"
        description="The current document will be removed once the new one finishes uploading and is verified."
        confirmLabel="Continue"
        onConfirm={() => {
          setConfirmReplace(false)
          if (selectedFile) startUpload(selectedFile)
        }}
      />

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remove this document?"
        description="Students will no longer be able to access this lesson's document. This cannot be undone."
        confirmLabel="Remove"
        tone="destructive"
        isConfirming={removeDocument.isPending}
        onConfirm={() => {
          removeDocument.mutate(undefined, {
            onSuccess: () => {
              toast.success('Document removed')
              setConfirmRemove(false)
            },
            onError: (error) => {
              toast.error('Could not remove document', getSafeErrorMessage(error))
              setConfirmRemove(false)
            },
          })
        }}
      />
    </div>
  )
}
