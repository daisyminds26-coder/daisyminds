import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PageContainer } from '@/shared/components/containers/page-container'
import { buttonVariants } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { TrainerCreateWizard } from '@/features/trainers/components/TrainerCreateWizard'

export default function TrainerCreatePage() {
  const navigate = useNavigate()

  return (
    <PageContainer
      title="Create trainer"
      description="Complete each step to create the trainer record."
      actions={
        <Link
          to="/admin/trainers"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back to trainers
        </Link>
      }
    >
      <Card>
        <CardContent>
          <TrainerCreateWizard
            onDone={() => {
              void navigate('/admin/trainers')
            }}
          />
        </CardContent>
      </Card>
    </PageContainer>
  )
}
