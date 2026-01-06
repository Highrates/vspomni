import { graphqlRequest } from '../client'

export interface SliderAssignedAttribute {
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

export interface SliderPageNode {
  id: string
  slug: string
  title: string
  publishedAt?: string | null
  isPublished?: boolean
  content?: string | null
  assignedAttributes: SliderAssignedAttribute[]
  pageType?: {
    id: string
    name: string
    slug: string
  }
}

interface SliderPagesConnection {
  pages: {
    edges: {
      node: SliderPageNode
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

export interface SliderItem {
  id: string
  image: string
  title?: string
  text?: string
}

export async function getSlider(): Promise<SliderItem[]> {
  const pageTypeQuery = `
    query GetSliderPageType {
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

  const sliderPageType = pageTypesData.pageTypes.edges.find((e) => {
    const nameLower = e.node.name.toLowerCase()
    const slugLower = e.node.slug.toLowerCase()
    return (
      nameLower === 'него-слайдер' ||
      nameLower.includes('слайдер') ||
      slugLower === 'nego-slider' ||
      slugLower === 'slider' ||
      slugLower.includes('slider')
    )
  })

  if (!sliderPageType) {
    return []
  }

  const pagesQuery = `
    query GetSlider($first: Int!, $pageTypeId: ID!) {
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

  const pagesData = await graphqlRequest<SliderPagesConnection>(pagesQuery, {
    first: 100,
    pageTypeId: sliderPageType.node.id,
  })

  const sliders: SliderItem[] = []

  pagesData.pages.edges
    .filter((e) => e.node.isPublished === true)
    .forEach((e) => {
      const node = e.node

      const imageAttributes = node.assignedAttributes
        .filter((attr) => {
          const slug = attr.attribute.slug.toLowerCase()
          return (
            slug.includes('kartinka') ||
            slug.includes('image') ||
            slug.includes('картинка') ||
            slug.includes('photo') ||
            slug.includes('фото')
          )
        })
        .sort((a, b) => {
          const aSlug = a.attribute.slug.toLowerCase()
          const bSlug = b.attribute.slug.toLowerCase()
          const aNum = parseInt(aSlug.match(/\d+/)?.[0] || '0')
          const bNum = parseInt(bSlug.match(/\d+/)?.[0] || '0')
          return aNum - bNum
        })

      imageAttributes.forEach((attr, index) => {
        const imageUrl = attr.fileValue?.url
        if (imageUrl) {
          sliders.push({
            id: `${node.id}-${index}`,
            image: imageUrl,
            title: node.title,
            text: node.content || '',
          })
        }
      })
    })

  return sliders
}
