import { useState } from 'react'

import { Modal } from '@/shared/components/overlays/modal'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'

interface CancelLiveClassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending: boolean
  onConfirm: (reason: string) => void
}

/** Cancellation always requires a reason (audited) — never a bare status flip, matching the backend's `cancelLiveClassSchema`. */
export function CancelLiveClassDialog({
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: CancelLiveClassDialogProps) {
  const [reason, setReason] = useState('')

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setReason('')
      }}
      title="Cancel this session?"
      description="Students currently see this session — cancelling keeps it visible with a clearly cancelled status, for history."
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="cancel-reason">Cancellation reason</Label>
        <Textarea
          id="cancel-reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value)
          }}
          placeholder="e.g. Trainer unavailable, rescheduled to a later date"
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onOpenChange(false)
          }}
        >
          Keep session
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={isPending || reason.trim().length === 0}
          onClick={() => {
            onConfirm(reason.trim())
          }}
        >
          {isPending ? 'Cancelling…' : 'Cancel session'}
        </Button>
      </div>
    </Modal>
  )
}
