export interface NavLink {
  label: string
  href: string
  /** Rendered as a mega menu / expandable disclosure in `Navbar.tsx` instead of a plain link — `Services` and `Programs`. */
  megaMenu?: boolean
}

/**
 * Top-level navigation, in the requested order: Services, Programs, Plans,
 * Why Daisy Minds, About, Contact. Both `Services` and `Programs` render as
 * mega menus (see `Navbar.tsx` / `ServicesMegaMenu.tsx` /
 * `ProgramsMegaMenu.tsx`) — `Services` lists Daisy Minds' static
 * client-facing services (`data/services.ts`), `Programs` lists every
 * published training program from the LMS Course Management API. Neither
 * list is duplicated into this file.
 */
export const PRIMARY_NAV: NavLink[] = [
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services', megaMenu: true },
  { label: 'Programs', href: '/programs', megaMenu: true },
  { label: 'Plans', href: '/plans' },
  { label: 'Why Daisy Minds', href: '/#why-daisy-minds' },
  { label: 'Contact', href: '/contact' },
]

export const FOOTER_LINKS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Programs',
    links: [
      { label: 'Web Development', href: '/programs/web-development' },
      { label: 'Artificial Intelligence', href: '/programs/artificial-intelligence' },
      { label: 'Data Science', href: '/programs/data-science' },
      { label: 'Cybersecurity', href: '/programs/cybersecurity' },
      { label: 'View all programs', href: '/programs' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Web Development', href: '/services/web-development' },
      { label: 'Mobile App Development', href: '/services/mobile-app-development' },
      { label: 'Cloud Solutions', href: '/services/cloud-solutions' },
      { label: 'Cybersecurity Services', href: '/services/cybersecurity-services' },
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
