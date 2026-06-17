import { CATALOG_TITLE } from '@/lib/catalog/catalogPageContent'

export default function CatalogHero() {
  return (
    <section className="relative mb-23 z-20">
      <div className="container mx-auto px-4 sm:px-0 pt-28 sm:pt-32 md:pt-40 pb-6 sm:pb-8 md:pb-12">
        <h1 className="text-2xl sm:text-3xl md:text-3xl font-semibold text-white drop-shadow-lg">
          {CATALOG_TITLE}
        </h1>
      </div>
    </section>
  )
}
