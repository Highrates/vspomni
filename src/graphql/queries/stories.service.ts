import { graphqlRequest } from '@/graphql/client'
import {
  getStoryMediaType,
  isStoryCoverAttributeSlug,
  isStorySlideAttributeSlug,
  storyMediaOrderKey,
  type StoryMediaType,
} from '@/lib/storyMedia'

function toAbsoluteMediaUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null
  const t = url.trim()
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  if (t.startsWith('//')) return `https:${t}`
  const base =
    typeof process !== 'undefined' && process.env.GRAPHQL_PUBLIC_API_URL
      ? new URL(process.env.GRAPHQL_PUBLIC_API_URL).origin
      : 'https://vspomni.store'
  return t.startsWith('/') ? `${base}${t}` : `${base}/${t}`
}

export interface StoryMediaItem {
  id: string
  url: string
  type: StoryMediaType
  order: number
}

export interface StoryNode {
  id: string
  title: string
  slug: string
  /** Обложка для кружка на главной */
  coverUrl?: string | null
  image?: string | null
  order: number
  isPublished: boolean
  publishedAt?: string | null
  items: StoryMediaItem[]
}

interface StoryAssignedAttribute {
  attribute: {
    id: string
    slug: string
    name: string
  }
  fileValue?: {
    url: string
    contentType?: string | null
  }
  textValue?: string
}

interface StoryPageNode {
  id: string
  slug: string
  title: string
  publishedAt?: string | null
  isPublished?: boolean
  assignedAttributes: StoryAssignedAttribute[]
  pageType?: {
    id: string
    name: string
    slug: string
  }
}

interface StoriesPagesConnection {
  pages: {
    edges: {
      node: StoryPageNode
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

export async function getAllStories(): Promise<StoryNode[]> {
  const pageTypeQuery = `
    query GetStoryPageType {
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
  const storyPageType = pageTypesData.pageTypes.edges.find(
    (e) =>
      e.node.name.toLowerCase() === 'сторис' ||
      e.node.slug.toLowerCase() === 'stories',
  )

  if (!storyPageType) {
    return []
  }

  const pagesQuery = `
    query GetAllStories($first: Int!, $pageTypeId: ID!) {
      pages(first: $first, where: { pageType: { eq: $pageTypeId } }) {
        edges {
          node {
            id
            slug
            title
            publishedAt
            isPublished
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
                  contentType
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

  const pagesData = await graphqlRequest<StoriesPagesConnection>(pagesQuery, {
    first: 100,
    pageTypeId: storyPageType.node.id,
  })

  const stories = pagesData.pages.edges
    .filter((e) => e.node.isPublished === true)
    .map((e) => {
      const node = e.node
      const coverUrl =
        node.assignedAttributes
          .filter((attr) => {
            const url = attr.fileValue?.url
            if (!url) return false
            return isStoryCoverAttributeSlug(
              attr.attribute.slug,
              attr.attribute.name,
            )
          })
          .map((attr) => attr.fileValue!.url)
          .find((url) => getStoryMediaType(url) === 'image') ?? null

      const mediaAttributes = node.assignedAttributes
        .filter((attr) => {
          const url = attr.fileValue?.url
          if (!url) return false
          return isStorySlideAttributeSlug(
            attr.attribute.slug,
            attr.attribute.name,
          )
        })
        .map((attr) => {
          const url = toAbsoluteMediaUrl(attr.fileValue!.url) || attr.fileValue!.url
          const type = getStoryMediaType(url, attr.fileValue?.contentType)
          return {
            id: attr.attribute.id,
            url,
            type,
            sortKey: storyMediaOrderKey(attr.attribute.slug, type),
          }
        })
        .sort((a, b) => a.sortKey - b.sortKey)

      const items: StoryMediaItem[] = mediaAttributes.map((attr, index) => ({
        id: attr.id,
        url: attr.url,
        type: attr.type,
        order: index + 1,
      }))

      const firstImageItem = items.find((item) => item.type === 'image')
      const absoluteCover = toAbsoluteMediaUrl(coverUrl)

      return {
        id: node.id,
        title: node.title,
        slug: node.slug,
        coverUrl: absoluteCover,
        image: absoluteCover ?? firstImageItem?.url ?? null,
        order: 0,
        isPublished: node.isPublished || false,
        publishedAt: node.publishedAt,
        items,
      }
    })
    .filter((story) => story.items.length > 0)

  return stories
}
