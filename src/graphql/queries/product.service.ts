import { CHANNEL, graphqlRequest } from '@/graphql/client'
import type {
  Connection,
  MutationError,
  WarehouseNode,
  WarehousesData,
} from '../types/core.types'
import type {
  ProductNode,
  ProductDetailNode,
  ProductData,
  ProductsData,
  ProductUpdateMutationResponse,
  BestSellersResponse,
  ProductsByCategorySlugResponse,
  ProductEdge,
} from '../types/product.types'
import { formatDate } from '@/lib/functions'
import { normalizeAromaLabel } from '@/lib/normalizeAromaLabel'
import type { ProductCardItem, StarChoiceItem } from '@/types/product'
import { isValidSlug } from '@/lib/productPaths'
import { variantShippingFromSaleorVariant } from '@/lib/saleorVariantShipping'

// -----------------------------------------------------------
// A. Product Queries (products, product)
// -----------------------------------------------------------
export async function getSingleProduct(
  slug: string,
): Promise<ProductDetailNode | null> {
  const query = `
    query getSingleProduct($slug: String!, $channel: String!) {
      product(slug: $slug, channel: $channel) {
        id
        slug
        rating
        name
        description
        metadata {
          key
          value
        }
        media {
          alt
          url
        }
        
        attributes {
          attribute {
            id
            metadata {
              key
              value
            }
            name
            slug
          }
          values {
            boolean
            date
            dateTime
            externalReference
            inputType
            name
            plainText
            reference
            richText
            slug
            value
            file {
              url
            }
          }
        }

        productType {
          name
        }
        category {
          name
          id
          slug
        }
        productVariants(first: 10) {
          edges {
            node {
              id
              name
              sku
              quantityAvailable
              weight {
                value
              }
              metadata {
                key
                value
              }
              pricing {
                priceUndiscounted {
                  gross {
                    currency
                    amount
                  }
                }
                price {
                  gross {
                    amount
                    currency
                  }
                }
                discount {
                  net {
                    amount
                    currency
                  }
                }
              }
            }
          }
          totalCount
        }
        isAvailableForPurchase
        reviews {
          id
          text
        }
        availableForPurchaseAt
        thumbnail {
          alt
          url
        }
      }
    }
  `

  const variables = { slug, channel: CHANNEL }
  const data = await graphqlRequest<ProductData>(query, variables)
  return data.product
}

/** Имя товара и категории для крошек (server) */
export async function getProductBreadcrumbMeta(productSlug: string): Promise<{
  productName: string
  categoryName: string | null
  categorySlug: string | null
} | null> {
  const query = `
    query ProductBreadcrumb($slug: String!, $channel: String!) {
      product(slug: $slug, channel: $channel) {
        name
        slug
        category {
          name
          slug
        }
      }
    }
  `
  try {
    const data = await graphqlRequest<{
      product: {
        name: string
        slug: string
        category: { name: string; slug: string } | null
      } | null
    }>(query, { slug: productSlug, channel: CHANNEL })
    const p = data.product
    if (!p?.name) return null
    return {
      productName: p.name,
      categoryName: p.category?.name?.trim() || null,
      categorySlug: p.category?.slug?.trim() || null,
    }
  } catch {
    return null
  }
}

/** Для редиректа /product/slug → /category/{cat}/slug (server) */
export async function getProductCategorySlugForRedirect(
  productSlug: string,
): Promise<string | null> {
  const query = `
    query ProductCategorySlug($slug: String!, $channel: String!) {
      product(slug: $slug, channel: $channel) {
        category {
          slug
        }
      }
    }
  `
  try {
    const data = await graphqlRequest<{
      product: { category: { slug: string } | null } | null
    }>(query, { slug: productSlug, channel: CHANNEL })
    const s = data.product?.category?.slug?.trim()
    return s || null
  } catch {
    return null
  }
}

/**
 * QUERY: Fetches a paginated list of products, optionally filtered by publication status.
 * SERVICE NAME: products (Filtered Fetch)
 */
export async function getFilteredProducts(
  first = 20,
  isPublished?: boolean,
): Promise<Connection<ProductNode>> {
  const query = `
    query FilteredProducts($first: Int!, $published: Boolean) {
      products(
        first: $first, 
        channel: "${CHANNEL}",
        filter: { isPublished: $published }
      ) {
        edges {
          node {
            id
            name
            slug
            isPublished
            rating
            metadata { key value }
            thumbnail { url alt }
            media { id alt url }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `

  const variables = {
    first,
    published: isPublished,
  }

  const data = await graphqlRequest<ProductsData>(query, variables)
  return data.products
}

// -----------------------------------------------------------
// B. Inventory Queries (warehouse, warehouses)
// -----------------------------------------------------------

/**
 * QUERY: Fetches a list of all active warehouses.
 * SERVICE NAME: warehouses (List Fetch)
 */
export async function getAllWarehouses(
  first = 50,
): Promise<Connection<WarehouseNode>> {
  const query = `
        query AllWarehouses($first: Int!) {
            warehouses(first: $first) {
                edges {
                    node {
                        id
                        name
                        slug
                        address {
                            city
                            country
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    `

  const variables = { first }
  const data = await graphqlRequest<WarehousesData>(query, variables)
  return data.warehouses
}

// Helper: map Saleor product node to frontend ProductCardItem with discount info
function filterValidProductCards(items: ProductCardItem[]): ProductCardItem[] {
  return items.filter((item) => isValidSlug(item.slug))
}

function mapNodeToProductCard(
  node: any,
  externalDiscounts?: Record<string, number>,
  opts?: { categorySlug?: string },
): ProductCardItem {
  const variant = node.productVariants.edges[0].node
  const price = variant.pricing.price.gross.amount

  const priceUndiscounted = variant.pricing.priceUndiscounted?.gross?.amount
  const discountNet = variant.pricing.discount?.net?.amount ?? 0

  let oldPrice: number | undefined = priceUndiscounted
  let discountPercent: number | undefined

  // 1) если есть внешняя скидка от catalog_discounts — используем её
  const external = externalDiscounts?.[variant.id]
  if (typeof external === 'number' && external > 0) {
    discountPercent = Math.round(external)
    oldPrice = Math.round((price * 100) / (100 - discountPercent))
  } else if (oldPrice && oldPrice > price) {
    // 2) стандартный случай: priceUndiscounted > price
    discountPercent = Math.round(((oldPrice - price) / oldPrice) * 100)
  } else if (discountNet > 0) {
    // 3) fallback: есть только discount.net
    const fullPrice = price + discountNet
    oldPrice = fullPrice
    discountPercent = Math.round((discountNet / fullPrice) * 100)
  }

  // Извлекаем теги из атрибута "aromaty-v-kartochke-tovara"
  const aromaAttribute = node.attributes?.find(
    (attr: any) => attr.attribute?.slug === 'aromaty-v-kartochke-tovara'
  )
  const aromaValues = aromaAttribute?.values || []
  const aromas = aromaValues
    .map((val: any) => normalizeAromaLabel(val.name || val.value || ''))
    .filter(Boolean)

  // Формируем group из aromas (для обратной совместимости)
  const group = aromas.map((aroma: string, index: number) => {
    // Определяем тип группы по тексту
    let groupType = 'flower'
    if (aroma.toLowerCase().includes('сладк') || aroma.includes('🤤')) {
      groupType = 'sweet'
    } else if (aroma.toLowerCase().includes('цветочн') || aroma.includes('🌸')) {
      groupType = 'flower'
    } else if (aroma.toLowerCase().includes('древесн') || aroma.includes('🪵')) {
      groupType = 'wood'
    }

    return {
      id: index + 1,
      group: groupType,
      title: aroma,
    }
  })

  const { weight, length, width, height } = variantShippingFromSaleorVariant(
    variant,
    node.metadata,
  )

  const categorySlug =
    (opts?.categorySlug ?? node.category?.slug)?.trim() || undefined

  return {
    id: variant.id,
    name: node.name,
    slug: node.slug,
    categorySlug,
    thumbnail: node.thumbnail?.url ?? '',
    image: node.media?.[0]?.url ?? '',
    gallery: (node.media || []).map((m: any) => m?.url).filter(Boolean),
    price,
    oldPrice,
    discountPercent,
    size: variant.name,
    group,
    aromas,
    weight,
    length,
    width,
    height,
  }
}


// --- catalog_discounts endpoint client ---

interface CatalogDiscount {
  variantId: string
  discountPercent: number
}

interface CatalogDiscountsResponse {
  catalogDiscounts: CatalogDiscount[]
}

export async function getCatalogDiscounts(
  variantIds: string[],
  channel: string = CHANNEL,
): Promise<Record<string, number>> {
  if (!variantIds.length) return {}

  const query = `
    query CatalogDiscounts($channel: String!, $variantIds: [ID!]!) {
      catalogDiscounts(channel: $channel, variantIds: $variantIds) {
        variantId
        discountPercent
      }
    }
  `

  const variables = { channel, variantIds }
  const data = await graphqlRequest<CatalogDiscountsResponse>(query, variables)

  const map: Record<string, number> = {}
  for (const item of data.catalogDiscounts || []) {
    map[item.variantId] = item.discountPercent
  }
  return map
}

// -----------------------------------------------------------
// C. Product Mutation (productUpdate)
// -----------------------------------------------------------

/**
 * MUTATION: Updates a product's name and publication status.
 * SERVICE NAME: productUpdate
 */
export async function updateProductName(
  productId: string,
  newName: string,
): Promise<ProductNode> {
  const mutation = `
        mutation UpdateProduct($id: ID!, $name: String!) {
            productUpdate(
                id: $id, 
                input: {
                    name: $name, 
                }
            ) {
                product {
                    id
                    name
                    slug
                }
                errors {
                    field
                    message
                    code
                }
            }
        }
    `

  const variables = { id: productId, name: newName }
  const result = await graphqlRequest<ProductUpdateMutationResponse>(
    mutation,
    variables,
  )

  const errors = result.productUpdate.errors || []
  if (errors.length > 0) {
    throw new Error(
      `Product update failed: ${errors.map((e: MutationError) => e.message).join(', ')}`,
    )
  }

  if (!result.productUpdate.product) {
    throw new Error('Product update returned no product')
  }

  return result.productUpdate.product
}

// -----------------------------------------------------------
// D. Bestseller Products Query
// -----------------------------------------------------------

/**
 * QUERY: Fetches bestseller products from a collection.
 * SERVICE NAME: collection (Bestsellers)
 */
export async function getGreedProducts(): Promise<any> {
  const query = `
    query getGreedProducts($channel: String!) {
  products(first: 12, channel: $channel) {
    edges {
      node {
        id
        name
        description
        slug
        rating
        metadata {
          key
          value
        }
        thumbnail {
          url
          alt
        }
        media {
          id
          alt
          url
        }
        collections{
          id
          name
          slug
        }
        category {
          slug
        }
        productVariants(first: 12) {
          edges {
            node {
              id
              name
              sku
              weight {
                value
              }
              metadata {
                key
                value
              }
              pricing {
                price {
                  gross {
                    currency
                    amount
                  }
                }
                priceUndiscounted {
                  gross {
                    currency
                    amount
                  }
                }
                discount {
                  net {
                    amount
                    currency
                  }
                }
              }
            }
          }
        }
        attributes {
          attribute {
            id
            slug
            name
          }
          values {
            name
            slug
            value
          }
        }
      }
    }
  }
}
  `

  const variables = {
    channel: CHANNEL,
  }

  const data = await graphqlRequest<BestSellersResponse>(query, variables)

  const nodes = data.products.edges.map((edge: any) => edge.node)
  const variantIds = nodes.map(
    (node: any) => node.productVariants.edges[0].node.id as string,
  )
  const discounts = await getCatalogDiscounts(variantIds)

  return filterValidProductCards(
    nodes.map((node: any) => mapNodeToProductCard(node, discounts)),
  )
}

/**
 * QUERY: Fetches bestseller products from a collection.
 * SERVICE NAME: collection (Bestsellers)
 */
export async function getPopularProducts(): Promise<any> {
  const query = `
    query getGreedProducts($channel: String!) {
  products(
    first: 5, 
    channel: $channel, 
    where: { collection: {eq :"Q29sbGVjdGlvbjoz" } }
    ) {
    edges {
      node {
        id
        name
        description
        slug
        rating
        metadata {
          key
          value
        }
        thumbnail {
          url
          alt
        }
        media {
          id
          alt
          url
        }
        collections{
          id
          name
          slug
        }
        category {
          slug
        }
        productVariants(first: 12) {
          edges {
            node {
              id
              name
              sku
              weight {
                value
              }
              metadata {
                key
                value
              }
              pricing {
                price {
                  gross {
                    currency
                    amount
                  }
                }
                priceUndiscounted {
                  gross {
                    currency
                    amount
                  }
                }
                discount {
                  net {
                    amount
                    currency
                  }
                }
              }
            }
          }
        }
        attributes {
          attribute {
            id
            slug
            name
          }
          values {
            name
            slug
            value
          }
        }
      }
    }
  }
}
  `

  const variables = {
    channel: CHANNEL,
  }

  const data = await graphqlRequest<BestSellersResponse>(query, variables)
  const nodes = data.products.edges.map((edge: any) => edge.node)
  const variantIds = nodes.map(
    (node: any) => node.productVariants.edges[0].node.id as string,
  )
  const discounts = await getCatalogDiscounts(variantIds)

  return filterValidProductCards(
    nodes.map((node: any) => mapNodeToProductCard(node, discounts)),
  )
}

/** Все товары канала (каталог). Saleor: не больше 100 записей за запрос */
const CATALOG_PRODUCT_NODE_FRAGMENT = `
            id
            name
            description
            slug
            rating
            thumbnail {
              url
              alt
            }
            media {
              id
              alt
              url
            }
            collections {
              id
              name
              slug
            }
            category {
              slug
            }
            productVariants(first: 12) {
              edges {
                node {
                  id
                  name
                  sku
                  pricing {
                    price {
                      gross {
                        currency
                        amount
                      }
                    }
                    priceUndiscounted {
                      gross {
                        currency
                        amount
                      }
                    }
                    discount {
                      net {
                        amount
                        currency
                      }
                    }
                  }
                }
              }
            }
            attributes {
              attribute {
                id
                slug
                name
              }
              values {
                name
              }
            }
`

const CATALOG_PRODUCTS_QUERY = `
    query getCatalogProducts($channel: String!, $first: Int!, $after: String) {
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
            ${CATALOG_PRODUCT_NODE_FRAGMENT}
          }
        }
      }
    }
  `

export type CatalogProductsPage = {
  products: ProductCardItem[]
  hasNextPage: boolean
  endCursor: string | null
}

async function mapCatalogNodesToProductCards(
  nodes: any[],
): Promise<ProductCardItem[]> {
  const variantIds = nodes
    .map((node: any) => node.productVariants?.edges?.[0]?.node?.id as string)
    .filter(Boolean)
  const discounts = await getCatalogDiscounts(variantIds)
  return filterValidProductCards(
    nodes.map((node: any) => mapNodeToProductCard(node, discounts)),
  )
}

/** Одна страница товаров каталога (для /catalog и «Показать ещё») */
export async function getCatalogProductsPage(
  pageSize: number,
  after?: string | null,
): Promise<CatalogProductsPage> {
  const data = await graphqlRequest<{
    products: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      edges: { node: any }[]
    }
  }>(CATALOG_PRODUCTS_QUERY, {
    channel: CHANNEL,
    first: pageSize,
    after: after ?? null,
  })

  const nodes = (data.products?.edges ?? [])
    .map((edge) => edge?.node)
    .filter(Boolean)

  const products = await mapCatalogNodesToProductCards(nodes)
  const pageInfo = data.products?.pageInfo

  return {
    products,
    hasNextPage: pageInfo?.hasNextPage ?? false,
    endCursor: pageInfo?.endCursor ?? null,
  }
}

export async function getCatalogAllProducts(
  maxProducts: number = 500,
): Promise<ProductCardItem[]> {
  const pageSize = 100
  const allNodes: any[] = []
  let after: string | undefined
  let safety = 0
  const maxPages = Math.ceil(maxProducts / pageSize) + 2

  while (allNodes.length < maxProducts && safety < maxPages) {
    safety += 1
    const first = Math.min(pageSize, maxProducts - allNodes.length)

    const data = await graphqlRequest<{
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
        edges: { node: any }[]
      }
    }>(CATALOG_PRODUCTS_QUERY, {
      channel: CHANNEL,
      first,
      after: after ?? null,
    })

    const edges = data.products?.edges ?? []
    for (const e of edges) {
      if (e?.node) allNodes.push(e.node)
    }

    const pi = data.products?.pageInfo
    if (!pi?.hasNextPage || !edges.length) break
    after = pi.endCursor ?? undefined
    if (!after) break
  }

  return mapCatalogNodesToProductCards(allNodes)
}

/** Коллекция «Выбор ⭐» в Saleor Dashboard */
export const CHOICE_COLLECTION_SLUG = 'vybor'

const CHOICE_PRODUCTS_QUERY = `
  query getChoiceProductsPage(
    $channel: String!
    $collectionId: ID!
    $first: Int!
    $after: String
  ) {
    products(
      first: $first
      after: $after
      channel: $channel
      where: { collection: { eq: $collectionId } }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          slug
          category {
            slug
          }
          thumbnail {
            url
            alt
          }
          media {
            url
          }
          productVariants(first: 12) {
            edges {
              node {
                id
                name
                sku
                weight {
                  value
                }
                metadata {
                  key
                  value
                }
                pricing {
                  price {
                    gross {
                      currency
                      amount
                    }
                  }
                }
              }
            }
          }
          attributes {
            attribute {
              name
              slug
            }
            values {
              name
              file {
                url
              }
            }
          }
        }
      }
    }
  }
`

async function resolveChoiceCollectionId(): Promise<string> {
  const query = `
    query getChoiceCollectionId($channel: String!, $slug: String!) {
      collection(channel: $channel, slug: $slug) {
        id
      }
    }
  `
  const data = await graphqlRequest<{ collection: { id: string } | null }>(query, {
    channel: CHANNEL,
    slug: CHOICE_COLLECTION_SLUG,
  })
  const collectionId = data.collection?.id
  if (!collectionId) {
    throw new Error(`Collection "${CHOICE_COLLECTION_SLUG}" not found`)
  }
  return collectionId
}

function mapChoiceProductNode(n: any): StarChoiceItem | null {
  if (!n) return null

  const variantNode = n.productVariants?.edges?.[0]?.node
  const thumbUrl = n.thumbnail?.url
  if (!variantNode || !thumbUrl) return null

  const photoAttr = n.attributes?.find(
    (i: any) =>
      i.attribute?.slug === 'vybor-foto' ||
      i.attribute?.slug === 'vybor-photo' ||
      i.attribute?.name?.toLowerCase().includes('фото') ||
      i.attribute?.name?.toLowerCase().includes('photo'),
  )
  const choicePhotoUrl = photoAttr?.values?.[0]?.file?.url
  const mediaUrl =
    (Array.isArray(n.media) && n.media[0]?.url) ||
    n.media?.edges?.[0]?.node?.url
  const imageUrl =
    (choicePhotoUrl && String(choicePhotoUrl).trim()) ||
    mediaUrl ||
    thumbUrl ||
    '/images/choice-1.jpg'

  const nameAttr = n.attributes?.find(
    (i: any) =>
      i.attribute?.slug === 'vybor-imya' ||
      i.attribute?.slug === 'vybor-name' ||
      i.attribute?.name?.toLowerCase().includes('имя') ||
      i.attribute?.name?.toLowerCase().includes('name'),
  )
  const star = nameAttr?.values?.[0]?.name || ''

  const dateAttr = n.attributes?.find(
    (i: any) =>
      i.attribute?.slug === 'vybor-data' ||
      i.attribute?.slug === 'vybor-date' ||
      i.attribute?.name?.toLowerCase().includes('дата') ||
      i.attribute?.name?.toLowerCase().includes('date'),
  )
  const dateRaw = dateAttr?.values?.[0]?.name || ''

  const amount = variantNode.pricing?.price?.gross?.amount
  if (amount == null) return null

  return {
    id: variantNode.id,
    name: n.name,
    slug: n.slug,
    categorySlug: n.category?.slug?.trim() || undefined,
    thumbnail: thumbUrl,
    image: imageUrl,
    price: parseFloat(String(amount)),
    oldPrice: 0,
    size: variantNode.name ?? '',
    star,
    date: formatDate(dateRaw),
  }
}

/**
 * Товары коллекции «Выбор ⭐» (slug: vybor) — все карточки из дашборда.
 */
export async function getChoiceProducts(): Promise<StarChoiceItem[]> {
  const collectionId = await resolveChoiceCollectionId()
  const allNodes: any[] = []
  let after: string | undefined
  let safety = 0
  const pageSize = 100

  while (safety < 20) {
    safety += 1
    const data = await graphqlRequest<{
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
        edges: { node: any }[]
      }
    }>(CHOICE_PRODUCTS_QUERY, {
      channel: CHANNEL,
      collectionId,
      first: pageSize,
      after: after ?? null,
    })

    const edges = data.products?.edges ?? []
    for (const edge of edges) {
      if (edge?.node) allNodes.push(edge.node)
    }

    const pageInfo = data.products?.pageInfo
    if (!pageInfo?.hasNextPage || !edges.length) break
    after = pageInfo.endCursor ?? undefined
    if (!after) break
  }

  return allNodes
    .map((node) => mapChoiceProductNode(node))
    .filter((item): item is StarChoiceItem => item != null)
}

/** Товары коллекции по ID (коллекция 5 — «Ваши вкусовые сосочки будут в восторге») */
const COLLECTION_NOSE_ID = 'Q29sbGVjdGlvbjo1'

const PRODUCTS_BY_COLLECTION_QUERY = `
  query getProductsByCollection(
    $channel: String!
    $collectionId: ID!
    $first: Int!
    $after: String
  ) {
    products(
      first: $first
      after: $after
      channel: $channel
      where: { collection: { eq: $collectionId } }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          description
          slug
          rating
          thumbnail { url alt }
          media { id alt url }
          collections { id name slug }
          category { slug }
          productVariants(first: 12) {
            edges {
              node {
                id
                name
                sku
                pricing {
                  price { gross { currency amount } }
                  priceUndiscounted { gross { currency amount } }
                }
              }
            }
          }
          attributes {
            attribute { id slug name }
            values { name slug value }
          }
        }
      }
    }
  }
`

/**
 * Все товары коллекции (с пагинацией).
 * @param first — устаревший лимит; если не передан, тянем всю коллекцию.
 */
export async function getProductsByCollectionId(
  collectionId: string = COLLECTION_NOSE_ID,
  first?: number,
): Promise<ProductCardItem[]> {
  const allNodes: any[] = []
  let after: string | undefined
  let safety = 0
  const pageSize = 100
  const hardCap = typeof first === 'number' && first > 0 ? first : Number.POSITIVE_INFINITY

  while (safety < 20 && allNodes.length < hardCap) {
    safety += 1
    const data = await graphqlRequest<{
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
        edges: { node: any }[]
      }
    }>(PRODUCTS_BY_COLLECTION_QUERY, {
      channel: CHANNEL,
      collectionId,
      first: Math.min(pageSize, Number.isFinite(hardCap) ? hardCap - allNodes.length : pageSize),
      after: after ?? null,
    })

    const edges = data.products?.edges ?? []
    for (const edge of edges) {
      if (edge?.node) allNodes.push(edge.node)
      if (allNodes.length >= hardCap) break
    }

    const pageInfo = data.products?.pageInfo
    if (!pageInfo?.hasNextPage || !edges.length || allNodes.length >= hardCap) break
    after = pageInfo.endCursor ?? undefined
    if (!after) break
  }

  const nodes = Number.isFinite(hardCap) ? allNodes.slice(0, hardCap) : allNodes
  const variantIds = nodes
    .map((node: any) => node.productVariants?.edges?.[0]?.node?.id)
    .filter(Boolean)
  const discounts = await getCatalogDiscounts(variantIds)
  return filterValidProductCards(
    nodes
      .filter((node: any) => node.productVariants?.edges?.[0]?.node)
      .map((node: any) => mapNodeToProductCard(node, discounts)),
  )
}

/** Slug атрибута «Аромат» в Saleor (Reference на страницы «Все ароматы») */
const CATALOG_AROMA_ATTRIBUTE_SLUG = 'aromat'

/** Товары по slug страницы аромата (аромат — Reference на Page, фильтр по pageSlugs) */
export async function getProductsByAromaSlug(aromaSlug: string): Promise<ProductCardItem[]> {
  const query = `
    query getProductsByAroma($channel: String!, $first: Int!, $pageSlugs: [String!]!) {
      products(
        first: $first,
        channel: $channel,
        where: {
          attributes: [
            {
              slug: "${CATALOG_AROMA_ATTRIBUTE_SLUG}",
              value: {
                reference: {
                  pageSlugs: { containsAny: $pageSlugs }
                }
              }
            }
          ]
        }
      ) {
        edges {
          node {
            id
            name
            description
            slug
            rating
            thumbnail { url alt }
            media { id alt url }
            collections { id name slug }
            category { slug }
            productVariants(first: 12) {
              edges {
                node {
                  id
                  name
                  sku
                  pricing {
                    price { gross { currency amount } }
                    priceUndiscounted { gross { currency amount } }
                  }
                }
              }
            }
            attributes {
              attribute { id slug name }
              values { name slug value }
            }
          }
        }
      }
    }
  `
  const variables = { channel: CHANNEL, first: 50, pageSlugs: [aromaSlug] }
  try {
    const data = await graphqlRequest<BestSellersResponse>(query, variables)
    const nodes = data.products.edges.map((edge: any) => edge.node)
    const variantIds = nodes.map((node: any) => node.productVariants.edges[0]?.node.id).filter(Boolean)
    const discounts = await getCatalogDiscounts(variantIds)
    return filterValidProductCards(
      nodes.map((node: any) => mapNodeToProductCard(node, discounts)),
    )
  } catch (e) {
    console.error('getProductsByAromaSlug error:', e)
    return []
  }
}

/** Товары по имени значения атрибута (fallback, если по slug ничего не нашлось) */
export async function getProductsByAromaValue(aromaName: string): Promise<ProductCardItem[]> {
  const query = `
    query getProductsByAromaName($channel: String!, $aromaName: String!, $first: Int!) {
      products(
        first: $first,
        channel: $channel,
        where: {
          attributes: [
            { slug: "${CATALOG_AROMA_ATTRIBUTE_SLUG}", value: { name: { eq: $aromaName } } }
          ]
        }
      ) {
        edges {
          node {
            id
            name
            description
            slug
            rating
            thumbnail { url alt }
            media { id alt url }
            collections { id name slug }
            category { slug }
            productVariants(first: 12) {
              edges {
                node {
                  id
                  name
                  sku
                  pricing {
                    price { gross { currency amount } }
                    priceUndiscounted { gross { currency amount } }
                  }
                }
              }
            }
            attributes {
              attribute { id slug name }
              values { name slug value }
            }
          }
        }
      }
    }
  `
  const variables = { channel: CHANNEL, aromaName, first: 50 }
  try {
    const data = await graphqlRequest<BestSellersResponse>(query, variables)
    const nodes = data.products.edges.map((edge: any) => edge.node)
    const variantIds = nodes.map((node: any) => node.productVariants.edges[0]?.node.id).filter(Boolean)
    const discounts = await getCatalogDiscounts(variantIds)
    return filterValidProductCards(
      nodes.map((node: any) => mapNodeToProductCard(node, discounts)),
    )
  } catch (e) {
    console.error('getProductsByAromaValue error:', e)
    return []
  }
}

export async function getProductsByCategorySlug(categorySlug: string): Promise<any> {
  const query = `
    query getGreedProducts($channel: String! , $categorySlug: String) {
         category(slug: $categorySlug){
  products(first: 50, channel: $channel) {
    edges {
      node {
        id
        name
        description
        slug
        rating
        metadata {
          key
          value
        }
        thumbnail {
          url
          alt
        }
        media {
          id
          alt
          url
        }
        collections{
          id
          name
          slug
        }
        category {
          slug
        }
        productVariants(first: 12) {
          edges {
            node {
              id
              name
              sku
              weight {
                value
              }
              metadata {
                key
                value
              }
              pricing {
                price {
                  gross {
                    currency
                    amount
                  }
                }
              }
            }
          }
        }
        attributes {
          attribute {
            id
            slug
            name
          }
          values {
            name
            slug
            value
          }
        }
      }
    }
}}
}
  `

  const variables = {
    channel: CHANNEL,
    categorySlug: categorySlug
  }

  const data = await graphqlRequest<ProductsByCategorySlugResponse>(query, variables)

  // Категории нет в Saleor (неверный/устаревший slug) — не падаем на SSR
  if (!data?.category?.products?.edges) {
    return []
  }

  const nodes = data.category.products.edges.map((edge: any) => edge.node)
  const variantIds = nodes
    .map((node: any) => node.productVariants?.edges?.[0]?.node?.id as string | undefined)
    .filter(Boolean) as string[]
  const discounts = await getCatalogDiscounts(variantIds)

  const result = nodes
    .filter((node: any) => node.productVariants?.edges?.[0]?.node)
    .map((node: any) =>
      mapNodeToProductCard(node, discounts, { categorySlug }),
    )
  return filterValidProductCards(result)
}
