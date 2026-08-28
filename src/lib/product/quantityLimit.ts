/**
 * Лимит количества на покупателя (Saleor quantityLimitPerCustomer).
 * null/undefined = без лимита.
 */

export function normalizeQuantityLimit(
  limit?: number | null,
): number | null {
  if (limit == null || !Number.isFinite(limit) || limit <= 0) return null
  return Math.floor(limit)
}

export function formatQuantityLimitMessage(limit: number): string {
  const n = Math.floor(limit)
  if (n === 1) {
    return 'Можно заказать не более 1 шт. этого товара'
  }
  return `Можно заказать не более ${n} шт. этого товара`
}

/** Сколько ещё можно добавить до лимита (без учёта остатка на складе). */
export function remainingQuantityAllowed(
  limit: number | null | undefined,
  currentInCart: number,
): number | null {
  const max = normalizeQuantityLimit(limit)
  if (max == null) return null
  return Math.max(0, max - currentInCart)
}

export function canAddQuantity(
  limit: number | null | undefined,
  currentInCart: number,
  addBy: number,
): boolean {
  const remaining = remainingQuantityAllowed(limit, currentInCart)
  if (remaining == null) return true
  return addBy <= remaining
}
