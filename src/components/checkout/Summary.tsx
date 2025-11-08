'use client'

type SummaryProps = {
  total: string
  discount: string
  promoDiscount: string
}

export const Summary = ({ total, discount, promoDiscount }: SummaryProps) => {
  return (
    <div className="p-4 ">
      <div className="flex justify-between text-xl font-semibold mb-4">
        <span>Сумма • {3} товара </span>
        <div className="text-right flex items-end">
          {' '}
          <div className="mr-1.5 line-through font-semibold text-xl text-gray-400">
            {total}
          </div>
          <div className="font-semibold text-xl">{discount}</div>
        </div>
      </div>
      <div className="flex justify-between font-medium text-[16] h-5 mb-2.5 text-gray-500">
        <span>Скидка</span>
        <span className="text-red">{discount}</span>
      </div>
      <div className="flex justify-between font-medium text-[16] h-5 text-gray-500">
        <span>Промокод</span>
        <span className="text-red">{promoDiscount}</span>
      </div>
    </div>
  )
}
