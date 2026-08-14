import type { Plan } from '@/types/plan'

/**
 * The three Daisy Minds learning-path tiers — one source of truth for
 * pricing/features. Never hardcode a price or feature list anywhere else;
 * import from here. Placeholder for `GET /api/v1/public/plans`, same
 * replaceable-data-layer pattern as `data/programs.ts`.
 */
const PLANS: Plan[] = [
  {
    id: 'foundation',
    slug: 'short-term-foundation-modules',
    name: 'Short Term Foundation Modules',
    shortName: 'Foundation',
    duration: '30 Days',
    durationValue: 30,
    durationUnit: 'days',
    price: 4000,
    currency: 'INR',
    description:
      'Build essential foundations and understand the core concepts of your chosen technology.',
    features: [
      'Core concepts and fundamentals of your chosen program',
      'Guided lessons with a structured weekly schedule',
      'Introductory hands-on exercises',
      'Access to mentor-led doubt-clearing sessions',
    ],
    recommendedFor: [
      'First-time learners exploring a new field',
      'Students who want a low-commitment starting point',
    ],
    featured: false,
    ctaLabel: 'Choose Plan',
  },
  {
    id: 'specialized',
    slug: 'specialized-mid-level-training',
    name: 'Specialized & Mid Level Training',
    shortName: 'Specialized',
    duration: '2 Months',
    durationValue: 2,
    durationUnit: 'months',
    price: 15000,
    currency: 'INR',
    description: 'Develop practical skills through deeper training, guided practice and projects.',
    features: [
      'Everything in Short Term Foundation Modules',
      'Deeper, structured training across core curriculum areas',
      'Guided practice with mentor feedback on your work',
      'Multiple hands-on projects to build a working portfolio',
      'Regular progress check-ins with a mentor',
    ],
    recommendedFor: [
      'Learners ready to go beyond the basics',
      'Students building a portfolio of practical work',
    ],
    featured: true,
    ctaLabel: 'Choose Plan',
  },
  {
    id: 'bootcamp',
    slug: 'advanced-job-ready-bootcamps',
    name: 'Advanced Job-Ready Bootcamps',
    shortName: 'Bootcamp',
    duration: '6 Months',
    durationValue: 6,
    durationUnit: 'months',
    price: 80000,
    currency: 'INR',
    description:
      'Intensive career-focused training designed around practical skills, projects and job readiness.',
    features: [
      'Everything in Specialized & Mid Level Training',
      'Intensive, career-focused curriculum depth',
      'Multiple real-world projects reviewed by mentors',
      'Interview preparation and portfolio polish',
      'Placement Assistance as part of the program',
      'Priority mentor support throughout',
    ],
    recommendedFor: [
      'Learners aiming for a full career transition',
      'Students who want the most comprehensive, job-focused path',
    ],
    featured: false,
    ctaLabel: 'Choose Plan',
  },
]

export async function getPlans(): Promise<Plan[]> {
  return Promise.resolve(PLANS)
}

export async function getPlanBySlug(slug: string): Promise<Plan | undefined> {
  return Promise.resolve(PLANS.find((plan) => plan.slug === slug))
}

export async function getPlanById(id: string): Promise<Plan | undefined> {
  return Promise.resolve(PLANS.find((plan) => plan.id === id))
}

export function formatPlanPrice(plan: Plan): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: plan.currency,
    maximumFractionDigits: 0,
  }).format(plan.price)
}
