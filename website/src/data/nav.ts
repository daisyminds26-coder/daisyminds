export interface NavLink {
  label: string
  href: string
  /** Rendered as a mega menu / expandable disclosure in `Navbar.tsx` instead of a plain link — currently only `Services`. */
  megaMenu?: boolean
}

/**
 * Top-level navigation. `Services` is rendered as a mega menu (see
 * `Navbar.tsx`) listing all programs from `data/programs.ts` directly —
 * programs are never duplicated into this file, `/services` is the single
 * source of truth for the program list.
 */
export const PRIMARY_NAV: NavLink[] = [
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services', megaMenu: true },
  { label: 'Plans', href: '/plans' },
  { label: 'Why Daisy Minds', href: '/#why-daisy-minds' },
  { label: 'Contact', href: '/contact' },
]

export const FOOTER_LINKS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Services',
    links: [
      { label: 'Web Development', href: '/services/web-development' },
      { label: 'Artificial Intelligence', href: '/services/artificial-intelligence' },
      { label: 'Data Science', href: '/services/data-science' },
      { label: 'Cybersecurity', href: '/services/cybersecurity' },
      { label: 'View all services', href: '/services' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Why Daisy Minds', href: '/#why-daisy-minds' },
      { label: 'Trainers', href: '/#trainers' },
      { label: 'Student Stories', href: '/#student-stories' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Plans', href: '/plans' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
]
