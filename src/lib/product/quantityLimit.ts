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

export function normalizeQuantityAvailable(
  available?: number | null,
): number | null {
  if (available == null || !Number.isFinite(available) || available < 0) {
    return null
  }
  return Math.floor(available)
}

/** Максимум к заказу: min(лимит на покупателя, остаток на складе). */
export function effectiveMaxQuantity(
  limit?: number | null,
  quantityAvailable?: number | null,
): number | null {
  const customerLimit = normalizeQuantityLimit(limit)
  const stock = normalizeQuantityAvailable(quantityAvailable)
  if (customerLimit == null && stock == null) return null
  if (customerLimit == null) return stock
  if (stock == null) return customerLimit
  return Math.min(customerLimit, stock)
}

export function formatQuantityLimitMessage(limit: number): string {
  const n = Math.floor(limit)
  if (n === 1) {
    return 'Можно заказать не более 1 шт. этого товара'
  }
  return `Можно заказать не более ${n} шт. этого товара`
}

export function formatStockLimitMessage(available: number): string {
  const n = Math.floor(available)
  if (n === 1) {
    return 'На складе остался только 1 шт.'
  }
  return `На складе доступно только ${n} шт.`
}

export function formatMaxQuantityMessage(
  max: number,
  limit?: number | null,
  quantityAvailable?: number | null,
): string {
  const customerLimit = normalizeQuantityLimit(limit)
  const stock = normalizeQuantityAvailable(quantityAvailable)

  if (
    stock != null &&
    (customerLimit == null || stock <= customerLimit) &&
    max === stock
  ) {
    return formatStockLimitMessage(max)
  }

  return formatQuantityLimitMessage(max)
}

/** Сколько ещё можно добавить до лимита (с учётом остатка на складе). */
export function remainingQuantityAllowed(
  limit: number | null | undefined,
  currentInCart: number,
  quantityAvailable?: number | null,
): number | null {
  const max = effectiveMaxQuantity(limit, quantityAvailable)
  if (max == null) return null
  return Math.max(0, max - currentInCart)
}

export function canAddQuantity(
  limit: number | null | undefined,
  currentInCart: number,
  addBy: number,
  quantityAvailable?: number | null,
): boolean {
  const remaining = remainingQuantityAllowed(
    limit,
    currentInCart,
    quantityAvailable,
  )
  if (remaining == null) return true
  return addBy <= remaining
}
