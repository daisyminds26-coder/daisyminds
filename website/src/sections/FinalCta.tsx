import { ArrowRight } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/motion/Reveal'

export function FinalCta() {
  return (
    <Section tone="charcoal" spacing="compact" grid>
      <div
        className="bg-primary/20 pointer-events-none absolute bottom-[-10rem] left-1/2 size-[30rem] -translate-x-1/2 rounded-full blur-3xl"
        aria-hidden="true"
      />
      <Container className="relative flex flex-col items-center gap-7 py-8 text-center">
        <Reveal>
          <h2 className="font-display text-display-lg max-w-2xl text-balance text-white">
            Your next career move starts with one application.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="text-lead max-w-lg text-white/70">
            Talk to our team, pick a program, and get matched to the next open batch.
          </p>
        </Reveal>
        <Reveal delay={0.16} className="flex flex-wrap items-center justify-center gap-3">
          <Button href="/programs" size="lg" trailingIcon={<ArrowRight className="size-4.5" />}>
            Explore Programs
          </Button>
          <Button href="/contact" variant="outline-light" size="lg">
            Talk to Us
          </Button>
        </Reveal>
      </Container>
    </Section>
  )
}
