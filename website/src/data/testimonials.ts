import type { Testimonial } from '@/types/testimonial'

/** Placeholder for `GET /api/v1/public/testimonials` (or an equivalent public endpoint) — same replaceable-data-layer pattern as `data/programs.ts`. */
const TESTIMONIALS: Testimonial[] = [
  {
    id: 'testimonial-1',
    name: 'Rohit Sharma',
    outcome: 'Junior Frontend Engineer',
    programTitle: 'Web Development',
    quote:
      'The project-first structure meant I had a real portfolio before I finished the program — that made every interview conversation easier.',
    initials: 'RS',
  },
  {
    id: 'testimonial-2',
    name: 'Ananya Iyer',
    outcome: 'Junior Data Analyst',
    programTitle: 'Data Science',
    quote:
      'Mentors reviewed my actual work every week, not just quiz scores. That feedback loop is the whole reason I stuck with it.',
    initials: 'AI',
  },
  {
    id: 'testimonial-3',
    name: 'Vikram Desai',
    outcome: 'Digital Marketing Associate',
    programTitle: 'Digital Marketing',
    quote:
      'The campaign-based projects are exactly how real marketing work gets reviewed. I walked into interviews already prepared.',
    initials: 'VD',
  },
]

export async function getTestimonials(): Promise<Testimonial[]> {
  return Promise.resolve(TESTIMONIALS)
}
