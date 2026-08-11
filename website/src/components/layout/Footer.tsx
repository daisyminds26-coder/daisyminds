import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { FacebookIcon, InstagramIcon, LinkedInIcon } from '@/components/ui/SocialIcons'
import { FOOTER_LINKS } from '@/data/nav'
import { CONTACT_INFO, SOCIAL_LINKS } from '@/data/contact-info'
import { lmsRoute } from '@/utils/env'

const SOCIAL_ICONS = {
  Facebook: FacebookIcon,
  LinkedIn: LinkedInIcon,
  Instagram: InstagramIcon,
} as const

export function Footer() {
  return (
    <footer className="bg-charcoal text-white/70">
      <Container className="py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-5">
            <Link to="/" aria-label="Daisy Minds home">
              <Logo />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed">
              Mentor-led, project-first programs for careers in software, data, design, and
              infrastructure.
            </p>

            <div className="flex flex-col gap-2 text-sm">
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="inline-flex items-center gap-2 transition-colors hover:text-white"
              >
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                {CONTACT_INFO.email}
              </a>
              <a
                href={CONTACT_INFO.phoneHref}
                className="inline-flex items-center gap-2 transition-colors hover:text-white"
              >
                <Phone className="size-4 shrink-0" aria-hidden="true" />
                {CONTACT_INFO.phone}
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                {CONTACT_INFO.city}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => {
                const Icon = SOCIAL_ICONS[social.label]
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="flex size-9 items-center justify-center rounded-full border border-white/15 transition-colors hover:border-white/40 hover:text-white"
                  >
                    <Icon className="size-4" />
                  </a>
                )
              })}
            </div>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              <p className="text-eyebrow font-semibold tracking-wide text-white/45 uppercase">
                {group.title}
              </p>
              <ul className="flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="text-sm transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Daisy Minds. All rights reserved.
          </p>
          <Button href={lmsRoute('/login')} external variant="outline-light" size="sm">
            Student Login
          </Button>
        </div>
      </Container>
    </footer>
  )
}
