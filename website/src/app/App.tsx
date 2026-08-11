import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { SiteChrome } from '@/components/layout/SiteChrome'

const HomePage = lazy(() => import('@/pages/HomePage'))
const ProgramsPage = lazy(() => import('@/pages/ProgramsPage'))
const ProgramDetailPage = lazy(() => import('@/pages/ProgramDetailPage'))
const FaqPage = lazy(() => import('@/pages/FaqPage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

/** Every route below is public and read-only — no LMS auth is ever implemented here (see `utils/env.ts#lmsRoute`, used for "Student Login"). */
export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-dvh" />}>
        <Routes>
          <Route element={<SiteChrome />}>
            <Route index element={<HomePage />} />
            <Route path="programs" element={<ProgramsPage />} />
            <Route path="programs/:slug" element={<ProgramDetailPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
