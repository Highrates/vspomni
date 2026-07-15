import type { FaqItem } from '@/graphql/queries/faq.service'

type Props = {
  faqs: FaqItem[]
}

/** Текстовый FAQ для краулеров без JS */
export default function FaqNoscript({ faqs }: Props) {
  if (faqs.length === 0) return null

  return (
    <noscript>
      <section>
        <h2>Вопросики</h2>
        <dl>
          {faqs.map((item) => (
            <div key={item.id}>
              <dt>{item.title}</dt>
              <dd dangerouslySetInnerHTML={{ __html: item.answer }} />
            </div>
          ))}
        </dl>
      </section>
    </noscript>
  )
}
