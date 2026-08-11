import { Drawer } from '@/shared/components/overlays/drawer'
import { Button } from '@/shared/components/ui/button'
import { TrainerEditForm } from '@/features/trainers/components/TrainerEditForm'
import type { AdminTrainer } from '@/features/trainers/types'

interface TrainerEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trainer: AdminTrainer | undefined
}

export function TrainerEditDrawer({ open, onOpenChange, trainer }: TrainerEditDrawerProps) {
  function close() {
    onOpenChange(false)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Edit trainer"
      className="sm:max-w-2xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="trainer-edit-form">
            Save changes
          </Button>
        </>
      }
    >
      {trainer && <TrainerEditForm trainer={trainer} onDone={close} />}
    </Drawer>
  )
}
