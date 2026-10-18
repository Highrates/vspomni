/**
 * Синхронизация локальной корзины (Zustand + localStorage) с Nest:
 * `POST /catalog/cart/sync` отдаёт живые цены/наличие/min-max и список удалённых строк.
 *
 * - `buildSyncLines` / `applyCartSyncResponse` — чистые функции (unit-тесты).
 * - `syncCartWithNest` — вызывает API и обновляет стор.
 */
import { syncCart, type CartSyncResponse } from '@/api/catalogApi'
import { uploadsUrl } from '@/api/apiClient'
import type { CartItem } from '@/types/cart'
import { useCartStore } from '@/stores/useCart'

export type CartSyncRemoved = {
  key: string
  reason: 'oos' | 'missing'
  name?: string
}

export type CartSyncOutcome = {
  items: CartItem[]
  removed: CartSyncRemoved[]
  /** Изменились цена/количество/лимиты или были удалены строки. */
  changed: boolean
  priceChanged: boolean
  qtyChanged: boolean
  /** Нет ответа сервера (сеть) — корзину не трогали. */
  skipped?: boolean
}

export function cartLineVariantId(item: CartItem): string {
  return (item.variantId || item.id || '').trim()
}

export function buildSyncLines(
  items: CartItem[],
): Array<{ variantId: string; qty: number }> {
  const merged = new Map<string, number>()
  for (const item of items) {
    const variantId = cartLineVariantId(item)
    if (!variantId) continue
    const qty = Math.max(1, Math.floor(item.quantity) || 1)
    merged.set(variantId, (merged.get(variantId) ?? 0) + qty)
  }
  return [...merged.entries()].map(([variantId, qty]) => ({ variantId, qty }))
}

/** Fingerprint состава корзины — детект мутации во время inflight sync. */
export function cartSyncFingerprint(items: CartItem[]): string {
  return buildSyncLines(items)
    .map((l) => `${l.variantId}:${l.qty}`)
    .sort()
    .join('|')
}

export function applyCartSyncResponse(
  items: CartItem[],
  res: Pick<CartSyncResponse, 'items' | 'removedKeys' | 'removedLines'>,
): CartSyncOutcome {
  const removedMap = new Map<string, CartSyncRemoved>()
  for (const key of res.removedKeys ?? []) {
    removedMap.set(key, { key, reason: 'missing' })
  }
  for (const line of res.removedLines ?? []) {
    removedMap.set(line.key, line)
  }
  const syncedByVariant = new Map(res.items.map((i) => [i.variantId, i]))

  let priceChanged = false
  let qtyChanged = false
  const removed: CartSyncRemoved[] = []
  const next: CartItem[] = []

  for (const item of items) {
    const variantId = cartLineVariantId(item)
    const gone = removedMap.get(variantId)
    if (gone) {
      removed.push({ ...gone, name: gone.name ?? item.product?.name })
      continue
    }
    const synced = syncedByVariant.get(variantId)
    if (!synced) {
      // Сервер не вернул строку и не пометил удалённой — оставляем как есть.
      next.push(item)
      continue
    }

    const price = synced.price
    const listPrice =
      synced.listPrice > price ? synced.listPrice : undefined
    const discountPercent = listPrice
      ? Math.round(((listPrice - price) / listPrice) * 100)
      : undefined
    const maxQty = synced.maxQty > 0 ? synced.maxQty : null
    const quantity = Math.min(
      Math.max(synced.minQty || 1, item.quantity),
      maxQty ?? item.quantity,
    )

    if (item.product.price !== price) priceChanged = true
    if (quantity !== item.quantity) qtyChanged = true

    const image = uploadsUrl(synced.imageUrl)
    const weightKg =
      synced.weightGrams != null &&
      Number.isFinite(synced.weightGrams) &&
      synced.weightGrams > 0
        ? synced.weightGrams / 1000
        : item.product.weight
    const length =
      synced.lengthMm != null && synced.lengthMm > 0
        ? synced.lengthMm
        : item.product.length
    const width =
      synced.widthMm != null && synced.widthMm > 0
        ? synced.widthMm
        : item.product.width
    const height =
      synced.heightMm != null && synced.heightMm > 0
        ? synced.heightMm
        : item.product.height

    next.push({
      ...item,
      quantity,
      product: {
        ...item.product,
        price,
        oldPrice: listPrice,
        discountPercent,
        inStock: true,
        quantityAvailable: maxQty,
        quantityLimitPerCustomer: maxQty,
        ...(weightKg != null ? { weight: weightKg } : {}),
        ...(length != null ? { length } : {}),
        ...(width != null ? { width } : {}),
        ...(height != null ? { height } : {}),
        ...(image && !item.product.thumbnail ? { thumbnail: image, image } : {}),
      },
    })
  }

  return {
    items: next,
    removed,
    priceChanged,
    qtyChanged,
    changed: priceChanged || qtyChanged || removed.length > 0,
  }
}

let chain: Promise<CartSyncOutcome> | null = null

const emptyOutcome = (): CartSyncOutcome => ({
  items: [],
  removed: [],
  changed: false,
  priceChanged: false,
  qtyChanged: false,
})

/**
 * Синхронизирует стор корзины с Nest.
 * - Сериализует параллельные вызовы (chain), после inflight — свежий snapshot.
 * - Если корзина изменилась во время запроса — retry (до 3 раз).
 * - Сеть: `skipped: true` (на checkout — throwOnError).
 */
export async function syncCartWithNest(
  opts: { throwOnError?: boolean } = {},
): Promise<CartSyncOutcome> {
  const run = async (): Promise<CartSyncOutcome> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const snapshot = useCartStore.getState().items
      if (snapshot.length === 0) return emptyOutcome()
      const fpBefore = cartSyncFingerprint(snapshot)
      try {
        const res = await syncCart(buildSyncLines(snapshot))
        const latest = useCartStore.getState().items
        if (cartSyncFingerprint(latest) !== fpBefore) {
          // Мутация во время запроса — пересинхронизируем актуальный состав.
          continue
        }
        const outcome = applyCartSyncResponse(latest, res)
        if (outcome.changed || outcome.items.length !== latest.length) {
          useCartStore.getState().replaceItems(outcome.items)
        }
        return outcome
      } catch (e) {
        if (opts.throwOnError) throw e
        return {
          items: useCartStore.getState().items,
          removed: [],
          changed: false,
          priceChanged: false,
          qtyChanged: false,
          skipped: true,
        }
      }
    }
    // После 3 несовпадений fingerprint — применяем к текущему snapshot best-effort.
    const latest = useCartStore.getState().items
    if (latest.length === 0) return emptyOutcome()
    try {
      const res = await syncCart(buildSyncLines(latest))
      const outcome = applyCartSyncResponse(
        useCartStore.getState().items,
        res,
      )
      if (outcome.changed || outcome.items.length !== latest.length) {
        useCartStore.getState().replaceItems(outcome.items)
      }
      return outcome
    } catch (e) {
      if (opts.throwOnError) throw e
      return {
        items: useCartStore.getState().items,
        removed: [],
        changed: false,
        priceChanged: false,
        qtyChanged: false,
        skipped: true,
      }
    }
  }

  const prev = chain
  const next = (prev ?? Promise.resolve(emptyOutcome()))
    .catch(() => emptyOutcome())
    .then(() => run())
  chain = next.finally(() => {
    if (chain === next) chain = null
  })
  return next
}

export function describeCartSyncChanges(outcome: CartSyncOutcome): string | null {
  if (outcome.skipped) {
    return 'Не удалось обновить корзину. Проверьте интернет и попробуйте снова.'
  }
  if (!outcome.changed) return null
  const parts: string[] = []
  if (outcome.removed.length) {
    const names = outcome.removed
      .map((r) => r.name)
      .filter(Boolean)
      .join(', ')
    parts.push(
      names
        ? `Недоступно и удалено из корзины: ${names}`
        : 'Часть товаров недоступна и удалена из корзины',
    )
  }
  if (outcome.qtyChanged) parts.push('Количество скорректировано по наличию')
  if (outcome.priceChanged) parts.push('Цены обновлены')
  return parts.join('. ')
}
