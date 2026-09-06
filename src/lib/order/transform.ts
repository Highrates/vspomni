import type { OrderApi, OrderDetail, OrderItem, OrderListItem } from './types'

export function kopecksToRubles(amount: number | undefined | null): number {
  if (!amount) return 0
  return Math.round(amount / 100)
}

export function formatOrderDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function transformLine(line: OrderApi['lines'][number], index: number): OrderItem {
  const unitPrice = line.unitPrice?.gross?.amount || 0
  const undiscountedPrice = line.undiscountedUnitPrice?.gross?.amount || unitPrice
  const hasDiscount = undiscountedPrice > unitPrice && unitPrice > 0

  return {
    id: line.id || String(index + 1),
    title: line.productName || 'Товар',
    volume: line.variantName || '',
    qty: line.quantity || 1,
    oldPrice: hasDiscount ? kopecksToRubles(undiscountedPrice) : 0,
    price: kopecksToRubles(unitPrice),
    lineTotal: kopecksToRubles(line.lineTotal?.gross?.amount ?? unitPrice * (line.quantity || 1)),
    img: line.thumbnail?.url || '/images/product1.png',
  }
}

export function transformOrderListItem(order: OrderApi): OrderListItem {
  return {
    id: String(order.number || order.id),
    orderId: order.id,
    date: formatOrderDate(order.created),
    status: order.statusDisplay,
    statusCode: order.statusCode,
    chargeStatus: order.chargeStatus,
    chargeStatusDisplay: order.chargeStatusDisplay,
    carrier: order.carrier,
    carrierLabel: order.carrierLabel,
    deliverySummary: order.deliverySummary,
    shippingAmount: kopecksToRubles(order.shipping?.gross?.amount),
    totalAmount: kopecksToRubles(order.total?.gross?.amount),
    trackingNumber: order.trackingNumber ?? order.trackingNumbers?.[0] ?? null,
    trackingNumbers: order.trackingNumbers ?? [],
    items: (order.lines || []).map(transformLine),
  }
}

export function transformOrderDetail(order: OrderApi): OrderDetail {
  const base = transformOrderListItem(order)
  return {
    ...base,
    created: order.created,
    subtotalAmount: kopecksToRubles(order.subtotal?.gross?.amount),
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    shippingMethodName: order.shippingMethodName,
    metadata: order.metadata || {},
  }
}
