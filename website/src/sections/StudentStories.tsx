import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { TestimonialCard } from '@/components/marketing/TestimonialCard'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/utils/cn'
import type { Testimonial } from '@/types/testimonial'

export function StudentStories({ testimonials }: { testimonials: Testimonial[] }) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const prefersReducedMotion = usePrefersReducedMotion()

  if (testimonials.length === 0) return null

  function go(nextDirection: 1 | -1) {
    setDirection(nextDirection)
    setIndex((current) => (current + nextDirection + testimonials.length) % testimonials.length)
  }

  const current = testimonials[index]
  if (!current) return null

  return (
    <Section id="student-stories" tone="charcoal" grid>
      <Container>
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Student Stories"
            title="Careers that actually moved."
            tone="light"
          />
          <div className="flex items-center gap-2 self-end">
            <button
              type="button"
              onClick={() => {
                go(-1)
              }}
              aria-label="Previous story"
              className="flex size-11 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/50"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                go(1)
              }}
              aria-label="Next story"
              className="flex size-11 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/50"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        <div className="relative mt-10 h-72 max-w-2xl overflow-hidden sm:h-56">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={current.id}
              custom={direction}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <TestimonialCard testimonial={current} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex gap-2">
          {testimonials.map((testimonial, dotIndex) => (
            <button
              key={testimonial.id}
              type="button"
              onClick={() => {
                setDirection(dotIndex > index ? 1 : -1)
                setIndex(dotIndex)
              }}
              aria-label={`Show story ${String(dotIndex + 1)} of ${String(testimonials.length)}`}
              aria-current={dotIndex === index}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                dotIndex === index ? 'bg-primary w-8' : 'w-1.5 bg-white/25',
              )}
            />
          ))}
        </div>
      </Container>
    </Section>
  )
}
