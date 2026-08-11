import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

import { StatusPage } from '@/shared/components/feedback/status-page'
import { Button } from '@/shared/components/ui/button'

export default function NotFoundPage() {
  return (
    <StatusPage
      icon={Compass}
      code="404"
      title="Page not found"
      description="The page you're looking for doesn't exist or may have been moved."
      action={
        <Button asChild>
          <Link to="/">Go to homepage</Link>
        </Button>
      }
    />
  )
}
