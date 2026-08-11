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
  textValuePlain?: string
  textValueRich?: unknown
  linkProduct?: { slug?: string; category?: { slug?: string } | null } | null
  linkProducts?: { slug?: string; category?: { slug?: string } | null }[]
  linkPage?: { slug?: string } | null
  linkPages?: { slug?: string }[]
  linkCategory?: { slug?: string } | null
  linkCategories?: { slug?: string }[]
  linkCollection?: { slug?: string; name?: string } | null
  linkCollections?: { slug?: string; name?: string }[]
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
  /** Ссылка большого баннера из атрибута «ссылка для N слайдера» */
  href?: string
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
      textValueRich: value
    }
    ... on AssignedPlainTextAttribute {
      textValuePlain: value
    }
    ... on AssignedSingleProductReferenceAttribute {
      linkProduct: value {
        slug
        category { slug }
      }
    }
    ... on AssignedMultiProductReferenceAttribute {
      linkProducts: value(limit: 1) {
        slug
        category { slug }
      }
    }
    ... on AssignedSinglePageReferenceAttribute {
      linkPage: value { slug }
    }
    ... on AssignedMultiPageReferenceAttribute {
      linkPages: value(limit: 1) { slug }
    }
    ... on AssignedSingleCategoryReferenceAttribute {
      linkCategory: value { slug }
    }
    ... on AssignedMultiCategoryReferenceAttribute {
      linkCategories: value(limit: 1) { slug }
    }
    ... on AssignedSingleCollectionReferenceAttribute {
      linkCollection: value { slug name }
    }
    ... on AssignedMultiCollectionReferenceAttribute {
      linkCollections: value(limit: 1) { slug name }
    }
  }
`

/** Коллекция Saleor → путь на сайте */
function hrefFromCollection(slug?: string | null, name?: string | null): string {
  const s = (slug || '').toLowerCase()
  const n = (name || '').toLowerCase()
  if (s.includes('populiar') || n.includes('диффузор')) return '/category/diffuzory'
  if (n.includes('парфюм') || s.includes('parfum')) {
    return '/category/iarkaia-i-stilnaia-upakovka'
  }
  if (n.includes('саше') || s.includes('sashe') || s.includes('sache')) {
    return '/category/aromasashe'
  }
  if (n.includes('пакет') || s.includes('paket')) {
    return '/category/podarochnye-pakety'
  }
  return '/catalog'
}

function resolveSliderLinkHref(attr: SliderAssignedAttribute): string {
  const product = attr.linkProduct ?? attr.linkProducts?.[0]
  if (product?.slug) {
    const cat = product.category?.slug?.trim()
    if (cat) {
      return `/category/${encodeURIComponent(cat)}/${encodeURIComponent(product.slug)}`
    }
    return `/product/${encodeURIComponent(product.slug)}`
  }

  const category = attr.linkCategory ?? attr.linkCategories?.[0]
  if (category?.slug) {
    return `/category/${encodeURIComponent(category.slug)}`
  }

  const page = attr.linkPage ?? attr.linkPages?.[0]
  if (page?.slug) {
    return `/catalog/aroma/${encodeURIComponent(page.slug)}`
  }

  const collection = attr.linkCollection ?? attr.linkCollections?.[0]
  if (collection?.slug || collection?.name) {
    return hrefFromCollection(collection.slug, collection.name)
  }

  const raw =
    (typeof attr.textValuePlain === 'string' && attr.textValuePlain.trim()) ||
    (typeof attr.textValue === 'string' && attr.textValue.trim()) ||
    ''
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return raw
  return `/${encodeURIComponent(raw)}`
}

/** Номер из slug/name: kartinka-3 / ssilka-1 / «ссылка для 2 слайдера» */
function attrIndexFromSlugOrName(slug: string, name: string): number | null {
  const s = (slug || '').toLowerCase()
  const n = (name || '').toLowerCase()
  const fromSlug = s.match(/(\d+)/)
  if (fromSlug) return parseInt(fromSlug[1], 10)
  const fromName = n.match(/(\d+)/)
  if (fromName) return parseInt(fromName[1], 10)
  return null
}

function isSliderImageAttr(slug: string, name: string): boolean {
  const s = (slug || '').toLowerCase()
  const n = (name || '').toLowerCase()
  return (
    s.includes('kartinka') ||
    s.includes('image') ||
    s.includes('картинка') ||
    s.includes('photo') ||
    s.includes('фото') ||
    n.includes('картинка') ||
    n.includes('image')
  )
}

/** Атрибут «ссылка для N слайдера» / ssilka-N (не нижний банер) */
function isSliderLinkAttr(slug: string, name: string): boolean {
  const s = (slug || '').toLowerCase()
  const n = (name || '').toLowerCase()
  if (s.includes('nizhnego') || s.includes('nizhni') || n.includes('нижн')) {
    return false
  }
  if (
    s.startsWith('ssilka-') ||
    s.startsWith('ssylka-') ||
    s.includes('ssilka') ||
    (s.includes('ssylka') && s.match(/\d+/))
  ) {
    return true
  }
  return n.includes('ссылка') && (n.includes('слайд') || n.includes('slider'))
}

function parseSliderItemsFromPage(node: SliderPageNode): SliderItem[] {
  const attrs = node.assignedAttributes || []

  const imageAttrs = attrs
    .filter((attr) => {
      const slug = attr.attribute?.slug || ''
      const name = attr.attribute?.name || ''
      return isSliderImageAttr(slug, name) && Boolean(attr.fileValue?.url)
    })
    .sort((a, b) => {
      const aNum =
        attrIndexFromSlugOrName(
          a.attribute?.slug || '',
          a.attribute?.name || '',
        ) ?? 0
      const bNum =
        attrIndexFromSlugOrName(
          b.attribute?.slug || '',
          b.attribute?.name || '',
        ) ?? 0
      return aNum - bNum
    })

  const hrefByIndex = new Map<number, string>()
  for (const attr of attrs) {
    const slug = attr.attribute?.slug || ''
    const name = attr.attribute?.name || ''
    if (!isSliderLinkAttr(slug, name)) continue
    const idx = attrIndexFromSlugOrName(slug, name)
    if (idx == null) continue
    const href = resolveSliderLinkHref(attr)
    if (href) hrefByIndex.set(idx, href)
  }

  const sliders: SliderItem[] = []
  imageAttrs.forEach((attr, index) => {
    const raw = attr.fileValue?.url
    const imageUrl = toAbsoluteMediaUrl(raw) || raw
    if (!imageUrl) return
    const imgIndex =
      attrIndexFromSlugOrName(
        attr.attribute?.slug || '',
        attr.attribute?.name || '',
      ) ?? index + 1
    const href = hrefByIndex.get(imgIndex) || ''
    sliders.push({
      id: `${node.id}-${imgIndex}`,
      image: imageUrl,
      title: node.title,
      text: node.content || '',
      ...(href ? { href } : {}),
    })
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
  /**
   * Куда ведёт плашка: товар, аромат или категория
   * (из атрибутов «Ссылка на товар / аромат / категорию»).
   */
  href: string
}

/** Совпадение по slug или name: в дашборде «Hero-слайдер нижний банер заголовок/описание» */
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

type HeroLinkKind = 'banner' | 'product' | 'aroma' | 'category'

/**
 * Атрибуты ссылок плашки Hero.
 * «Ссылка нижнего банера» — универсальная (товар / категория / аромат / URL).
 */
function matchHeroLinkAttribute(
  slug: string,
  name: string,
): HeroLinkKind | null {
  const s = (slug || '').toLowerCase()
  const n = (name || '').toLowerCase()

  // Универсальная «Ссылка нижнего банера» — раньше узких, чтобы не перепутать
  if (
    s === 'ssylka-nizhnego-banera' ||
    s === 'ssylka-nizhnego-banner' ||
    (s.includes('ssylka') &&
      (s.includes('nizhnego') || s.includes('nizhni'))) ||
    (n.includes('ссылка') &&
      n.includes('нижн') &&
      (n.includes('банер') || n.includes('баннер')))
  ) {
    return 'banner'
  }

  if (
    s === 'ssylka-na-tovar' ||
    (s.includes('ssylka') && (s.includes('tovar') || s.includes('product'))) ||
    (n.includes('ссылка') && n.includes('товар'))
  ) {
    return 'product'
  }

  if (
    s === 'ssylka-na-aromat' ||
    (s.includes('ssylka') && (s.includes('aromat') || s.includes('aroma'))) ||
    (n.includes('ссылка') && n.includes('аромат'))
  ) {
    return 'aroma'
  }

  if (
    s === 'ssylka-na-kategoriiu' ||
    s === 'ssylka-na-kategoriyu' ||
    s === 'ssylka-na-category' ||
    (s.includes('ssylka') &&
      (s.includes('kategor') || s.includes('category'))) ||
    (n.includes('ссылка') && n.includes('категор'))
  ) {
    return 'category'
  }

  return null
}

/** Текст из CMS → путь: URL, /path, либо fallback-префикс + slug */
function normalizeCmsLinkHref(
  raw: string,
  fallbackPrefix: '/product' | '/catalog/aroma' | '/category',
): string {
  const t = raw.trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith('/')) return t
  return `${fallbackPrefix}/${encodeURIComponent(t)}`
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
              ... on AssignedSingleProductReferenceAttribute {
                linkProduct: value {
                  slug
                  category { slug }
                }
              }
              ... on AssignedMultiProductReferenceAttribute {
                linkProducts: value(limit: 1) {
                  slug
                  category { slug }
                }
              }
              ... on AssignedSinglePageReferenceAttribute {
                linkPage: value { slug }
              }
              ... on AssignedMultiPageReferenceAttribute {
                linkPages: value(limit: 1) { slug }
              }
              ... on AssignedSingleCategoryReferenceAttribute {
                linkCategory: value { slug }
              }
              ... on AssignedMultiCategoryReferenceAttribute {
                linkCategories: value(limit: 1) { slug }
              }
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

  type AttrLinkExt = {
    linkProduct?: { slug?: string; category?: { slug?: string } | null } | null
    linkProducts?: { slug?: string; category?: { slug?: string } | null }[]
    linkPage?: { slug?: string } | null
    linkPages?: { slug?: string }[]
    linkCategory?: { slug?: string } | null
    linkCategories?: { slug?: string }[]
    textValuePlain?: string
    textValueRich?: unknown
  }

  function resolveHeroLinkHref(kind: HeroLinkKind, ext: AttrLinkExt): string {
    const fromProduct = () => {
      const p = ext.linkProduct ?? ext.linkProducts?.[0]
      if (!p?.slug) return ''
      const cat = p.category?.slug?.trim()
      if (cat) {
        return `/category/${encodeURIComponent(cat)}/${encodeURIComponent(p.slug)}`
      }
      return `/product/${encodeURIComponent(p.slug)}`
    }
    const fromAroma = () => {
      const page = ext.linkPage ?? ext.linkPages?.[0]
      if (!page?.slug) return ''
      return `/catalog/aroma/${encodeURIComponent(page.slug)}`
    }
    const fromCategory = () => {
      const cat = ext.linkCategory ?? ext.linkCategories?.[0]
      if (!cat?.slug) return ''
      return `/category/${encodeURIComponent(cat.slug)}`
    }
    const fromText = (
      fallback: '/product' | '/catalog/aroma' | '/category',
    ) => {
      const raw = getTextFromAttributeValue(
        ext.textValuePlain ?? ext.textValueRich,
      )
      return raw ? normalizeCmsLinkHref(raw, fallback) : ''
    }

    if (kind === 'banner') {
      // Универсальная «Ссылка нижнего банера»: товар → категория → аромат → текст/URL
      return (
        fromProduct() ||
        fromCategory() ||
        fromAroma() ||
        fromText('/category') ||
        ''
      )
    }
    if (kind === 'product') return fromProduct() || fromText('/product')
    if (kind === 'aroma') return fromAroma() || fromText('/catalog/aroma')
    return fromCategory() || fromText('/category')
  }

  const withIndex = published.map((node) => {
    const num = parseInt(node.title?.match(/(\d+)/)?.[1] || '0', 10)
    const attrs = (node.assignedAttributes || []).reduce(
      (acc, a) => {
        const slug = a.attribute?.slug ?? ''
        const name = a.attribute?.name ?? ''
        const linkKind = matchHeroLinkAttribute(slug, name)
        if (linkKind) {
          const href = resolveHeroLinkHref(linkKind, a as AttrLinkExt)
          if (href) {
            // Приоритет: «ссылка нижнего банера» > товар > аромат > категория
            if (linkKind === 'banner') acc.hrefBanner = href
            else if (linkKind === 'product') acc.hrefProduct = href
            else if (linkKind === 'aroma') acc.hrefAroma = href
            else acc.hrefCategory = href
          }
        } else if (matchBottomBannerAttr(slug, name, 'image') && a.fileValue?.url) {
          acc.image = toAbsoluteMediaUrl(a.fileValue.url) || a.fileValue.url
        } else if (matchBottomBannerAttr(slug, name, 'title')) {
          const raw =
            (a as AttrLinkExt).textValuePlain ?? (a as AttrLinkExt).textValueRich
          const v = getTextFromAttributeValue(raw)
          if (v) acc.title = v
        } else if (matchBottomBannerAttr(slug, name, 'description')) {
          const raw =
            (a as AttrLinkExt).textValuePlain ?? (a as AttrLinkExt).textValueRich
          const v = getTextFromAttributeValue(raw)
          if (v) acc.description = v
        }
        return acc
      },
      {
        image: '',
        title: '',
        description: '',
        hrefBanner: '',
        hrefProduct: '',
        hrefAroma: '',
        hrefCategory: '',
      } as {
        image: string
        title: string
        description: string
        hrefBanner: string
        hrefProduct: string
        hrefAroma: string
        hrefCategory: string
      },
    )
    const pageTitle = (node.title ?? '').trim()
    const pageContent = getTextFromAttributeValue(node.content)
    const href =
      attrs.hrefBanner ||
      attrs.hrefProduct ||
      attrs.hrefAroma ||
      attrs.hrefCategory ||
      ''
    return {
      num,
      image: attrs.image,
      title: attrs.title || pageTitle,
      description: attrs.description || pageContent,
      href,
    }
  })

  const sorted = withIndex
    .filter((x) => x.num >= 1 || x.image || x.title || x.description)
    .sort((a, b) => a.num - b.num)

  return sorted.map((x) => ({
    image: x.image || '',
    title: x.title || '',
    description: x.description || '',
    href: x.href || '',
  }))
}
