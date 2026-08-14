import {
  Award,
  CalendarClock,
  Handshake,
  NotebookPen,
  Target,
  Users2,
  type LucideIcon,
} from 'lucide-react'

export interface WhyReason {
  icon: LucideIcon
  title: string
  description: string
}

/**
 * The six standard "why choose us" reasons, shared verbatim between the
 * homepage `WhyDaisyMinds` section and every program detail page's "Why
 * Learn at Daisy Minds" section — one source of truth, never duplicated.
 */
export const WHY_DAISY_MINDS_REASONS: WhyReason[] = [
  {
    icon: Target,
    title: 'Industry Relevant Skills',
    description:
      'Programs are built around practical, job-ready skills aligned with real industry work.',
  },
  {
    icon: Users2,
    title: 'Expert Mentors',
    description: 'Every program is led by mentors with real, hands-on industry experience.',
  },
  {
    icon: NotebookPen,
    title: 'Hands-on Projects',
    description: 'Every module includes hands-on project work, reviewed and guided by a mentor.',
  },
  {
    icon: Award,
    title: 'Certification',
    description: 'Receive a certificate of completion recognizing the skills you have built.',
  },
  {
    icon: Handshake,
    title: 'Placement Assistance',
    description:
      'Get support with interview preparation and portfolio building as you move toward your next role.',
  },
  {
    icon: CalendarClock,
    title: 'Flexible Learning',
    description:
      'Learn through a mix of live sessions and flexible scheduling built around your week.',
  },
]
