export interface NavLink {
  label: string
  href: string
}

export const PRIMARY_NAV: NavLink[] = [
  { label: 'Programs', href: '/programs' },
  { label: 'Why Daisy Minds', href: '/#why-daisy-minds' },
  { label: 'Trainers', href: '/#trainers' },
  { label: 'Student Stories', href: '/#student-stories' },
  { label: 'FAQ', href: '/faq' },
]

export const FOOTER_LINKS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Programs',
    links: [
      { label: 'Full Stack Web Development', href: '/programs/full-stack-web-development' },
      { label: 'Data Science & Analytics', href: '/programs/data-science-analytics' },
      { label: 'UI/UX Product Design', href: '/programs/ui-ux-product-design' },
      { label: 'View all programs', href: '/programs' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Why Daisy Minds', href: '/#why-daisy-minds' },
      { label: 'Trainers', href: '/#trainers' },
      { label: 'Student Stories', href: '/#student-stories' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
]
