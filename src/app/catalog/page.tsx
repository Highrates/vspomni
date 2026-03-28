import { getCatalogAllProducts } from '@/graphql/queries/product.service'
import CatalogPageClient from './CatalogPageClient'

export default async function CatalogPage() {
  const allProducts = await getCatalogAllProducts(500).catch(() => [])

  return <CatalogPageClient allProducts={allProducts} />
}
