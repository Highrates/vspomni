'use client'

import React, { useState, useEffect } from 'react'
import PhoneInput from '../ui/PhoneInput'
import { useUserStore } from '@/stores/useUser'

const OrderPhone = () => {
  const { user, setUser } = useUserStore()
  const [phone, setPhone] = useState<string>(user.phone || '')

  // Подтягиваем телефон из профиля при загрузке
  useEffect(() => {
    if (user.phone) {
      setPhone(user.phone)
    }
  }, [user.phone])

  const handlePhoneChange = (value: string) => {
    setPhone(value)
    // Обновляем телефон в сторе пользователя
    setUser({ ...user, phone: value })
  }
  
  return (
    <>
      <div className="mb-10">
        <PhoneInput
          onChange={(value) => handlePhoneChange(value)}
          value={phone}
        />
      </div>
    </>
  )
}

export default OrderPhone
