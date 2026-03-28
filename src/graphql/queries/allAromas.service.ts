import { graphqlRequest } from '@/graphql/client'

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

interface AllAromasPagesConnection {
  pages: {
    edges: {
      node: {
        id: string
        slug: string
        title: string
        content?: string | null
        publishedAt: string
        isPublished: boolean
        assignedAttributes: Array<{
          attribute: {
            id: string
            slug: string
            name: string
          }
          fileValue?: {
            url: string
          }
          textValue?: string
          textValuePlain?: string
        }>
      }
    }[]
  }
}

export interface AllAromasItem {
  id: string
  slug: string
  title: string
  text: string
  image: string
  /** Поле content страницы Saleor (Editor.js и т.п.) */
  content?: string | null
}

/** Заголовок как на /catalog/aroma/[slug]: title → text → slug */
export function getAromaDisplayTitle(
  item: Pick<AllAromasItem, 'title' | 'text' | 'slug'>,
): string {
  return (
    item.title?.trim() ||
    item.text?.trim() ||
    item.slug.replace(/-/g, ' ')
  )
}

export async function getAllAromas(): Promise<AllAromasItem[]> {
  const pageTypeQuery = `
    query GetAllAromasPageType {
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
  const allAromasPageType = pageTypesData.pageTypes.edges.find(
    (e) =>
      e.node.name.toLowerCase() === 'все ароматы' ||
      e.node.slug.toLowerCase() === 'vse-aromaty' ||
      e.node.slug.toLowerCase() === 'all-aromas'
  )

  if (!allAromasPageType) {
    return []
  }

  const pagesQuery = `
    query GetAllAromas($first: Int!, $pageTypeId: ID!) {
      pages(first: $first, where: { pageType: { eq: $pageTypeId } }) {
        edges {
          node {
            id
            slug
            title
            content
            publishedAt
            isPublished
            assignedAttributes {
              attribute {
                id
                slug
                name
              }
              ... on AssignedFileAttribute {
                fileValue: value {
                  url
                }
              }
              ... on AssignedTextAttribute {
                textValue: value
              }
              ... on AssignedPlainTextAttribute {
                textValuePlain: value
              }
            }
          }
        }
      }
    }
  `

  const pagesData = await graphqlRequest<AllAromasPagesConnection>(pagesQuery, {
    first: 100,
    pageTypeId: allAromasPageType.node.id,
  })

  const allAromas: AllAromasItem[] = []

  pagesData.pages.edges
    .filter((edge) => edge.node.isPublished)
    .forEach((edge) => {
      const node = edge.node
      let text = ''
      let image = ''

      // Извлекаем атрибуты
      node.assignedAttributes.forEach((attr) => {
        if (attr.attribute.slug === 'vse-aromaty-tekst') {
          const v = attr.textValue ?? attr.textValuePlain
          if (v) text = v
        }
        if (
          (attr.attribute.slug === 'vsy-aromaty-kartinka' ||
            attr.attribute.slug === 'vse-aromaty-kartinka') &&
          attr.fileValue?.url
        ) {
          image = attr.fileValue.url
        }
      })

      allAromas.push({
        id: node.id,
        slug: node.slug,
        title: node.title || '',
        text,
        image,
        content: node.content ?? null,
      })
    })

  return allAromas
}

/** Заголовок страницы аромата для крошек (по slug страницы Saleor) */
export async function getAromaBreadcrumbTitleBySlug(
  slug: string,
): Promise<string | null> {
  const list = await getAllAromas()
  const item = list.find((a) => a.slug === slug)
  if (!item) return null
  return getAromaDisplayTitle(item) || null
}
