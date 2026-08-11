import { Construction } from 'lucide-react'

import { StatusPage } from '@/shared/components/feedback/status-page'

export default function MaintenancePage() {
  return (
    <StatusPage
      icon={Construction}
      title="Scheduled maintenance"
      description="Daisy Minds LMS is currently undergoing scheduled maintenance. We'll be back shortly — thanks for your patience."
    />
  )
}
