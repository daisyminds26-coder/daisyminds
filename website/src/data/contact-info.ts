/**
 * Real Daisy Minds contact details, sourced from daisyminds.com — never
 * placeholder values. Phone is taken from the site's own `tel:` link
 * (`+918197857422`); the page's displayed text has a rendering bug that
 * duplicates the `91` prefix, not repeated here.
 */
export const CONTACT_INFO = {
  email: 'info@daisyminds.com',
  phone: '+91 81978 57422',
  phoneHref: 'tel:+918197857422',
  city: 'Bangalore',
} as const

export const SOCIAL_LINKS = [
  { label: 'Facebook', href: 'https://www.facebook.com/share/1LbHCmSE4H/' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/daisy-minds/' },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/daisy_minds?igsh=MW9vNW9mdWM4NWMzdA==',
  },
] as const
