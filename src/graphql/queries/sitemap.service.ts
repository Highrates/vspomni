import type { MetadataRoute } from 'next'
import { CHANNEL, graphqlRequest } from '@/graphql/client'
import { absoluteUrl, getPublicSiteUrl } from '@/lib/siteUrl'
import { getAllCategory } from '@/graphql/queries/category.service'
import { getAllArticles } from '@/graphql/queries/articles.service'
import { getAllAromas } from '@/graphql/queries/allAromas.service'
import { isValidSlug } from '@/lib/productPaths'

const MAX_URLS = 49_000
const PAGE_SIZE = 100

/** Реальная дата из БД; без даты — не подставляем «сейчас» (ломает краулеров). */
function toLastMod(d?: string | null): Date | undefined {
  if (!d) return undefined
  const t = Date.parse(d)
  return Number.isFinite(t) ? new Date(t) : undefined
}

function productLocPath(
  productSlug: string,
  categorySlug?: string | null,
): string {
  const cat = categorySlug?.trim()
  if (cat) {
    return `/category/${encodeURIComponent(cat)}/${encodeURIComponent(productSlug)}`
  }
  return `/product/${encodeURIComponent(productSlug)}`
}

/** Заглушки вроде aromat-1 не отдаём в sitemap */
function isPlaceholderAromaSlug(slug: string): boolean {
  return /^aromat-\d+$/i.test(slug.trim())
}

interface SitemapProductsResponse {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
    edges: {
      node: {
        slug: string
        updatedAt?: string | null
        category?: { slug?: string | null } | null
      }
    }[]
  }
}

async function fetchAllPublishedProductsForSitemap(): Promise<
  { slug: string; categorySlug: string | null; updatedAt: string | null }[]
> {
  const query = `
    query SitemapProducts($channel: String!, $first: Int!, $after: String) {
      products(
        first: $first
        channel: $channel
        after: $after
        filter: { isPublished: true }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            slug
            updatedAt
            category {
              slug
            }
          }
        }
      }
    }
  `

  const out: {
    slug: string
    categorySlug: string | null
    updatedAt: string | null
  }[] = []

  let after: string | null = null
  let guard = 0
  const maxPages = 600

  while (out.length < MAX_URLS && guard < maxPages) {
    guard += 1
    const pageData: SitemapProductsResponse =
      await graphqlRequest<SitemapProductsResponse>(query, {
        channel: CHANNEL,
        first: PAGE_SIZE,
        after: after,
      })

    const edges = pageData.products?.edges ?? []
    for (const e of edges) {
      const n = e?.node
      if (!n?.slug) continue
      out.push({
        slug: n.slug,
        categorySlug: n.category?.slug?.trim() || null,
        updatedAt: n.updatedAt ?? null,
      })
    }

    const pi = pageData.products?.pageInfo
    if (!pi?.hasNextPage || !edges.length) break
    after = pi.endCursor
    if (!after) break
  }

  return out
}

/** Данные для /sitemap.xml (динамически, до лимита URL) */
export async function buildSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicSiteUrl()
  const entries: MetadataRoute.Sitemap = []
  const seen = new Set<string>()

  const push = (path: string, lastModified?: Date) => {
    if (entries.length >= MAX_URLS) return
    if (seen.has(path)) return
    seen.add(path)
    const entry: MetadataRoute.Sitemap[number] = {
      url: absoluteUrl(path),
    }
    if (lastModified) entry.lastModified = lastModified
    entries.push(entry)
  }

  // Статика без lastmod — нет надёжной даты в БД
  push('/')
  push('/catalog')
  push('/news')
  push('/partners')

  try {
    const categories = await getAllCategory(100)
    for (const c of categories) {
      if (!c.slug) continue
      push(`/category/${encodeURIComponent(c.slug)}`)
    }
  } catch {
    /* ignore */
  }

  try {
    const products = await fetchAllPublishedProductsForSitemap()
    for (const p of products) {
      if (entries.length >= MAX_URLS) break
      if (!isValidSlug(p.slug)) continue
      push(productLocPath(p.slug, p.categorySlug), toLastMod(p.updatedAt))
    }
  } catch {
    /* ignore */
  }

  try {
    const articles = await getAllArticles(500)
    for (const a of articles) {
      if (!a.slug) continue
      if (entries.length >= MAX_URLS) break
      const mod = a.publishedAt || a.created
      push(`/article/${encodeURIComponent(a.slug)}`, toLastMod(mod))
    }
  } catch {
    /* ignore */
  }

  try {
    const aromas = await getAllAromas()
    for (const ar of aromas) {
      if (!ar.slug) continue
      if (isPlaceholderAromaSlug(ar.slug)) continue
      if (entries.length >= MAX_URLS) break
      // Без контента и картинки — пустышка, не тратим crawl budget
      const hasBody =
        Boolean(ar.content?.trim()) ||
        Boolean(ar.text?.trim()) ||
        Boolean(ar.image?.trim())
      if (!hasBody && !ar.title?.trim()) continue
      push(
        `/catalog/aroma/${encodeURIComponent(ar.slug)}`,
        toLastMod(ar.publishedAt),
      )
    }
  } catch {
    /* ignore */
  }

  if (process.env.NODE_ENV === 'development') {
    console.info(`[sitemap] ${entries.length} URLs, base=${base}`)
  }

  return entries
}
