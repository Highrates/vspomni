import type { AllAromasItem } from '@/graphql/queries/allAromas.service'
import { getAromaDisplayTitle } from '@/graphql/queries/allAromas.service'
import { aromaPlainDescription } from '@/lib/seo/aromaMetadata'
import type { ProductCardItem } from '@/types/product'

type Props = {
  aroma: AllAromasItem
  products: ProductCardItem[]
}

/**
 * HTML для краулеров без JS: H1, текст, картинка, список товаров.
 * Рендерится на сервере рядом с клиентским UI.
 */
export default function AromaPageNoscript({ aroma, products }: Props) {
  const title = getAromaDisplayTitle(aroma)
  const description = aromaPlainDescription(aroma)

  return (
    <noscript>
      <article className="px-4 py-6 max-w-3xl mx-auto text-black">
        <h1>{title}</h1>
        {aroma.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={aroma.image} alt={title} width={364} height={480} />
        ) : null}
        {description ? <p>{description}</p> : null}
        {products.length === 0 ? (
          <p>Нет товаров с этим ароматом</p>
        ) : (
          <section>
            <h2>Товары</h2>
            <ul>
              {products.map((p) => (
                <li key={p.id}>
                  <a
                    href={
                      p.categorySlug
                        ? `/category/${encodeURIComponent(p.categorySlug)}/${encodeURIComponent(p.slug)}`
                        : `/product/${encodeURIComponent(p.slug)}`
                    }
                  >
                    {p.name}
                  </a>
                  {p.price != null ? ` — ${p.price} ₽` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </noscript>
  )
}
