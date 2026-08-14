import {
  BarChart3,
  BrainCircuit,
  Cloud,
  Code2,
  LineChart,
  Megaphone,
  ShieldCheck,
  Smartphone,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

import type { ProgramIconName } from '@/types/program'

const ICON_MAP: Record<ProgramIconName, LucideIcon> = {
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

interface ProgramIconProps {
  name: ProgramIconName
  className?: string
}

/** Resolves a serializable `ProgramIconName` (from `data/programs.ts`) to its `lucide-react` component — keeps program data JSON/API-shaped, with no React component references baked into the data layer. */
export function ProgramIcon({ name, className }: ProgramIconProps) {
  const Icon = ICON_MAP[name]
  return <Icon className={className} aria-hidden="true" />
}
