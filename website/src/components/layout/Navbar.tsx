import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Menu, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Logo } from '@/components/ui/Logo'
import { ServicesMegaMenu } from '@/components/layout/ServicesMegaMenu'
import { PRIMARY_NAV } from '@/data/nav'
import { getPrograms } from '@/data/programs'
import type { Program } from '@/types/program'
import { lmsRoute } from '@/utils/env'
import { useScrolled } from '@/hooks/useScrolled'
import { cn } from '@/utils/cn'

function NavbarLogo() {
  return (
    <Link to="/" aria-label="Daisy Minds home">
      <Logo className="h-9" />
    </Link>
  )
}

export function Navbar() {
  const scrolled = useScrolled(12)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false)
  const [mobilePrograms, setMobilePrograms] = useState<Program[]>([])
  const location = useLocation()

  useEffect(() => {
    let active = true
    void getPrograms().then((data) => {
      if (active) setMobilePrograms(data)
    })
    return () => {
      active = false
    }
  }, [])

  // Closes the mobile menu on navigation. Adjusted during render (React's
  // documented pattern for resetting state when a prop changes) rather than
  // in an effect, so there's no extra post-navigation render pass.
  const locationKey = `${location.pathname}${location.hash}`
  const [lastLocationKey, setLastLocationKey] = useState(locationKey)
  if (locationKey !== lastLocationKey) {
    setLastLocationKey(locationKey)
    setMenuOpen(false)
  }

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300',
        scrolled || menuOpen
          ? 'border-border-soft bg-background/85 border-b shadow-[0_1px_0_0_rgb(0_0_0/0.02)] backdrop-blur-lg'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <Container>
        <div className="flex h-[72px] items-center justify-between py-3">
          <NavbarLogo />

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
            {PRIMARY_NAV.map((item) =>
              item.megaMenu ? (
                <ServicesMegaMenu key={item.href} />
              ) : (
                <Link
                  key={item.href}
                  to={item.href}
                  className="text-ink-muted hover:text-ink text-sm font-medium transition-colors"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Button href={lmsRoute('/login')} external variant="ghost" size="sm">
              Student Login
            </Button>
            <Button href="/apply" size="sm">
              Apply Now
            </Button>
          </div>

          <button
            type="button"
            className="border-border text-ink -mr-2 flex size-11 items-center justify-center rounded-full border lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => {
              setMenuOpen((open) => !open)
            }}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </Container>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="border-border-soft bg-background overflow-hidden border-b lg:hidden"
          >
            <Container className="flex flex-col gap-1 py-4">
              {PRIMARY_NAV.map((item) =>
                item.megaMenu ? (
                  <div key={item.href} className="flex flex-col">
                    <button
                      type="button"
                      className="text-ink hover:bg-surface-raised flex items-center justify-between rounded-lg px-3 py-3 text-base font-medium"
                      aria-expanded={mobileServicesOpen}
                      aria-controls="mobile-services-list"
                      onClick={() => {
                        setMobileServicesOpen((open) => !open)
                      }}
                    >
                      {item.label}
                      <ChevronDown
                        className={cn(
                          'size-4 transition-transform duration-200',
                          mobileServicesOpen && 'rotate-180',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    <AnimatePresence>
                      {mobileServicesOpen && (
                        <motion.div
                          id="mobile-services-list"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <ul className="flex flex-col gap-0.5 py-1 pl-3">
                            {mobilePrograms.map((program) => (
                              <li key={program.slug}>
                                <Link
                                  to={`/services/${program.slug}`}
                                  className="text-ink-muted hover:text-ink block rounded-lg px-3 py-2 text-sm"
                                >
                                  {program.shortTitle}
                                </Link>
                              </li>
                            ))}
                            <li>
                              <Link
                                to="/services"
                                className="text-primary-dark block rounded-lg px-3 py-2 text-sm font-semibold"
                              >
                                View all programs →
                              </Link>
                            </li>
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="text-ink hover:bg-surface-raised rounded-lg px-3 py-3 text-base font-medium"
                  >
                    {item.label}
                  </Link>
                ),
              )}
              <div className="border-border-soft mt-3 flex flex-col gap-2 border-t pt-4">
                <Button href={lmsRoute('/login')} external variant="ghost" className="w-full">
                  Student Login
                </Button>
                <Button href="/apply" className="w-full">
                  Apply Now
                </Button>
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
