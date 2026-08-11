import { useLocation } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

import { StatusPage } from '@/shared/components/feedback/status-page'

function humanize(segment: string): string {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * Placeholder destination for every nav item whose business module hasn't
 * been built yet (Student/Course/Batch Management, etc. — explicitly out
 * of scope for this phase). The module name is derived from the URL so one
 * page covers every such route without a dedicated file per module.
 */
export default function ComingSoonPage() {
  const location = useLocation()
  const lastSegment = location.pathname.split('/').filter(Boolean).pop() ?? 'module'

  return (
    <StatusPage
      icon={Sparkles}
      title={`${humanize(lastSegment)} is coming soon`}
      description="This module is on our roadmap and isn't available yet. Check back soon."
    />
  )
}
