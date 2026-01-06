import { graphqlRequest } from '../client'

export interface FaqAssignedAttribute {
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

export interface FaqPageNode {
  id: string
  slug: string
  title: string
  publishedAt?: string | null
  isPublished?: boolean
  content?: string | null
  assignedAttributes: FaqAssignedAttribute[]
  pageType?: {
    id: string
    name: string
    slug: string
  }
}

interface FaqPagesConnection {
  pages: {
    edges: {
      node: FaqPageNode
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

export interface FaqItem {
  id: string
  title: string
  shortText: string
  answer: string
}

export async function getAllFaqs(): Promise<FaqItem[]> {
  const pageTypeQuery = `
    query GetFaqPageType {
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
  const faqPageType = pageTypesData.pageTypes.edges.find(
    (e) =>
      e.node.name.toLowerCase() === 'faq' ||
      e.node.slug.toLowerCase() === 'faq',
  )

  if (!faqPageType) {
    return []
  }

  const pagesQuery = `
    query GetAllFaqs($first: Int!, $pageTypeId: ID!) {
      pages(first: $first, where: { pageType: { eq: $pageTypeId } }) {
        edges {
          node {
            id
            slug
            title
            publishedAt
            isPublished
            content
            pageType {
              id
              name
              slug
            }
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
            }
          }
        }
      }
    }
  `

  const pagesData = await graphqlRequest<FaqPagesConnection>(pagesQuery, {
    first: 100,
    pageTypeId: faqPageType.node.id,
  })

  const parseEditorJsContent = (content: string | null | undefined): string => {
    if (!content) return ''

    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content
      if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
        return parsed.blocks
          .map((block: any) => {
            if (block.type === 'paragraph' && block.data?.text) {
              return block.data.text
            }
            return ''
          })
          .filter((text: string) => text)
          .join(' ')
      }
    } catch (e) {
      // Если не JSON, возвращаем как есть
      return content
    }

    return content
  }

  const faqs = pagesData.pages.edges
    .filter((e) => e.node.isPublished === true)
    .map((e) => {
      const node = e.node
      const shortTextAttr = node.assignedAttributes.find(
        (attr) =>
          attr.attribute.slug === 'short-text' ||
          attr.attribute.slug === 'shorttext' ||
          attr.attribute.name?.toLowerCase().includes('короткий') ||
          attr.attribute.name?.toLowerCase().includes('short'),
      )

      const rawAnswer = node.content || shortTextAttr?.textValue || ''
      const answer = parseEditorJsContent(rawAnswer)

      return {
        id: node.id,
        title: node.title,
        shortText: shortTextAttr?.textValue || node.title,
        answer: answer,
      }
    })

  return faqs
}
