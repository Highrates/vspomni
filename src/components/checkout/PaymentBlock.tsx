'use client'

import { useState } from 'react'

export default function PaymentBlock() {
  const [selectedPayment, setSelectedPayment] = useState<string>('sbp')

  return (
    <section className="select-none">
      <h2 className="text-[32px] leading-tight font-semibold mb-6">Оплата</h2>

      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setSelectedPayment('sbp')}
          className={`flex items-center bg-[#FAFAFA] gap-2 px-2 py-3 rounded-[12px] border ${selectedPayment === 'sbp' ? 'border-[#2688EB] bg-[#FAFAFA]' : 'border-transparent bg-[#FAFAFA]'}`}
        >
          <img src="/sbp-logo.svg" alt="СБП" className="h-6 w-6" />
          <span className="font-medium text-[16px]">СБП</span>
        </button>
        <button
          onClick={() => setSelectedPayment('card')}
          className={`flex items-center bg-[#FAFAFA] gap-2 px-2 py-3 rounded-[12px] border ${selectedPayment === 'card' ? 'border-[#2688EB] bg-[#FAFAFA]' : 'border-transparent bg-[#FAFAFA]'}`}
        >
          <img src="/card-logo.svg" alt="Карты" className="h-6 w-6" />
          <span className="font-medium text-[16px]">Карты</span>
        </button>
        <button
          onClick={() => setSelectedPayment('sberpay')}
          className={`flex items-center bg-[#FAFAFA] gap-2 px-2 py-3 rounded-[12px] border ${selectedPayment === 'sberpay' ? 'border-[#2688EB] bg-[#FAFAFA]' : 'border-transparent bg-[#FAFAFA]'}`}
        >
          <img src="/sberpay-logo.svg" alt="SberPay" className="h-6" />
          <span className="font-medium text-[16px]">SberPay</span>
        </button>
      </div>

      <div className="font-normal text-[16px] leading-6 text-black mb-6 display flex">
        <span>{`7 375 ₽ x 4 платежа частями  `}</span>
        <img src="/arrow-logo.svg" alt="arrow-logo" />
      </div>

      <button
        type="button"
        className="w-full h-14 rounded-full bg-black text-white text-[18px] font-semibold hover:bg-[#3A7FE2] transition"
      >
        Оплатить
      </button>
    </section>
  )
}
