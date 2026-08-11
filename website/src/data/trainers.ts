import type { Trainer } from '@/types/trainer'

/** Placeholder for `GET /api/v1/public/trainers` — see `data/programs.ts` for the pattern this follows. */
const TRAINERS: Trainer[] = [
  {
    slug: 'arjun-mehta',
    name: 'Arjun Mehta',
    role: 'Lead Mentor, Full Stack Development',
    expertise: ['React', 'Node.js', 'System Design'],
    bio: '9 years building production web platforms before moving into full-time mentorship — focused on making engineering fundamentals stick.',
    initials: 'AM',
  },
  {
    slug: 'priya-nair',
    name: 'Priya Nair',
    role: 'Lead Mentor, Data Science',
    expertise: ['Python', 'Machine Learning', 'Analytics'],
    bio: 'Former product analytics lead who now teaches statistics and ML the way she wishes someone had taught her.',
    initials: 'PN',
  },
  {
    slug: 'karthik-rao',
    name: 'Karthik Rao',
    role: 'Lead Mentor, Product Design',
    expertise: ['Product Design', 'Design Systems', 'Research'],
    bio: 'Design lead with a decade across startups and enterprise product teams, specializing in design-systems thinking.',
    initials: 'KR',
  },
  {
    slug: 'sana-sheikh',
    name: 'Sana Sheikh',
    role: 'Lead Mentor, Cloud & DevOps',
    expertise: ['AWS', 'Kubernetes', 'Platform Engineering'],
    bio: 'Platform engineer who has run production infrastructure at scale — teaches the operational discipline behind the tooling.',
    initials: 'SS',
  },
]

export async function getTrainers(): Promise<Trainer[]> {
  return Promise.resolve(TRAINERS)
}
