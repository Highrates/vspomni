import { graphqlRequest } from '../client'

function toAbsoluteMediaUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base =
    typeof process !== 'undefined' && process.env.GRAPHQL_PUBLIC_API_URL
      ? new URL(process.env.GRAPHQL_PUBLIC_API_URL).origin
      : 'https://vspomni.store'
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`
}

export interface SliderAssignedAttribute {
  attribute?: {
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
  assignedAttributes?: SliderAssignedAttribute[]
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

/** Тип страницы Hero-слайдер (общий для десктопа и мобилки; различаем по slug страницы) */
const HERO_SLIDER_TYPE_SLUGS = ['hero-slaider', 'hero-slider', 'nego-slider', 'slider']
const DESKTOP_PAGE_SLUG = 'slaider' // страница «Слайдер» — десктоп
const MOBILE_PAGE_SLUG = 'slaider-na-mobilke' // страница «Слайдер на мобилке»

async function getHeroSliderPageTypeId(): Promise<string | null> {
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
  const data = await graphqlRequest<PageTypesConnection>(pageTypeQuery)
  const typeNode = data.pageTypes.edges.find((e) => {
    const slug = (e.node.slug || '').toLowerCase()
    const name = (e.node.name || '').toLowerCase()
    return (
      HERO_SLIDER_TYPE_SLUGS.some((s) => slug === s || slug.includes(s)) ||
      name.includes('слайдер') ||
      name.includes('hero')
    )
  })
  return typeNode?.node.id ?? null
}

/** Десктоп: страница со slug "slaider" (не мобильная) */
export async function getSlider(): Promise<SliderItem[]> {
  const typeId = await getHeroSliderPageTypeId()
  if (!typeId) return []

  const pagesQuery = `
    query GetSliderPages($first: Int!, $pageTypeId: ID!) {
      pages(first: $first, where: { pageType: { eq: $pageTypeId } }) {
        edges {
          node {
            id
            slug
            title
            publishedAt
            isPublished
            content
            assignedAttributes {
              attribute { id slug name }
              ... on AssignedFileAttribute { fileValue: value { url } }
              ... on AssignedTextAttribute { textValue: value }
            }
          }
        }
      }
    }
  `
  const pagesData = await graphqlRequest<SliderPagesConnection>(pagesQuery, {
    first: 100,
    pageTypeId: typeId,
  })

  const desktopPage = pagesData.pages.edges.find(
    (e) =>
      e.node.isPublished !== false &&
      (e.node.slug || '').toLowerCase() === DESKTOP_PAGE_SLUG
  )
  if (!desktopPage?.node) return []
  return parseSliderItemsFromPage(desktopPage.node)
}

const SLIDER_PAGE_ATTRS_QUERY = `
  id slug title publishedAt isPublished content
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
`

function parseSliderItemsFromPage(node: SliderPageNode): SliderItem[] {
  const sliders: SliderItem[] = []
  const imageAttributes = (node.assignedAttributes || [])
    .filter((attr) => {
      const slug = (attr.attribute?.slug || '').toLowerCase()
      const name = (attr.attribute?.name || '').toLowerCase()
      return (
        slug.includes('kartinka') ||
        slug.includes('image') ||
        slug.includes('картинка') ||
        slug.includes('photo') ||
        slug.includes('фото') ||
        name.includes('картинка') ||
        name.includes('image')
      )
    })
    .sort((a, b) => {
      const aSlug = (a.attribute?.slug || '').toLowerCase()
      const bSlug = (b.attribute?.slug || '').toLowerCase()
      const aNum = parseInt(aSlug.match(/\d+/)?.[0] || '0')
      const bNum = parseInt(bSlug.match(/\d+/)?.[0] || '0')
      return aNum - bNum
    })

  imageAttributes.forEach((attr, index) => {
    const raw = attr.fileValue?.url
    const imageUrl = toAbsoluteMediaUrl(raw) || raw
    if (imageUrl) {
      sliders.push({
        id: `${node.id}-${index}`,
        image: imageUrl,
        title: node.title,
        text: node.content || '',
      })
    }
  })
  return sliders
}

/** Мобилка: страница со slug "slaider-na-mobilke" (тот же тип Hero-слайдер, различаем по slug) */
export async function getMobileSlider(): Promise<SliderItem[]> {
  const typeId = await getHeroSliderPageTypeId()
  if (!typeId) return []

  const pagesQuery = `
    query GetMobileSliderPages($first: Int!, $pageTypeId: ID!) {
      pages(first: $first, where: { pageType: { eq: $pageTypeId } }) {
        edges {
          node {
            ${SLIDER_PAGE_ATTRS_QUERY}
          }
        }
      }
    }
  `
  const pagesData = await graphqlRequest<SliderPagesConnection>(pagesQuery, {
    first: 100,
    pageTypeId: typeId,
  })

  const mobilePage = pagesData.pages.edges?.find(
    (e) =>
      e.node.isPublished !== false &&
      (e.node.slug || '').toLowerCase() === MOBILE_PAGE_SLUG
  )
  if (!mobilePage?.node) return []

  const bySlug = parseSliderItemsFromPage(mobilePage.node)
  if (bySlug.length > 0) return bySlug

  const pageId = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_MOBILE_SLIDER_PAGE_ID
  if (pageId) {
    const byId = await getSliderByPageId(pageId)
    if (byId.length > 0) return byId
  }
  return []
}

/** Загрузка слайдов по ID страницы (fallback: когда по типу не нашли). ID из URL дашборда, напр. UGFnZTo0MA= */
async function getSliderByPageId(pageId: string): Promise<SliderItem[]> {
  const query = `
    query GetPageById($id: ID!) {
      page(id: $id) {
        ${SLIDER_PAGE_ATTRS_QUERY}
      }
    }
  `
  try {
    const data = await graphqlRequest<{ page: SliderPageNode | null }>(query, {
      id: pageId.trim(),
    })
    if (!data?.page) return []
    return parseSliderItemsFromPage(data.page)
  } catch {
    return []
  }
}

// ——— Hero нижние банеры (модель «Hero-слайдер нижние банеры», страницы «Hero слайдер нижний банер 1», «2», …) ———

export interface HeroBottomBanner {
  image: string
  title: string
  description: string
}

/** Совпадение по slug или name: в дашборде «Него-слайдер нижний банер заголовок/описание» */
function matchBottomBannerAttr(
  slug: string,
  name: string,
  kind: 'image' | 'title' | 'description'
): boolean {
  const s = (slug || '').toLowerCase()
  const n = (name || '').toLowerCase()
  if (kind === 'image') {
    return (
      ((s.includes('nizhnij-baner') || s.includes('nizhniy-baner')) && (s.includes('kartinka') || s.includes('image'))) ||
      n.includes('банер') && (n.includes('картинка') || n.includes('image'))
    )
  }
  if (kind === 'title') return s.includes('zagolovok') || s.includes('title') || n.includes('заголовок')
  if (kind === 'description') return s.includes('opisanie') || s.includes('description') || n.includes('описание')
  return false
}

/** Достать строку из value атрибута (plain text или rich text JSON) */
function getTextFromAttributeValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object' && value !== null && 'plainText' in value && typeof (value as { plainText?: string }).plainText === 'string') {
    return (
      (value as { plainText?: string }).plainText?.trim() ?? ''
    )
  }
  if (typeof value === 'object' && value !== null && 'blocks' in value && Array.isArray((value as { blocks?: unknown[] }).blocks)) {
    const blocks = (value as { blocks?: { data?: { text?: string }; text?: string }[] }).blocks ?? []
    return blocks.map((b) => b.data?.text ?? b.text ?? '').filter(Boolean).join(' ')
  }
  return String(value).trim()
}

async function getHeroBottomBannersPageTypeId(): Promise<string | null> {
  const pageTypeQuery = `
    query GetPageTypes {
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
  const data = await graphqlRequest<PageTypesConnection>(pageTypeQuery)
  const typeNode = data.pageTypes.edges.find((e) => {
    const name = (e.node.name || '').toLowerCase()
    const slug = (e.node.slug || '').toLowerCase()
    return (
      name.includes('нижние банеры') ||
      name.includes('нижний банер') ||
      name.includes('нижние') && (name.includes('слайдер') || name.includes('банер')) ||
      slug.includes('nizhnie-banery') ||
      slug.includes('nizhnij-baner') ||
      slug.includes('nizhnie') && slug.includes('slajder')
    )
  })
  return typeNode?.node.id ?? null
}

/** Список нижних банеров Hero: 1 → банер 1, 2 → банер 2 (из страниц типа «Hero-слайдер нижние банеры») */
export async function getHeroBottomBanners(): Promise<HeroBottomBanner[]> {
  const typeId = await getHeroBottomBannersPageTypeId()
  if (!typeId) return []

  const pagesQuery = `
    query GetHeroBottomBannerPages($first: Int!, $pageTypeId: ID!) {
      pages(first: $first, where: { pageType: { eq: $pageTypeId } }) {
        edges {
          node {
            id
            slug
            title
            content
            isPublished
            assignedAttributes {
              attribute { id slug name }
              ... on AssignedFileAttribute { fileValue: value { url } }
              ... on AssignedTextAttribute { textValueRich: value }
              ... on AssignedPlainTextAttribute { textValuePlain: value }
            }
          }
        }
      }
    }
  `
  const data = await graphqlRequest<SliderPagesConnection>(pagesQuery, {
    first: 50,
    pageTypeId: typeId,
  })

  const published = (data.pages?.edges ?? [])
    .filter((e) => e.node.isPublished !== false)
    .map((e) => e.node)

  const withIndex = published.map((node) => {
    const num = parseInt(node.title?.match(/(\d+)/)?.[1] || '0', 10)
    const attrs = (node.assignedAttributes || []).reduce(
      (acc, a) => {
        const slug = a.attribute?.slug ?? ''
        const name = a.attribute?.name ?? ''
        if (matchBottomBannerAttr(slug, name, 'image') && a.fileValue?.url) {
          acc.image = toAbsoluteMediaUrl(a.fileValue.url) || a.fileValue.url
        } else if (matchBottomBannerAttr(slug, name, 'title')) {
          const raw = (a as { textValuePlain?: string; textValueRich?: unknown }).textValuePlain ?? (a as { textValuePlain?: string; textValueRich?: unknown }).textValueRich
          const v = getTextFromAttributeValue(raw)
          if (v) acc.title = v
        } else if (matchBottomBannerAttr(slug, name, 'description')) {
          const raw = (a as { textValuePlain?: string; textValueRich?: unknown }).textValuePlain ?? (a as { textValuePlain?: string; textValueRich?: unknown }).textValueRich
          const v = getTextFromAttributeValue(raw)
          if (v) acc.description = v
        }
        return acc
      },
      { image: '', title: '', description: '' } as { image: string; title: string; description: string }
    )
    // Заголовок и описание из атрибутов; если пусто — из полей страницы (title, content)
    const pageTitle = (node.title ?? '').trim()
    const pageContent = getTextFromAttributeValue(node.content)
    return {
      num,
      image: attrs.image,
      title: attrs.title || pageTitle,
      description: attrs.description || pageContent,
    }
  })

  const sorted = withIndex
    .filter((x) => x.num >= 1 || x.image || x.title || x.description)
    .sort((a, b) => a.num - b.num)

  return sorted.map((x) => ({
    image: x.image || '',
    title: x.title || '',
    description: x.description || '',
  }))
}
