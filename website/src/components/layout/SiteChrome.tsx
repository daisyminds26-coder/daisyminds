import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

/** Root layout: skip link, fixed navbar, routed page content, footer. Every route renders through this once, via the router's root element. */
export function SiteChrome() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) return
    window.scrollTo({ top: 0 })
  }, [location.pathname, location.hash])

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground focus-visible:ring-primary-dark sr-only rounded-full px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus-visible:ring-2"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
