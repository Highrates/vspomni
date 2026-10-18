import type { ProductSeoContent } from '@/lib/product/productPageContent'

type Props = {
  seo: ProductSeoContent
}

/**
 * Текстовая версия карточки для краулеров без JS (noscript).
 */
export default function ProductPageNoscript({ seo }: Props) {
  return (
    <noscript>
      <div className="px-4 py-6 max-w-3xl mx-auto text-black">
        <h1>{seo.name}</h1>
        {seo.shortDescription ? <p>{seo.shortDescription}</p> : null}
        {seo.price != null ? (
          <p>
            Цена: {seo.price} {seo.currency}.{' '}
            {seo.inStock ? 'В наличии' : 'Нет в наличии'}
          </p>
        ) : null}
        {seo.aromas.length > 0 ? (
          <p>Ароматы: {seo.aromas.join(', ')}</p>
        ) : null}
        {seo.notes.map(
          (block) =>
            block.names.length > 0 && (
              <section key={block.label}>
                <h2>{block.label}</h2>
                <p>{block.names.join(', ')}</p>
              </section>
            ),
        )}
        {seo.descriptionPlain ? (
          <section>
            <h2>Описание</h2>
            <p>{seo.descriptionPlain}</p>
          </section>
        ) : null}
        {seo.characteristicsPlain ? (
          <section>
            <h2>Характеристики</h2>
            <p>{seo.characteristicsPlain}</p>
          </section>
        ) : null}
        {seo.compositionPlain ? (
          <section>
            <h2>Состав</h2>
            <p>{seo.compositionPlain}</p>
          </section>
        ) : null}
      </div>
    </noscript>
  )
}
