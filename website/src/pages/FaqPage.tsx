import { Seo } from '@/components/seo/Seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Accordion } from '@/components/ui/Accordion'
import { Reveal } from '@/components/motion/Reveal'
import { FAQS } from '@/data/faqs'
import { buildFaqSchema } from '@/utils/structured-data'

export default function FaqPage() {
  return (
    <>
      <Seo
        title="Frequently Asked Questions"
        description="Answers to common questions about Daisy Minds programs, schedules, batches, and applications."
        path="/faq"
      />
      <JsonLd data={buildFaqSchema(FAQS)} />

      <Section spacing="none" className="pt-36 pb-24 sm:pt-44">
        <Container size="narrow">
          <SectionHeading
            eyebrow="Support"
            title="Frequently asked questions"
            lead="Can't find what you're looking for? Reach out and our team will get back to you."
            align="center"
            className="mx-auto items-center text-center"
          />

          <Reveal
            delay={0.1}
            className="bg-surface border-border-soft mt-12 rounded-2xl border px-6 sm:px-10"
          >
            <Accordion items={FAQS} />
          </Reveal>
        </Container>
      </Section>
    </>
  )
}
