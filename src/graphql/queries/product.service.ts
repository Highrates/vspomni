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
import type { ProductCardItem } from '@/types/product'

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
          }
        }

        productType {
          name
        }
        category {
          name
          id
        }
        productVariants(first: 10) {
          edges {
            node {
              id
              name
              sku
              quantityAvailable
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
function mapNodeToProductCard(
  node: any,
  externalDiscounts?: Record<string, number>,
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
  const aromas = aromaValues.map((val: any) => val.name || val.value || '').filter(Boolean)

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

  // Если тегов нет, используем дефолтные (для обратной совместимости)
  const defaultAromas = ['Cладкий 🤤', 'Цветочный 🌸', 'Древесный 🪵']
  const defaultGroup = [
    { id: 1, group: 'sweet', title: 'Cладкий 🤤' },
    { id: 2, group: 'flower', title: 'Цветочный 🌸' },
    { id: 3, group: 'wood', title: 'Древесный 🪵' },
  ]

  return {
    id: variant.id,
    name: node.name,
    slug: node.slug,
    thumbnail: node.thumbnail?.url ?? '',
    image: node.media?.[0]?.url ?? '',
    gallery: (node.media || []).map((m: any) => m?.url).filter(Boolean),
    price,
    oldPrice,
    discountPercent,
    size: variant.name,
    group: group.length > 0 ? group : defaultGroup,
    aromas: aromas.length > 0 ? aromas : defaultAromas,
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

  const result = nodes.map((node: any) => mapNodeToProductCard(node, discounts))
  return result
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
    where: { collection: {eq :"Q29sbGVjdGlvbjoy" } }
    ) {
    edges {
      node {
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
        collections{
          id
          name
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

  const result = nodes.map((node: any) => mapNodeToProductCard(node, discounts))
  return result
}

/**
 * QUERY: Fetches bestseller products from a collection.
 * SERVICE NAME: collection (Bestsellers)
 */
export async function getChoiceProducts(): Promise<any> {
  const query = `
    query getGreedProducts($channel: String!) {
  products(
    first: 20, 
    channel: $channel, 
    where: { collection: {eq :"Q29sbGVjdGlvbjox" } }
    ) {
    edges {
      node {
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
        collections{
          id
          name
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
        attributes{
          attribute{
            name  
            slug
          }
          values{
            name
          }  
        }
        assignedAttributes{
          attribute{
            id
            slug
            name
          }
          
         ... on AssignedTextAttribute{
         value
        }

           ... on AssignedPlainTextAttribute{
        textValue: value
      }   

        ... on AssignedFileAttribute {
            fileValue: value {
              url
            }
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
  const result = data.products.edges.map((node: any) => {
    const photoAttr = node.node.assignedAttributes.find(
      (i: any) =>
        i.attribute.slug === 'vybor-foto' ||
        i.attribute.slug === 'vybor-photo' ||
        i.attribute.name?.toLowerCase().includes('фото') ||
        i.attribute.name?.toLowerCase().includes('photo'),
    )
    const imageUrl = photoAttr?.fileValue?.url || '/images/choice-1.jpg'

    const nameAttr = node.node.assignedAttributes.find(
      (i: any) =>
        i.attribute.slug === 'vybor-imya' ||
        i.attribute.slug === 'vybor-name' ||
        i.attribute.name?.toLowerCase().includes('имя') ||
        i.attribute.name?.toLowerCase().includes('name'),
    )
    const star = nameAttr?.textValue || nameAttr?.value || ''

    const dateAttr = node.node.attributes.find(
      (i: any) =>
        i.attribute.slug === 'vybor-data' ||
        i.attribute.slug === 'vybor-date' ||
        i.attribute.name?.toLowerCase().includes('дата') ||
        i.attribute.name?.toLowerCase().includes('date'),
    )
    const date = dateAttr?.values[0].name || dateAttr?.textValue || ''
    return {
      id: node.node.productVariants.edges[0].node.id,
      name: node.node.name,
      slug: node.node.slug,
      thumbnail: node.node.thumbnail.url,
      image: imageUrl,
      price: parseFloat(
        node.node.productVariants.edges[0].node.pricing.price.gross.amount,
      ),
      oldPrice: 0,
      size: node.node.productVariants.edges[0].node.name,
      star: star,
      date: formatDate(date),
    }
  })

  return result
}

/** Товары коллекции по ID (коллекция 5 — «Ваши носовые сосочки будут в восторге») */
const COLLECTION_NOSE_ID = 'Q29sbGVjdGlvbjo1'

export async function getProductsByCollectionId(
  collectionId: string = COLLECTION_NOSE_ID,
  first: number = 12,
): Promise<ProductCardItem[]> {
  const query = `
    query getProductsByCollection($channel: String!, $collectionId: ID!, $first: Int!) {
      products(first: $first, channel: $channel, where: { collection: { eq: $collectionId } }) {
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
  const variables = { channel: CHANNEL, collectionId, first }
  const data = await graphqlRequest<BestSellersResponse>(query, variables)
  const nodes = data.products.edges.map((edge: any) => edge.node)
  const variantIds = nodes.map((node: any) => node.productVariants.edges[0]?.node.id).filter(Boolean)
  const discounts = await getCatalogDiscounts(variantIds)
  return nodes.map((node: any) => mapNodeToProductCard(node, discounts))
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
    return nodes.map((node: any) => mapNodeToProductCard(node, discounts))
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
    return nodes.map((node: any) => mapNodeToProductCard(node, discounts))
  } catch (e) {
    console.error('getProductsByAromaValue error:', e)
    return []
  }
}

export async function getProductsByCategorySlug(categorySlug: string): Promise<any> {
  const query = `
    query getGreedProducts($channel: String! , $categorySlug: String) {
         category(slug: $categorySlug){
  products(first: 12, channel: $channel) {
    edges {
      node {
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
        collections{
          id
          name
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

  const nodes = data.category.products.edges.map((edge: any) => edge.node)
  const variantIds = nodes.map(
    (node: any) => node.productVariants.edges[0].node.id as string,
  )
  const discounts = await getCatalogDiscounts(variantIds)

  const result = nodes.map((node: any) => mapNodeToProductCard(node, discounts))
  return result
}
