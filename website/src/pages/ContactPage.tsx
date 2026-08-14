import { useSearchParams } from 'react-router-dom'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'

import { Seo } from '@/components/seo/Seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Accordion } from '@/components/ui/Accordion'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { FacebookIcon, InstagramIcon, LinkedInIcon } from '@/components/ui/SocialIcons'
import { Reveal } from '@/components/motion/Reveal'
import { ContactForm } from '@/components/contact/ContactForm'
import { CONTACT_INFO, SOCIAL_LINKS } from '@/data/contact-info'
import { buildBreadcrumbSchema, buildFaqSchema } from '@/utils/structured-data'

const SOCIAL_ICONS = {
  Facebook: FacebookIcon,
  LinkedIn: LinkedInIcon,
  Instagram: InstagramIcon,
} as const

const INFO_CARDS = [
  {
    icon: Mail,
    label: 'Email Us',
    value: CONTACT_INFO.email,
    href: `mailto:${CONTACT_INFO.email}`,
  },
  {
    icon: Phone,
    label: 'Call Us',
    value: CONTACT_INFO.phone,
    href: CONTACT_INFO.phoneHref,
  },
  {
    icon: MapPin,
    label: 'Based In',
    value: CONTACT_INFO.city,
    href: undefined,
  },
]

const BUSINESS_HOURS = [
  { days: 'Monday – Friday', hours: '9:00 AM – 6:00 PM' },
  { days: 'Saturday', hours: '10:00 AM – 4:00 PM' },
  { days: 'Sunday', hours: 'Closed' },
]

const CONTACT_FAQ = [
  {
    question: 'How quickly will I hear back?',
    answer:
      'Our team responds to every enquiry within one business day — often sooner during business hours.',
  },
  {
    question: "I'm not sure which program or service is right for me — can you help?",
    answer:
      'Yes. Tell us a bit about your background and goals in the message below, and an advisor will help you figure out the right fit — no pressure, no obligation.',
  },
  {
    question: 'Can I ask about batch timings or upcoming start dates?',
    answer:
      "Absolutely — mention the program you're interested in and we'll share the current schedule and available batches.",
  },
  {
    question: 'Do you work with companies for corporate training or bulk Enrollllment?',
    answer:
      "Yes. If you're reaching out on behalf of a company or a group, let us know the size and goals of your team and we'll follow up with options.",
  },
]

export default function ContactPage() {
  const [searchParams] = useSearchParams()
  const programSlug = searchParams.get('program') ?? ''
  const serviceSlug = searchParams.get('service') ?? ''

  const heading = programSlug
    ? 'Talk to a Daisy Minds Advisor'
    : serviceSlug
      ? "Let's Talk About Your Project"
      : "Tell us what you're trying to build."
  const lead = programSlug
    ? 'Need help choosing the right plan or start date? Share a few details and an advisor will follow up within one business day.'
    : serviceSlug
      ? "Tell us about your project and we'll get back to you within one business day."
      : 'Share a few details and our team will follow up within one business day.'

  return (
    <>
      <Seo
        title="Contact Us"
        description="Get in touch with the Daisy Minds team about programs, services, batches, and applications."
        path="/contact"
        keywords={['contact Daisy Minds', 'get in touch', 'talk to an advisor']}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ])}
      />
      <JsonLd data={buildFaqSchema(CONTACT_FAQ)} />

      <Section spacing="none" className="pt-36 pb-16 sm:pt-44">
        <Container>
          <Reveal className="mx-auto mb-10 max-w-2xl overflow-hidden rounded-3xl">
            <ResponsiveImage
              src="/images/career/contact-advisor.jpg"
              alt="A friendly Daisy Minds advisor wearing a headset, ready to help"
              aspectRatio="21/9"
              priority
            />
          </Reveal>

          <SectionHeading
            eyebrow="Get In Touch"
            title={heading}
            lead={lead}
            align="center"
            className="mx-auto items-center text-center"
          />
        </Container>
      </Section>

      <Section tone="default" spacing="none" className="pb-24">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.4fr]">
            {/* Left column — contact info, hours, socials */}
            <Reveal className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                {INFO_CARDS.map((card) => {
                  const content = (
                    <>
                      <span className="bg-primary-soft text-primary-dark flex size-11 shrink-0 items-center justify-center rounded-xl">
                        <card.icon className="size-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-ink-soft text-xs font-semibold tracking-wide uppercase">
                          {card.label}
                        </p>
                        <p className="text-ink text-sm font-semibold">{card.value}</p>
                      </div>
                    </>
                  )
                  return card.href ? (
                    <a
                      key={card.label}
                      href={card.href}
                      className="border-border-soft bg-surface hover:border-ink/20 flex items-center gap-4 rounded-2xl border p-4 transition-colors"
                    >
                      {content}
                    </a>
                  ) : (
                    <div
                      key={card.label}
                      className="border-border-soft bg-surface flex items-center gap-4 rounded-2xl border p-4"
                    >
                      {content}
                    </div>
                  )
                })}
              </div>

              <div className="border-border-soft bg-surface rounded-2xl border p-6">
                <div className="mb-4 flex items-center gap-2.5">
                  <Clock className="text-primary-dark size-5" aria-hidden="true" />
                  <p className="text-ink font-semibold">Business Hours</p>
                </div>
                <dl className="flex flex-col gap-2.5">
                  {BUSINESS_HOURS.map((row) => (
                    <div key={row.days} className="flex items-center justify-between text-sm">
                      <dt className="text-ink-muted">{row.days}</dt>
                      <dd className="text-ink font-medium">{row.hours}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-ink-soft mt-4 text-xs">
                  All times IST. Messages sent outside business hours are answered the next business
                  day.
                </p>
              </div>

              <div className="border-border-soft bg-surface rounded-2xl border p-6">
                <p className="text-ink mb-4 font-semibold">Follow Us</p>
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
                        className="border-border-soft text-ink-muted hover:border-ink/30 hover:text-ink flex size-10 items-center justify-center rounded-full border transition-colors"
                      >
                        <Icon className="size-4" />
                      </a>
                    )
                  })}
                </div>
              </div>
            </Reveal>

            {/* Right column — form */}
            <Reveal
              delay={0.08}
              className="border-border-soft bg-surface shadow-soft rounded-2xl border p-6 sm:p-10"
            >
              <ContactForm programSlug={programSlug} serviceSlug={serviceSlug} />
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* FAQ */}
      <Section tone="surface">
        <Container size="narrow">
          <SectionHeading
            eyebrow="FAQ"
            title="Common Questions"
            align="center"
            className="mx-auto items-center text-center"
          />
          <Reveal
            delay={0.1}
            className="bg-background border-border-soft mt-10 rounded-2xl border px-6 sm:px-10"
          >
            <Accordion items={CONTACT_FAQ} />
          </Reveal>
        </Container>
      </Section>
    </>
  )
}
