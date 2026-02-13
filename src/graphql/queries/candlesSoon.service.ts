import { graphqlRequest } from '../client'

function toAbsoluteMediaUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = typeof process !== 'undefined' && process.env.GRAPHQL_PUBLIC_API_URL
    ? new URL(process.env.GRAPHQL_PUBLIC_API_URL).origin
    : 'https://vspomni.store'
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`
}

export interface CandlesSoonAssignedAttribute {
  attribute: {
    id: string
    slug: string
    name: string
  }
  fileValue?: {
    url: string
  }
  textValue?: string
}

export interface CandlesSoonPageNode {
  id: string
  slug: string
  title: string
  isPublished?: boolean
  assignedAttributes: CandlesSoonAssignedAttribute[]
  pageType?: {
    id: string
    name: string
    slug: string
  }
}

interface CandlesSoonPagesConnection {
  pages: {
    edges: {
      node: CandlesSoonPageNode
    }[]
  }
}

interface PageTypesConnection {
  pageTypes: {
    edges: {
      node: {
        id: string
        name: string
        slug: string
      }
    }[]
  }
}

export interface CandlesSoonBannerData {
  imageUrl: string | null
  bannerText: string | null
  title: string | null
}

/**
 * Ищет тип страницы «Скоро свечи» (по имени/slug) и возвращает данные первой опубликованной страницы:
 * картинка (атрибут типа Картинка 1), текст баннера (атрибут типа «Скоро свечи банер»).
 */
export async function getCandlesSoonBanner(): Promise<CandlesSoonBannerData | null> {
  const pageTypeQuery = `
    query GetCandlesSoonPageType {
      pageTypes(first: 100) {
        edges {
          node {
            id
            name
            slug
          }
        }
      }
    }
  `
  const pageTypesData = await graphqlRequest<PageTypesConnection>(pageTypeQuery)

  const candlesSoonPageType = pageTypesData.pageTypes.edges.find((e) => {
    const name = e.node.name.toLowerCase()
    const slug = e.node.slug.toLowerCase()
    return (
      name.includes('свеч') ||
      name.includes('скоро') ||
      name.includes('баннер') ||
      name.includes('candles') ||
      name.includes('coming') ||
      slug.includes('svechi') ||
      slug.includes('candles') ||
      slug.includes('banner')
    )
  })

  if (!candlesSoonPageType) {
    return null
  }

  const pagesQuery = `
    query GetCandlesSoonPage($first: Int!, $pageTypeId: ID!) {
      pages(first: $first, where: { pageType: { eq: $pageTypeId } }) {
        edges {
          node {
            id
            slug
            title
            isPublished
            pageType { id name slug }
            assignedAttributes {
              attribute { id slug name }
              ... on AssignedFileAttribute {
                fileValue: value { url }
              }
              ... on AssignedTextAttribute {
                textValue: value
              }
            }
          }
        }
      }
    }
  `

  const pagesData = await graphqlRequest<CandlesSoonPagesConnection>(pagesQuery, {
    first: 10,
    pageTypeId: candlesSoonPageType.node.id,
  })

  const page = pagesData.pages.edges
    .map((e) => e.node)
    .find((p) => p.isPublished === true)

  if (!page) {
    return null
  }

  const attrs = page.assignedAttributes

  const bannerTextAttr = attrs.find((a) => {
    const n = (a.attribute.name || '').toLowerCase()
    const s = (a.attribute.slug || '').toLowerCase()
    return n.includes('банер') || n.includes('banner') || s.includes('banner') || s.includes('банер')
  })
  const imageAttr = attrs.find((a) => {
    const n = (a.attribute.name || '').toLowerCase()
    const s = (a.attribute.slug || '').toLowerCase()
    return (
      n.includes('картинка') ||
      n.includes('image') ||
      n.includes('фото') ||
      s.includes('kartinka') ||
      s.includes('image') ||
      s.includes('photo')
    )
  })

  const rawImageUrl = imageAttr?.fileValue?.url ?? null
  const imageUrl = toAbsoluteMediaUrl(rawImageUrl)
  const bannerText = (bannerTextAttr?.textValue ?? page.title ?? '').trim() || null
  const title = (page.title ?? '').trim() || null

  return { imageUrl, bannerText, title }
}
