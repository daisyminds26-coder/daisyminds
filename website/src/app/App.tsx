import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'

import { SiteChrome } from '@/components/layout/SiteChrome'

const HomePage = lazy(() => import('@/pages/HomePage'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const ServicesPage = lazy(() => import('@/pages/ServicesPage'))
const ProgramDetailPage = lazy(() => import('@/pages/ProgramDetailPage'))
const PlansPage = lazy(() => import('@/pages/PlansPage'))
const ApplyPage = lazy(() => import('@/pages/ApplyPage'))
const FaqPage = lazy(() => import('@/pages/FaqPage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

/** `/programs/:slug` was the old canonical program-detail URL — `/services/:slug` is canonical now. Redirects (not a second page) so old links/bookmarks/search results never 404. */
function ProgramSlugRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/services/${slug ?? ''}`} replace />
}

/** Every route below is public and read-only — no LMS auth is ever implemented here (see `utils/env.ts#lmsRoute`, used for "Student Login"). The one exception is `/apply`, which calls the real LMS login endpoint directly (see `services/auth-service.ts`) — it still never re-implements registration/session logic locally. */
export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-dvh" />}>
        <Routes>
          <Route element={<SiteChrome />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="services/:slug" element={<ProgramDetailPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="apply" element={<ApplyPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="contact" element={<ContactPage />} />
            {/* Legacy URLs — kept working, never a dead link. */}
            <Route path="programs" element={<Navigate to="/services" replace />} />
            <Route path="programs/:slug" element={<ProgramSlugRedirect />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
