import type { MetadataRoute } from 'next'
import { CHANNEL, graphqlRequest } from '@/graphql/client'
import { absoluteUrl, getPublicSiteUrl } from '@/lib/siteUrl'
import { getAllCategory } from '@/graphql/queries/category.service'
import { getAllArticles } from '@/graphql/queries/articles.service'
import { getAllAromas } from '@/graphql/queries/allAromas.service'

const MAX_URLS = 49_000
const PAGE_SIZE = 100

function toLastMod(d?: string | null): Date {
  if (!d) return new Date()
  const t = Date.parse(d)
  return Number.isFinite(t) ? new Date(t) : new Date()
}

function productLocPath(productSlug: string, categorySlug?: string | null): string {
  const cat = categorySlug?.trim()
  if (cat) {
    return `/category/${encodeURIComponent(cat)}/${encodeURIComponent(productSlug)}`
  }
  return `/product/${encodeURIComponent(productSlug)}`
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
    const pageData: SitemapProductsResponse = await graphqlRequest<SitemapProductsResponse>(
      query,
      {
        channel: CHANNEL,
        first: PAGE_SIZE,
        after: after,
      },
    )

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

  const push = (path: string, lastModified?: Date) => {
    if (entries.length >= MAX_URLS) return
    entries.push({
      url: absoluteUrl(path),
      lastModified: lastModified ?? new Date(),
    })
  }

  push('/', new Date())

  const staticPages: { path: string; lastModified?: Date }[] = [
    { path: '/catalog' },
    { path: '/news' },
    { path: '/partners' },
  ]
  for (const p of staticPages) push(p.path, p.lastModified)

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
      if (entries.length >= MAX_URLS) break
      push(`/catalog/aroma/${encodeURIComponent(ar.slug)}`)
    }
  } catch {
    /* ignore */
  }

  if (process.env.NODE_ENV === 'development') {
    console.info(`[sitemap] ${entries.length} URLs, base=${base}`)
  }

  return entries
}
