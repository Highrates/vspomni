'use client'

import { useUserStore } from '@/stores/useUser'
import React, { useEffect } from 'react'

const OrderForm = () => {
  const { user, setUser, fetchUser } = useUserStore()

  useEffect(() => {
    fetchUser()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUser({ ...user, [e.target.name]: e.target.value })
  }

  return (
    <section className="select-none min-w-0">
      <div className="mb-6 sm:mb-10 min-w-0">
        <div className="flex flex-col sm:flex-row gap-4 mb-4 min-w-0">
          <div className="w-full min-w-0 sm:w-1/2">
            <label className="text-sm font-medium text-black/40 block mb-1">
              Имя
            </label>
            <input
              type="text"
              name="name"
              autoComplete="given-name"
              className="font-medium border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 sm:p-2.5 w-full min-w-0 text-sm sm:text-base"
              value={user.name}
              onChange={handleChange}
            />
          </div>

          <div className="w-full min-w-0 sm:w-1/2">
            <label className="text-sm font-medium text-black/40 block mb-1">
              Фамилия
            </label>
            <input
              type="text"
              name="familyName"
              autoComplete="family-name"
              className="font-medium border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 sm:p-2.5 w-full min-w-0 text-sm sm:text-base"
              value={user.familyName}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="mb-4 min-w-0">
          <label className="text-sm font-medium text-black/40 block mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            autoComplete="email"
            className="font-medium border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 sm:p-2.5 w-full min-w-0 text-sm sm:text-base"
            value={user.email}
            onChange={handleChange}
          />
        </div>
        <p className="text-xs text-black/35">
          Имя и фамилию подставляем из выбранного адреса доставки — можно
          поправить здесь.
        </p>
      </div>
    </section>
  )
}

export default OrderForm
