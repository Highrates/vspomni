#!/usr/bin/env node
/**
 * Аудит наличия каталога Saleor (канал vspomni-site).
 * Запуск: node scripts/audit-stock.mjs
 */
const ENDPOINT =
  process.env.GRAPHQL_PUBLIC_API_URL || 'https://vspomni.store/graphql/'
const CHANNEL = process.env.CHANNEL || 'vspomni-site'

function isVariantSellable(qty) {
  if (qty == null) return true
  return qty > 0
}

function isProductInStock(node) {
  if (node.isAvailableForPurchase === false) return false
  const edges = node.productVariants?.edges ?? []
  if (!edges.length) return node.isAvailableForPurchase !== false
  return edges.some((e) => isVariantSellable(e.node?.quantityAvailable))
}

async function gql(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors))
  return json.data
}

async function main() {
  const rows = []
  let after = null
  for (let page = 0; page < 50; page++) {
    const data = await gql(
      `query($channel:String!,$first:Int!,$after:String){
        products(first:$first,after:$after,channel:$channel,filter:{isPublished:true}){
          pageInfo{hasNextPage endCursor}
          edges{node{
            slug name isAvailableForPurchase
            productVariants(first:20){edges{node{sku quantityAvailable}}}
          }}
        }
      }`,
      { channel: CHANNEL, first: 100, after },
    )
    for (const e of data.products.edges) {
      const n = e.node
      const qtys = (n.productVariants?.edges ?? []).map(
        (v) => v.node.quantityAvailable,
      )
      const maxQty = qtys.length
        ? Math.max(...qtys.map((q) => (q == null ? Infinity : q)))
        : null
      const inStock = isProductInStock(n)
      const flag = n.isAvailableForPurchase !== false
      rows.push({
        slug: n.slug,
        flag,
        maxQty: maxQty === Infinity ? '∞' : maxQty,
        inStock,
        mismatch: flag !== inStock,
      })
    }
    if (!data.products.pageInfo.hasNextPage) break
    after = data.products.pageInfo.endCursor
  }

  const mismatches = rows.filter((r) => r.mismatch)
  const oos = rows.filter((r) => !r.inStock)
  console.log(
    JSON.stringify(
      {
        channel: CHANNEL,
        total: rows.length,
        inStock: rows.filter((r) => r.inStock).length,
        outOfStock: oos.length,
        mismatches: mismatches.length,
        mismatchSample: mismatches.slice(0, 30),
        inStockSlugs: rows.filter((r) => r.inStock).map((r) => r.slug),
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
