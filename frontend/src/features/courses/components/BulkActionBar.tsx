import { Archive, RotateCcw, Send, Trash2 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

interface BulkActionBarProps {
  selectedCount: number
  onPublish: () => void
  onArchive: () => void
  onDelete: () => void
  onRestore: () => void
  onClearSelection: () => void
  isPending?: boolean
}

export function BulkActionBar({
  selectedCount,
  onPublish,
  onArchive,
  onDelete,
  onRestore,
  onClearSelection,
  isPending,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="bg-accent border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5">
      <p className="text-body-sm font-medium">
        {selectedCount.toString()} course{selectedCount === 1 ? '' : 's'} selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onPublish}
          className="gap-1.5"
        >
          <Send className="size-3.5" />
          Publish
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onArchive}
          className="gap-1.5"
        >
          <Archive className="size-3.5" />
          Archive
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onRestore}
          className="gap-1.5"
        >
          <RotateCcw className="size-3.5" />
          Restore
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onDelete}
          className="text-destructive gap-1.5"
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
          Clear
        </Button>
      </div>
    </div>
  )
}
