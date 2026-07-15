import type { FaqItem } from '@/graphql/queries/faq.service'

/** Schema.org FAQPage для сниппетов в поиске */
export function faqPageJsonLd(faqs: FaqItem[]) {
  const entities = faqs
    .filter((f) => f.title?.trim() && f.answer?.trim())
    .map((f) => ({
      '@type': 'Question',
      name: f.title.trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripHtml(f.answer),
      },
    }))

  if (entities.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entities,
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
