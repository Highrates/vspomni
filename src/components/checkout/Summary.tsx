'use client'

import { formatCurrency } from '@/lib/functions'

type SummaryProps = {
  total: number
  subtotal: number
  discount: number
  promoDiscount: number
  appliedPromoCode: string | null
  discountPercent: number
  totalItems: number
  shipping: number
  shippingLoading: boolean
  /** null / неизвестно — показываем как СДЭК (старые адреса без метки) */
  shippingCarrier?: 'cdek' | 'yandex' | 'ozon' | null
  discountType?: 'PERCENTAGE' | 'FIXED' | 'SHIPPING'
}

export const Summary = ({
  total,
  subtotal,
  discount,
  promoDiscount,
  appliedPromoCode,
  discountPercent,
  totalItems,
  shipping,
  shippingLoading,
  shippingCarrier = null,
  discountType,
}: SummaryProps) => {
  const hasDiscount = discount > 0 || discountType === 'SHIPPING'
  const deliveryLabel =
    shippingCarrier === 'yandex'
      ? 'Доставка Яндекс:'
      : shippingCarrier === 'ozon'
        ? 'Доставка Ozon:'
        : 'Доставка СДЭК:'

  return (
    <div className="p-2 sm:p-4 min-w-0">
      {/* Сумма без учёта скидок */}
      <div className="flex justify-between gap-3 text-lg sm:text-xl font-semibold mb-3 min-w-0">
        <span className="min-w-0 break-words">
          Сумма • {totalItems}{' '}
          {totalItems === 1 ? 'товар' : totalItems < 5 ? 'товара' : 'товаров'}
        </span>
        <span className="shrink-0 font-semibold">
          {formatCurrency(subtotal)} ₽
        </span>
      </div>

      {/* Блок скидок / промокода */}
      {hasDiscount && (
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between gap-3 text-[15px] font-medium text-gray-600 min-w-0">
            <span className="min-w-0 break-words">
              Скидка
              {appliedPromoCode && (
                <>
                  {' '}
                  ({appliedPromoCode}
                  {discountType === 'PERCENTAGE' && discountPercent
                    ? ` -${discountPercent}%`
                    : ''}
                  {discountType === 'FIXED' && discount
                    ? ` -${formatCurrency(discount)} ₽`
                    : ''}
                  {discountType === 'SHIPPING' ? ' — бесплатная доставка' : ''}
                  )
                </>
              )}
            </span>
            <span className="shrink-0 text-red">
              {discountType === 'SHIPPING'
                ? 'Бесплатно'
                : `−${formatCurrency(discount)} ₽`}
            </span>
          </div>
        </div>
      )}

      {/* Доставка */}
      <div className="flex justify-between gap-3 text-[15px] font-medium text-gray-600 mb-3 min-w-0">
        <span className="min-w-0">{deliveryLabel}</span>
        <span className="shrink-0 text-right">
          {shippingLoading
            ? 'Рассчитывается...'
            : shipping > 0
              ? `${formatCurrency(shipping)} ₽`
              : 'Не рассчитана'}
        </span>
      </div>

      {/* Итоговая сумма к оплате */}
      <div className="flex justify-between items-baseline gap-3 mt-2 min-w-0">
        <span className="text-lg font-semibold">Итого</span>
        <span className="shrink-0 text-xl sm:text-2xl font-semibold">
          {formatCurrency(total)} ₽
        </span>
      </div>
    </div>
  )
}
