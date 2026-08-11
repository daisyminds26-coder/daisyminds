import { useRef } from 'react'
import { File as FileIcon, UploadCloud, X } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toString()} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex] ?? 'GB'}`
}

interface MediaUploadZoneProps {
  accept: string
  selectedFile: File | null
  onSelectFile: (file: File | null) => void
  disabled?: boolean
  helperText: string
}

/**
 * Local file selection only — deliberately never auto-uploads on select
 * (task's own "no auto-upload-on-select" UX requirement). The caller
 * renders its own explicit "Upload" button once a file is selected here.
 */
export function MediaUploadZone({
  accept,
  selectedFile,
  onSelectFile,
  disabled,
  helperText,
}: MediaUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(event) => {
          onSelectFile(event.target.files?.[0] ?? null)
          event.target.value = ''
        }}
      />
      {selectedFile ? (
        <div className="border-input flex items-center gap-3 rounded-md border p-3">
          <FileIcon className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-body-sm truncate font-medium">{selectedFile.name}</p>
            <p className="text-caption text-muted-foreground">{formatBytes(selectedFile.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear selected file"
            disabled={disabled}
            onClick={() => {
              onSelectFile(null)
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-input hover:bg-muted/40 flex w-full flex-col items-center gap-2 rounded-md border border-dashed p-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <UploadCloud className="text-muted-foreground size-6" aria-hidden="true" />
          <span className="text-body-sm text-muted-foreground">Click to select a file</span>
          <span className="text-caption text-muted-foreground">{helperText}</span>
        </button>
      )}
    </div>
  )
}
