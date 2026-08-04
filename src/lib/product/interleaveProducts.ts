import type { ProductCardItem } from '@/types/product'

/**
 * Чередует товары разных категорий (диффузор → парфюм → саше → …),
 * внутри категории — разные ароматы, чтобы сетка не шла «пачками» одного типа.
 */
export function interleaveProductsByCategoryAndAroma(
  products: ProductCardItem[],
  limit = 12,
): ProductCardItem[] {
  if (products.length <= 1) return products.slice(0, limit)

  const byCategory = new Map<string, ProductCardItem[]>()
  for (const product of products) {
    const key = (product.categorySlug || 'other').toLowerCase()
    const list = byCategory.get(key)
    if (list) list.push(product)
    else byCategory.set(key, [product])
  }

  for (const list of byCategory.values()) {
    list.sort((a, b) => aromaKey(a).localeCompare(aromaKey(b), 'ru'))
  }

  const queues = [...byCategory.values()].filter((q) => q.length > 0)
  // Стабильный порядок категорий по slug — предсказуемый SSR/клиент
  queues.sort((a, b) => {
    const ka = (a[0]?.categorySlug || '').toLowerCase()
    const kb = (b[0]?.categorySlug || '').toLowerCase()
    return ka.localeCompare(kb, 'ru')
  })

  const result: ProductCardItem[] = []
  const recentAromas: string[] = []

  while (result.length < limit && queues.some((q) => q.length > 0)) {
    for (let qi = 0; qi < queues.length; qi++) {
      if (result.length >= limit) break
      const queue = queues[qi]
      if (queue.length === 0) continue

      let pickIndex = 0
      for (let i = 0; i < queue.length; i++) {
        const aroma = aromaKey(queue[i])
        if (!recentAromas.includes(aroma)) {
          pickIndex = i
          break
        }
      }

      const [picked] = queue.splice(pickIndex, 1)
      result.push(picked)

      const aroma = aromaKey(picked)
      recentAromas.push(aroma)
      if (recentAromas.length > Math.max(2, queues.length)) {
        recentAromas.shift()
      }
    }
  }

  return result
}

function aromaKey(product: ProductCardItem): string {
  const fromAromas = product.aromas?.[0]?.trim().toLowerCase()
  if (fromAromas) return fromAromas
  // fallback: хвост названия после типа («Диффузор … Чистый хлопок»)
  const name = product.name?.trim().toLowerCase() || product.slug || product.id
  return name
}
