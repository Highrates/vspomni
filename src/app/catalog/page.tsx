import type { Metadata } from 'next'
import { getCatalogAllProducts } from '@/graphql/queries/product.service'
import CatalogPageClient from './CatalogPageClient'

const CATALOG_TITLE = 'Каталог ароматов и подарочной упаковки | ВСПОМНИ'
const CATALOG_DESCRIPTION =
  'Каталог бренда ВСПОМНИ сочетает ароматы и подарочные решения: диффузоры, ароматические саше, интерьерные спреи и фирменные подарочные пакеты. Соберите личный набор или готовый подарок.'

const CATALOG_KEYWORDS = [
  'каталог ВСПОМНИ',
  'каталог ароматов ВСПОМНИ',
  'каталог товаров ВСПОМНИ',
  'официальный каталог ВСПОМНИ',
  'каталог интернет-магазина ВСПОМНИ',
  'каталог продукции ВСПОМНИ',
  'категории каталога ВСПОМНИ',
]

export const metadata: Metadata = {
  title: CATALOG_TITLE,
  description: CATALOG_DESCRIPTION,
  keywords: CATALOG_KEYWORDS,
  alternates: {
    canonical: '/catalog',
  },
  openGraph: {
    title: CATALOG_TITLE,
    description: CATALOG_DESCRIPTION,
    url: '/catalog',
    siteName: 'ВСПОМНИ',
    locale: 'ru_RU',
    type: 'website',
  },
}

export default async function CatalogPage() {
  const allProducts = await getCatalogAllProducts(500).catch(() => [])

  return <CatalogPageClient allProducts={allProducts} />
}
