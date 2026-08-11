import { Drawer } from '@/shared/components/overlays/drawer'
import { Button } from '@/shared/components/ui/button'
import { StudentEditForm } from '@/features/students/components/StudentEditForm'
import type { AdminStudent } from '@/features/students/types'

interface StudentEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: AdminStudent | undefined
}

export function StudentEditDrawer({ open, onOpenChange, student }: StudentEditDrawerProps) {
  function close() {
    onOpenChange(false)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Edit student"
      className="sm:max-w-2xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="student-edit-form">
            Save changes
          </Button>
        </>
      }
    >
      {student && <StudentEditForm student={student} onDone={close} />}
    </Drawer>
  )
}
