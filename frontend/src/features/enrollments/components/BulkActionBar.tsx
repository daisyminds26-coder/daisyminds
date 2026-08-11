import { Pause, Play, XCircle } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

interface BulkActionBarProps {
  selectedCount: number
  onSuspend: () => void
  onResume: () => void
  onCancel: () => void
  onClearSelection: () => void
  isPending?: boolean
}

/** Only `suspend`/`resume`/`cancel` — the only bulk lifecycle actions the backend actually supports (task's own explicit "do not invent bulk complete/drop"). */
export function BulkActionBar({
  selectedCount,
  onSuspend,
  onResume,
  onCancel,
  onClearSelection,
  isPending,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="bg-accent border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5">
      <p className="text-body-sm font-medium">
        {selectedCount.toString()} enrollment{selectedCount === 1 ? '' : 's'} selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onSuspend}
          className="gap-1.5"
        >
          <Pause className="size-3.5" />
          Suspend
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onResume}
          className="gap-1.5"
        >
          <Play className="size-3.5" />
          Resume
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onCancel}
          className="text-destructive gap-1.5"
        >
          <XCircle className="size-3.5" />
          Cancel
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
          Clear
        </Button>
      </div>
    </div>
  )
}
