import { ArrowRight } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Accordion } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/motion/Reveal'
import { FAQS } from '@/data/faqs'

export function Faq() {
  const preview = FAQS.slice(0, 5)

  return (
    <Section tone="tint">
      <Container size="narrow">
        <SectionHeading
          eyebrow="Frequently Asked"
          title="Questions before you apply."
          align="center"
          className="mx-auto items-center text-center"
        />

        <Reveal className="bg-surface border-border-soft mt-12 rounded-2xl border px-6 sm:px-10">
          <Accordion items={preview} />
        </Reveal>

        <div className="mt-8 flex justify-center">
          <Button href="/faq" variant="ghost" trailingIcon={<ArrowRight className="size-4" />}>
            View all FAQs
          </Button>
        </div>
      </Container>
    </Section>
  )
}
