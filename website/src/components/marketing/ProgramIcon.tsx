import {
  BarChart3,
  BrainCircuit,
  Cloud,
  Code2,
  GraduationCap,
  LineChart,
  Megaphone,
  ShieldCheck,
  Smartphone,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

/**
 * Course Management has no icon field — this is purely cosmetic, so it's
 * kept client-side rather than inventing a backend field for it. Keyed by
 * `slug` (today's 9 real programs happen to use exactly these slugs);
 * `DEFAULT_ICON` covers any future program added via Admin whose slug isn't
 * in this curated map, so a newly-published course never renders a missing
 * icon.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  'web-development': Code2,
  'android-development': Smartphone,
  cybersecurity: ShieldCheck,
  'artificial-intelligence': BrainCircuit,
  'data-science': LineChart,
  'data-analytics': BarChart3,
  devops: Workflow,
  'cloud-computing': Cloud,
  'digital-marketing': Megaphone,
}

const DEFAULT_ICON: LucideIcon = GraduationCap

interface ProgramIconProps {
  slug: string
  className?: string
}

export function ProgramIcon({ slug, className }: ProgramIconProps) {
  const Icon = ICON_MAP[slug] ?? DEFAULT_ICON
  return <Icon className={className} aria-hidden="true" />
}
