'use client'

import React, { useState, useEffect } from 'react'
import PhoneInput from '../ui/PhoneInput'
import { useUserStore } from '@/stores/useUser'
import { formatPhoneInputValue } from '@/lib/ruPhone'

const OrderPhone = () => {
  const { user, setUser } = useUserStore()
  const [phone, setPhone] = useState<string>(user.phone || '')

  // Подтягиваем телефон из профиля при загрузке
  useEffect(() => {
    if (user.phone) {
      setPhone(formatPhoneInputValue(user.phone))
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
          placeholder="+7 (900) 000-00-00"
        />
      </div>
    </>
  )
}

export default OrderPhone
