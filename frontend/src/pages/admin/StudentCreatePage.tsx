import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { buttonVariants } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { StudentCreateWizard } from '@/features/students/components/StudentCreateWizard'

export default function StudentCreatePage() {
  const navigate = useNavigate()

  return (
    <PageContainer
      title="Create student"
      description="Complete each step to create the student record."
      actions={
        <Link
          to="/admin/students"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back to students
        </Link>
      }
    >
      <Card>
        <CardContent>
          <StudentCreateWizard
            onDone={() => {
              void navigate('/admin/students')
            }}
          />
        </CardContent>
      </Card>
    </PageContainer>
  )
}
