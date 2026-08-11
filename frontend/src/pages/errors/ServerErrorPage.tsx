import { ServerCrash } from 'lucide-react'

import { StatusPage } from '@/shared/components/feedback/status-page'
import { Button } from '@/shared/components/ui/button'

export default function ServerErrorPage() {
  return (
    <StatusPage
      icon={ServerCrash}
      code="500"
      title="Something went wrong on our end"
      description="An unexpected server error occurred. Our team has been notified — please try again shortly."
      action={
        <Button
          onClick={() => {
            window.location.reload()
          }}
        >
          Reload page
        </Button>
      }
    />
  )
}
