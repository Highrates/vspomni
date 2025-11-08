'use client'

import { useState } from 'react'

export const PromoCodeInput = () => {
  const [promoCode, setPromoCode] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPromoCode(e.target.value)
  }

  return (
    <div className=" gap-2 p-4 border rounded-lg shadow-md mb-8 mt-12.5">
      <div className="flex items-center w-full justify-between">
        <label className="text-xl font-semibold text-black block mb-1">
          Добавить промокод или сертификат
        </label>
        <button className="w-10 h-10 flex items-center justify-center">
          <div className="w-4 h-[2] bg-black rounded-lg"></div>
        </button>
      </div>
      <div className="flex items-center h-12.5 mt-4">
        <input
          type="text"
          name="name"
          className="font-medium border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 w-full h-12.5 mr-2"
          value={promoCode}
          onChange={handleChange}
        />
        <button
          className="bg-[#A3A3A3] text-white p-2 rounded-sm w-12.5 h-12.5 "
          onClick={() => alert(`Применён промокод: ${promoCode}`)}
        >
          ✓
        </button>
      </div>
    </div>
  )
}
