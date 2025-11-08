'use client'

import React, { useState } from 'react'

const OrderForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    deliveryType: 'pickup',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <section className="select-none">
      <div className="mb-10">
        <div className="flex gap-4 mb-4">
          <div className="w-1/2">
            <label className="text-sm font-medium text-black/40 block mb-1">
              Имя
            </label>
            <input
              type="text"
              name="name"
              className="font-medium border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 w-full"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="w-1/2">
            <label className="text-sm font-medium text-black/40 block mb-1">
              Фамилия
            </label>
            <input
              type="text"
              name="lastName"
              className="font-medium border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 w-full"
              value={formData.lastName}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-black/40 block mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            className="font-medium border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 w-full"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
      </div>
    </section>
  )
}

export default OrderForm
