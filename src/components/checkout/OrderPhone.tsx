'use client'

import React, { useState } from 'react'

const OrderPhone = () => {
  const [phone, setPhone] = useState<string>('+900 999 99 00')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value)
  }
  return (
    <>
      <div className="mb-10">
        <label className="text-sm font-medium text-black/40 block mb-1">
          Телефон
        </label>
        <input
          type="email"
          name="email"
          className="border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 w-full"
          value={phone}
          onChange={handleChange}
        />
      </div>
    </>
  )
}

export default OrderPhone
