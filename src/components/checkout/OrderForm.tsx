'use client'

import { useUserStore } from '@/stores/useUser'
import React, { useEffect } from 'react'

const OrderForm = () => {
  const {user, setUser, fetchUser} = useUserStore()

  useEffect(() => {
    fetchUser()
  },[])




  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // setFormData({ ...formData, [e.target.name]: e.target.value })
     setUser({...user, [e.target.name]: e.target.value})
  }
  return (
    <section className="select-none">
      <div className="mb-6 sm:mb-10">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="w-full sm:w-1/2">
            <label className="text-sm font-medium text-black/40 block mb-1">
              Имя
            </label>
            <input
              type="text"
              name="name"
              className="font-medium border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 sm:p-2.5 w-full text-sm sm:text-base"
              value={user.name}
              onChange={handleChange}
            />
          </div>

          <div className="w-full sm:w-1/2">
            <label className="text-sm font-medium text-black/40 block mb-1">
              Фамилия
            </label>
            <input
              type="text"
              name="familyName"
              className="font-medium border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 sm:p-2.5 w-full text-sm sm:text-base"
              value={user.familyName}
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
            className="font-medium border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 sm:p-2.5 w-full text-sm sm:text-base"
            value={user.email}
            onChange={handleChange}
          />
        </div>
      </div>
    </section>
  )
}

export default OrderForm
