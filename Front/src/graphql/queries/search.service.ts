import { searchCatalog } from '@/api/cmsApi'
import { uploadsUrl } from '@/api/apiClient'
import type { ProductNode } from '@/graphql/types/product.types'

export interface SearchProductsResponse {
  products: {
    edges: {
      node: ProductNode
    }[]
    totalCount: number
  }
}

/** "2 290 р." → 2290 */
function parseRub(subtitle: string | null | undefined): number | null {
  if (!subtitle) return null
  const digits = subtitle.replace(/[^\d.,]/g, '').replace(',', '.')
  const n = Number(digits)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** `/product/<slug>` | `/category/<cat>/<slug>` → { slug, categorySlug } */
function parseProductHref(href: string): { slug: string; categorySlug?: string } | null {
  const path = href.split('?')[0].replace(/\/+$/, '')
  const cat = path.match(/^\/category\/([^/]+)\/([^/]+)$/)
  if (cat) {
    return { categorySlug: decodeURIComponent(cat[1]), slug: decodeURIComponent(cat[2]) }
  }
  const prod = path.match(/^\/(?:product|catalog\/product)\/([^/]+)$/)
  if (prod) return { slug: decodeURIComponent(prod[1]) }
  return null
}

/** Nest `GET /search?q=` → группа `product` в формат `ProductNode` (SearchResults.tsx). */
export async function searchProducts(query: string, first = 10): Promise<ProductNode[]> {
  const q = query?.trim()
  if (!q) return []

  try {
    const res = await searchCatalog(q)
    const group = res.groups.find((g) => g.key === 'product')
    const items = group?.items ?? []

    const nodes: ProductNode[] = []
    for (const it of items) {
      const parsed = parseProductHref(it.href)
      if (!parsed) continue
      const img = uploadsUrl(it.imageUrl) || ''
      const price = parseRub(it.subtitle)
      nodes.push({
        id: it.id,
        name: it.title,
        slug: parsed.slug,
        thumbnail: img ? { url: img, alt: it.title } : undefined,
        media: img ? [{ id: `${it.id}-0`, url: img, alt: it.title }] : [],
        category: parsed.categorySlug
          ? { id: '', name: '', slug: parsed.categorySlug }
          : undefined,
        defaultVariant:
          price != null
            ? {
                id: it.id,
                sku: '',
                name: '',
                pricing: { price: { currency: 'RUB', gross: { amount: price, currency: 'RUB' } } },
              }
            : undefined,
      })
    }
    return nodes.slice(0, first)
  } catch (error) {
    console.error('searchProducts error:', error)
    return []
  }
}
