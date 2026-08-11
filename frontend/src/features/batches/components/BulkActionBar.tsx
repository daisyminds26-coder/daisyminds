import { Archive, Ban, Trash2 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

interface BulkActionBarProps {
  selectedCount: number
  onArchive: () => void
  onCancel: () => void
  onDelete: () => void
  onClearSelection: () => void
  isPending?: boolean
}

export function BulkActionBar({
  selectedCount,
  onArchive,
  onCancel,
  onDelete,
  onClearSelection,
  isPending,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="bg-accent border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5">
      <p className="text-body-sm font-medium">
        {selectedCount.toString()} batch{selectedCount === 1 ? '' : 'es'} selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onCancel}
          className="gap-1.5"
        >
          <Ban className="size-3.5" />
          Cancel
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
