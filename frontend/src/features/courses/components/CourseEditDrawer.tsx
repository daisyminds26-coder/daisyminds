import { Drawer } from '@/shared/components/overlays/drawer'
import { Button } from '@/shared/components/ui/button'
import { CourseEditForm } from '@/features/courses/components/CourseEditForm'
import type { AdminCourse } from '@/features/courses/types'

interface CourseEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: AdminCourse | undefined
}

export function CourseEditDrawer({ open, onOpenChange, course }: CourseEditDrawerProps) {
  function close() {
    onOpenChange(false)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Edit course"
      className="sm:max-w-2xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="course-edit-form">
            Save changes
          </Button>
        </>
      }
    >
      {course && <CourseEditForm course={course} onDone={close} />}
    </Drawer>
  )
}
