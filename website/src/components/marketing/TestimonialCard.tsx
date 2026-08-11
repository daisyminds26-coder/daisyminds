import { Quote } from 'lucide-react'

import type { Testimonial } from '@/types/testimonial'

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="flex h-full flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-8">
      <Quote className="text-primary size-8" aria-hidden="true" />
      <blockquote className="text-lead flex-1 text-balance text-white/85">
        “{testimonial.quote}”
      </blockquote>
      <figcaption className="flex items-center gap-3">
        <span className="bg-primary text-primary-foreground font-display flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold">
          {testimonial.initials}
        </span>
        <span>
          <span className="block text-sm font-semibold text-white">{testimonial.name}</span>
          <span className="block text-xs text-white/55">
            {testimonial.outcome} · {testimonial.programTitle}
          </span>
        </span>
      </figcaption>
    </figure>
  )
}
