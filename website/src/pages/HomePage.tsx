import { use, useEffect } from 'react'
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
import { getFeaturedPrograms } from '@/data/programs'
import { getTrainers } from '@/data/trainers'
import { getTestimonials } from '@/data/testimonials'
import { getUpcomingBatches } from '@/data/batches'
import { buildOrganizationSchema } from '@/utils/structured-data'

/**
 * Created once at module scope (this page module is only ever imported
 * once, via `React.lazy`) so `use()` below always sees the same promise
 * reference — no `useEffect`/`useState` loading dance, no extra render pass.
 */
const homepageDataPromise = Promise.all([
  getFeaturedPrograms(6),
  getTrainers(),
  getTestimonials(),
  getUpcomingBatches(),
])

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

export default function HomePage() {
  useHashScroll()
  const [programs, trainers, testimonials, batches] = use(homepageDataPromise)

  return (
    <>
      <Seo
        title="Mentor-Led Career Programs"
        description="Daisy Minds pairs a project-first curriculum with mentors who review your actual work — programs in software development, data, design, and infrastructure."
        path="/"
      />
      <JsonLd data={buildOrganizationSchema()} />

      <Hero />
      <TrustProposition />
      <FeaturedPrograms programs={programs} />
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
