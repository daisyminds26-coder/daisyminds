import type { Program } from '@/types/program'
import { formatEnumLabel } from '@/types/program'
import type { FaqEntry } from '@/types/faq'
import { SITE_URL } from '@/utils/env'

/**
 * Schema.org JSON-LD builders. Every value here is drawn directly from our
 * own static content (`data/*.ts`) — nothing is invented or estimated, per
 * this site's own "only output truthful structured-data values" rule.
 */

export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Daisy Minds',
    url: SITE_URL,
    description:
      'Daisy Minds is a mentor-led coaching institute offering project-based programs in software development, data, design, and infrastructure.',
  }
}

export function buildCourseSchema(program: Program): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: program.title,
    description: program.description,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'Daisy Minds',
      url: SITE_URL,
    },
    url: `${SITE_URL}/programs/${program.slug}`,
    educationalLevel: formatEnumLabel(program.level),
  }
}

export function buildBreadcrumbSchema(
  items: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

export function buildFaqSchema(faqs: FaqEntry[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}
