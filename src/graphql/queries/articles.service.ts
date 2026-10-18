import { getBlogPost, getCmsPage, listBlogPosts, type BlogPostDetail } from '@/api/cmsApi'
import { htmlToEditorJsonString } from '@/lib/nestContent'

// ===== Типы (совместимы с Saleor-версией — UI не меняется) =====

export interface ArticleAssignedAttribute {
  attribute: {
    id: string
    slug: string
    name: string
  }
  fileValue?: {
    url: string
  }
  textValue?: string
  /** Saleor: AssignedPlainTextAttribute */
  textValuePlain?: string
}

export interface ArticleNode {
  id: string
  slug: string
  title: string
  created: string
  publishedAt?: string | null
  isPublished?: boolean
  /** Editor.js JSON-строка (собирается из HTML Nest) — понимает renderEditorJsContent / extractArticleText */
  content?: string | null
  assignedAttributes: ArticleAssignedAttribute[]
  metadata?: {
    key: string
    value: string
  }[]
  // Helper property for image URL
  imageUrl?: string | null
  /** Атрибут osnovnoj-tekst (в Nest не используется) */
  osnovnojTekst?: string | null
  /** Атрибуты dop-izobrazhenie-1 / dop-izobrazhenie-2 (в Nest не используется) */
  dopIzobrazhenie1Url?: string | null
  dopIzobrazhenie2Url?: string | null
}

export interface ArticlesConnection {
  pages: {
    edges: {
      node: ArticleNode
    }[]
    totalCount: number
  }
}

export interface SingleArticleConnection {
  page: ArticleNode | null
}

/** URL главного изображения страницы: в Nest — `coverImageUrl` поста, поэтому берём из assignedAttributes только для совместимости */
export function extractArticleMainImageUrl(node: {
  assignedAttributes: ArticleAssignedAttribute[]
}): string | undefined {
  const attrs = node.assignedAttributes
  const main = attrs.find((a) => a.attribute.slug === 'glavnoe-izobrazhenie')
  if (main?.fileValue?.url) return main.fileValue.url

  const fallback = attrs.find(
    (attr) =>
      attr.attribute.slug === 'image' ||
      attr.attribute.slug === 'cover' ||
      attr.attribute.name?.toLowerCase().includes('изображение') ||
      attr.attribute.name?.toLowerCase().includes('image'),
  )
  return fallback?.fileValue?.url || undefined
}

export function extractArticleTextAttribute(
  node: { assignedAttributes: ArticleAssignedAttribute[] },
  slug: string,
): string | undefined {
  const attr = node.assignedAttributes.find((a) => a.attribute.slug === slug)
  if (!attr) return undefined
  const v = attr.textValue ?? attr.textValuePlain
  if (typeof v !== 'string' || !v.trim()) return undefined
  return v
}

export function extractArticleFileAttributeUrl(
  node: { assignedAttributes: ArticleAssignedAttribute[] },
  slug: string,
): string | undefined {
  const attr = node.assignedAttributes.find((a) => a.attribute.slug === slug)
  return attr?.fileValue?.url || undefined
}

// ============================================
// ================ Запросы ===================
// ============================================

function mapPostToArticle(
  post: { id: string; slug: string; title: string; publishedAt: string | null; coverImageUrl: string | null },
  contentHtml: string | null | undefined,
): ArticleNode {
  const published = post.publishedAt ?? new Date(0).toISOString()
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    created: published,
    publishedAt: post.publishedAt,
    isPublished: true,
    content: htmlToEditorJsonString(contentHtml) || null,
    assignedAttributes: [],
    metadata: [],
    imageUrl: post.coverImageUrl,
    osnovnojTekst: null,
    dopIzobrazhenie1Url: null,
    dopIzobrazhenie2Url: null,
  }
}

/**
 * Nest `GET /blog/posts` → статьи/новости.
 * `pageTypeSlug` оставлен ради совместимости сигнатуры (Saleor page types) — не используется.
 */
export async function getAllArticles(
  first: number,
  _pageTypeSlug?: string,
): Promise<ArticleNode[]> {
  const limit = Math.max(1, first)
  const pageSize = Math.min(limit, 100)
  const out: ArticleNode[] = []
  let page = 1
  while (out.length < limit) {
    const res = await listBlogPosts({ page, limit: pageSize })
    for (const item of res.items) {
      // В списке тела нет — для превью используем excerpt
      out.push(mapPostToArticle(item, item.excerpt ? `<p>${item.excerpt}</p>` : ''))
    }
    if (res.items.length < pageSize || out.length >= res.total) break
    page += 1
  }
  return out.slice(0, limit)
}

function mapDetailToArticle(post: BlogPostDetail): ArticleNode {
  return mapPostToArticle(post, post.bodyHtml)
}

/** Одна статья по slug: сначала блог, затем CMS-страница (`/cms/pages/:slug`). */
export async function getSingleArticle(slug: string): Promise<ArticleNode | null> {
  const post = await getBlogPost(slug)
  if (post) return mapDetailToArticle(post)

  const page = await getCmsPage(slug)
  if (page) {
    return {
      id: page.id ?? page.slug,
      slug: page.slug,
      title: page.title,
      created: page.publishedAt ?? new Date(0).toISOString(),
      publishedAt: page.publishedAt ?? null,
      isPublished: page.isPublished !== false,
      content: htmlToEditorJsonString(page.bodyHtml) || null,
      assignedAttributes: [],
      metadata: [],
      imageUrl: null,
      osnovnojTekst: null,
      dopIzobrazhenie1Url: null,
      dopIzobrazhenie2Url: null,
    }
  }
  return null
}
