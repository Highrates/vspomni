'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'

interface PasswordChangeModalProps {
  visible: boolean
  onClose: () => void
}

export default function PasswordChangeModal({
  visible,
  onClose,
}: PasswordChangeModalProps) {
  const [show, setShow] = useState(visible)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Синхронизируем show с visible пропсом
  useEffect(() => {
    setShow(visible)
  }, [visible])

  const handleClose = () => {
    setShow(false)
    setTimeout(() => {
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setErrors({})
      onClose()
    }, 300)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.oldPassword) {
      newErrors.oldPassword = 'Введите текущий пароль'
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Введите новый пароль'
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Пароль должен содержать не менее 8 символов'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтвердите новый пароль'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setLoading(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL ?? ''
      const response = await fetch(`${baseUrl}/auth/change-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Ошибка при смене пароля')
      }

      toast.success('Пароль успешно изменен')
      handleClose()
    } catch (error: any) {
      console.error('Password change error:', error)
      toast.error(error.message || 'Ошибка при смене пароля')
    } finally {
      setLoading(false)
    }
  }

  // Не рендерим, если модалка закрыта
  if (!visible && !show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ pointerEvents: show ? 'auto' : 'none' }}>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: show ? 1 : 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={handleClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.95 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5 z-10"
        style={{ maxWidth: '400px', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 hover:border-black border border-transparent rounded-full p-1 duration-300"
        >
          <Image src="/close.png" alt="close" width={20} height={20} />
        </button>

        {/* Title */}
        <h2 className="text-xl font-semibold mb-4 pr-8">Сменить пароль</h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Old Password */}
          <div>
            <label className="block text-xs mb-1.5 text-gray-600">
              Текущий пароль
            </label>
            <input
              type="password"
              name="oldPassword"
              value={formData.oldPassword}
              onChange={handleChange}
              className={`w-full px-3 py-2 text-sm bg-gray-100 border-0 rounded ${
                errors.oldPassword ? 'border-red-500' : ''
              }`}
              placeholder="Введите текущий пароль"
              required
            />
            {errors.oldPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.oldPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs mb-1.5 text-gray-600">
              Новый пароль
            </label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className={`w-full px-3 py-2 text-sm bg-gray-100 border-0 rounded ${
                errors.newPassword ? 'border-red-500' : ''
              }`}
              placeholder="Введите новый пароль (мин. 8 символов)"
              required
            />
            {errors.newPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs mb-1.5 text-gray-600">
              Подтвердите новый пароль
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full px-3 py-2 text-sm bg-gray-100 border-0 rounded ${
                errors.confirmPassword ? 'border-red-500' : ''
              }`}
              placeholder="Повторите новый пароль"
              required
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm border border-black rounded-full hover:bg-gray-100 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-black text-white rounded-full hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

