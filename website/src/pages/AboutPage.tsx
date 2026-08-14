import { GraduationCap, Handshake, NotebookPen, Target } from 'lucide-react'

import { Seo } from '@/components/seo/Seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/motion/Reveal'
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { buildBreadcrumbSchema } from '@/utils/structured-data'

const VALUES = [
  {
    icon: Target,
    title: 'Outcome-first',
    description: 'Every program is scoped around a real hiring outcome, not a syllabus checklist.',
  },
  {
    icon: NotebookPen,
    title: 'Built on real work',
    description: 'Students leave with shipped projects, not certificates of attendance.',
  },
  {
    icon: Handshake,
    title: 'Mentors, not moderators',
    description: 'Working professionals review student work weekly and unblock them fast.',
  },
  {
    icon: GraduationCap,
    title: 'Career-focused training',
    description: 'Programs are designed around practical, job-ready skills — not just theory.',
  },
]

export default function AboutPage() {
  return (
    <>
      <Seo
        title="About Us"
        description="Daisy Minds is a mentor-led coaching institute offering project-based technology programs and career-focused training."
        path="/about"
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />

      <Section spacing="none" className="pt-36 pb-16 sm:pt-44">
        <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              eyebrow="About Daisy Minds"
              title="Career-focused technology training, built on mentorship."
              lead="Daisy Minds is a mentor-led coaching institute offering project-based programs in software development, data, security, cloud infrastructure, and digital marketing — designed to help students build practical, job-ready skills."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/services" size="lg">
                Explore Programs
              </Button>
              <Button href="/contact" variant="outline-light" size="lg">
                Talk to Us
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <ResponsiveImage
              src="/images/students/students-learning.jpg"
              alt="Students collaborating on a project in a modern learning space at Daisy Minds"
              aspectRatio="4/3"
              priority
              className="rounded-3xl"
            />
          </Reveal>
        </Container>
      </Section>

      <Section tone="tint">
        <Container>
          <SectionHeading
            eyebrow="What We Believe"
            title="A structured path from enrollment to portfolio."
            align="center"
            className="mx-auto items-center text-center"
          />

          <StaggerGroup className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <StaggerItem key={value.title}>
                <div className="border-border-soft bg-surface shadow-soft flex h-full flex-col gap-4 rounded-2xl border p-6">
                  <span className="bg-primary-soft text-primary-dark flex size-12 items-center justify-center rounded-xl">
                    <value.icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="text-ink text-base font-bold">{value.title}</h3>
                  <p className="text-ink-muted text-body-sm">{value.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>
    </>
  )
}
