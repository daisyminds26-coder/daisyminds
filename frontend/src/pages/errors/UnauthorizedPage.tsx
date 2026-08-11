import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

import { StatusPage } from '@/shared/components/feedback/status-page'
import { Button } from '@/shared/components/ui/button'

export default function UnauthorizedPage() {
  return (
    <StatusPage
      icon={ShieldAlert}
      code="403"
      title="You don't have access to this page"
      description="Your account doesn't have permission to view this page. Contact an administrator if you believe this is a mistake."
      action={
        <Button asChild>
          <Link to="/">Go to homepage</Link>
        </Button>
      }
    />
  )
}
