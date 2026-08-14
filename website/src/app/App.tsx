import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { SiteChrome } from '@/components/layout/SiteChrome'

const HomePage = lazy(() => import('@/pages/HomePage'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const ServicesPage = lazy(() => import('@/pages/ServicesPage'))
const ServiceDetailPage = lazy(() => import('@/pages/ServiceDetailPage'))
const ProgramsPage = lazy(() => import('@/pages/ProgramsPage'))
const ProgramDetailPage = lazy(() => import('@/pages/ProgramDetailPage'))
const PlansPage = lazy(() => import('@/pages/PlansPage'))
const ApplyPage = lazy(() => import('@/pages/ApplyPage'))
const FaqPage = lazy(() => import('@/pages/FaqPage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

/**
 * Every route below is public and read-only — no LMS auth is ever
 * implemented here (see `utils/env.ts#lmsRoute`, used for "Student Login").
 * The one exception is `/apply`, which calls the real LMS login endpoint
 * directly (see `services/auth-service.ts`) — it still never re-implements
 * registration/session logic locally.
 *
 * `/services(/:slug)` = Daisy Minds' client-facing technology services
 * (static, `data/services.ts`). `/programs(/:slug)` = student training,
 * dynamically sourced from LMS Course Management via
 * `services/public-programs-service.ts`. These are deliberately separate
 * sections, not the same content under two URLs.
 */
export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-dvh" />}>
        <Routes>
          <Route element={<SiteChrome />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="services/:slug" element={<ServiceDetailPage />} />
            <Route path="programs" element={<ProgramsPage />} />
            <Route path="programs/:slug" element={<ProgramDetailPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="apply" element={<ApplyPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
