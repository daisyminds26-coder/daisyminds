import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { CourseCreateWizard } from '@/features/courses/components/CourseCreateWizard'

export default function CourseCreatePage() {
  const navigate = useNavigate()

  return (
    <PageContainer
      title="Create course"
      description="Complete each step to create the course record."
      actions={
        <Link
          to="/admin/courses"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back to courses
        </Link>
      }
    >
      <CourseCreateWizard
        onDone={() => {
          void navigate('/admin/courses')
        }}
      />
    </PageContainer>
  )
}
