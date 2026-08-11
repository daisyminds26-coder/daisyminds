import { CheckCircle2, RotateCcw, Trash2, XCircle } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

interface BulkActionBarProps {
  selectedCount: number
  onActivate: () => void
  onDeactivate: () => void
  onDelete: () => void
  onRestore: () => void
  onClearSelection: () => void
  isPending?: boolean
}

export function BulkActionBar({
  selectedCount,
  onActivate,
  onDeactivate,
  onDelete,
  onRestore,
  onClearSelection,
  isPending,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="bg-accent border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5">
      <p className="text-body-sm font-medium">
        {selectedCount.toString()} trainer{selectedCount === 1 ? '' : 's'} selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onActivate}
          className="gap-1.5"
        >
          <CheckCircle2 className="size-3.5" />
          Activate
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onDeactivate}
          className="gap-1.5"
        >
          <XCircle className="size-3.5" />
          Deactivate
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
