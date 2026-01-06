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
  discountType?: 'PERCENTAGE' | 'FIXED'
}

export const Summary = ({ 
  total, 
  subtotal, 
  discount, 
  promoDiscount, 
  appliedPromoCode,
  discountPercent,
  totalItems,
  discountType,
}: SummaryProps) => {
  const hasDiscount = discount > 0

  return (
    <div className="p-4">
      {/* Сумма без учёта скидок */}
      <div className="flex justify-between text-xl font-semibold mb-3">
        <span>
          Сумма • {totalItems}{' '}
          {totalItems === 1 ? 'товар' : totalItems < 5 ? 'товара' : 'товаров'}
        </span>
        <span className="font-semibold text-xl">
          {formatCurrency(subtotal)} ₽
        </span>
      </div>

      {/* Блок скидок / промокода */}
      {hasDiscount && (
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between text-[15px] font-medium text-gray-600">
            <span>
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
                  )
                </>
              )}
            </span>
            <span className="text-red">−{formatCurrency(discount)} ₽</span>
          </div>
        </div>
      )}

      {/* Итоговая сумма к оплате */}
      <div className="flex justify-between items-baseline mt-2">
        <span className="text-lg font-semibold">Итого</span>
        <span className="text-2xl font-semibold">
          {formatCurrency(total)} ₽
        </span>
      </div>
    </div>
  )
}
