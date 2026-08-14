import { Suspense, use, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { Seo } from '@/components/seo/Seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { Hero } from '@/sections/Hero'
import { TrustProposition } from '@/sections/TrustProposition'
import { FeaturedPrograms } from '@/sections/FeaturedPrograms'
import { HowItWorks } from '@/sections/HowItWorks'
import { ProductShowcase } from '@/sections/ProductShowcase'
import { LearningExperience } from '@/sections/LearningExperience'
import { WhyDaisyMinds } from '@/sections/WhyDaisyMinds'
import { ChooseYourPath } from '@/sections/ChooseYourPath'
import { TrainerShowcase } from '@/sections/TrainerShowcase'
import { CareerJourney } from '@/sections/CareerJourney'
import { StudentStories } from '@/sections/StudentStories'
import { UpcomingBatches } from '@/sections/UpcomingBatches'
import { Faq } from '@/sections/Faq'
import { FinalCta } from '@/sections/FinalCta'
import { ProgramCardSkeletonGrid } from '@/components/marketing/ProgramCardSkeleton'
import { ProgramsErrorBoundary } from '@/components/error/ProgramsErrorBoundary'
import { Section } from '@/components/ui/Section'
import { Container } from '@/components/ui/Container'
import { getFeaturedPrograms } from '@/services/public-programs-service'
import { getTrainers } from '@/data/trainers'
import { getTestimonials } from '@/data/testimonials'
import { getUpcomingBatches } from '@/data/batches'
import { buildOrganizationSchema } from '@/utils/structured-data'

/**
 * Created once at module scope (this page module is only ever imported
 * once, via `React.lazy`) so `use()` below always sees the same promise
 * reference — no `useEffect`/`useState` loading dance, no extra render pass.
 * Deliberately excludes Featured Programs (see `FeaturedProgramsSection`
 * below) — bundling a real network call into this `Promise.all` would mean
 * one API failure takes down the entire homepage (trainers/testimonials/
 * batches included) instead of just that one section.
 */
const homepageDataPromise = Promise.all([getTrainers(), getTestimonials(), getUpcomingBatches()])

/** Scrolls to the section matching the URL hash once its content exists — plain `<a href="#...">` anchors don't reliably scroll after a client-side route change. */
function useHashScroll() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => {
      window.clearTimeout(timer)
    }
  }, [location.hash])
}

function FeaturedProgramsSection() {
  const [retryCount, setRetryCount] = useState(0)

  return (
    <ProgramsErrorBoundary
      onRetry={() => {
        setRetryCount((count) => count + 1)
      }}
    >
      <Suspense
        key={retryCount}
        fallback={
          <Section tone="default">
            <Container>
              <ProgramCardSkeletonGrid count={3} />
            </Container>
          </Section>
        }
      >
        <FeaturedProgramsContent />
      </Suspense>
    </ProgramsErrorBoundary>
  )
}

function FeaturedProgramsContent() {
  const featuredPromise = useMemo(() => getFeaturedPrograms(6), [])
  const programs = use(featuredPromise)
  return <FeaturedPrograms programs={programs} />
}

export default function HomePage() {
  useHashScroll()
  const [trainers, testimonials, batches] = use(homepageDataPromise)

  return (
    <>
      <Seo
        title="Mentor-Led Career Programs"
        description="Daisy Minds pairs a project-first curriculum with mentors who review your actual work — programs in software development, data, design, and infrastructure."
        path="/"
        keywords={[
          'Daisy Minds',
          'career programs',
          'mentor-led training',
          'software development courses',
          'data science training',
          'coding bootcamp',
          'project-based learning',
        ]}
      />
      <JsonLd data={buildOrganizationSchema()} />

      <Hero />
      <TrustProposition />
      <FeaturedProgramsSection />
      <HowItWorks />
      <ProductShowcase />
      <LearningExperience />
      <WhyDaisyMinds />
      <ChooseYourPath />
      <TrainerShowcase trainers={trainers} />
      <CareerJourney />
      <StudentStories testimonials={testimonials} />
      <UpcomingBatches batches={batches} />
      <Faq />
      <FinalCta />
    </>
  )
}
