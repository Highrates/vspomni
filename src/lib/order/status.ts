import type { OrderStatusCode } from './types'

export const ORDER_STATUS_LABELS: Record<OrderStatusCode, string> = {
  paid: 'Оплачен',
  packing: 'Собираем',
  shipped: 'Отправлен',
  in_transit: 'В пути',
  delivered: 'Доставлен',
  canceled: 'Отменён',
}

export function isActiveOrderStatus(statusCode: OrderStatusCode): boolean {
  return statusCode !== 'delivered' && statusCode !== 'canceled'
}

export function orderStatusBadgeClass(statusCode: OrderStatusCode): string {
  switch (statusCode) {
    case 'delivered':
      return 'bg-emerald-50 text-emerald-800'
    case 'canceled':
      return 'bg-red-50 text-red-700'
    case 'shipped':
    case 'in_transit':
      return 'bg-blue-50 text-blue-800'
    case 'packing':
      return 'bg-amber-50 text-amber-900'
    default:
      return 'bg-neutral-100 text-neutral-800'
  }
}
