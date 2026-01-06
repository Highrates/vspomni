'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { CustomButton as Button } from '../common/CustomButton'
import { AddressInfo } from '@/graphql/types/auth.types'
import { createAddress, updateAddress } from '@/graphql/queries/adress.service'
import PhoneInput from '../ui/PhoneInput'
import CountrySelect from '../checkout/CountrySelect'
import CdekPvzList, { CdekPvzInfo } from '../ui/CdekPvzList'
import { useUserStore } from '@/stores/useUser'

interface AddressModalProps {
  visible: boolean
  onClose: () => void
  onAddressAdded: (address: AddressInfo) => void
  onAddressUpdated?: (address: AddressInfo) => void
  addressToEdit?: AddressInfo | null
}

interface FormData {
  firstName: string
  lastName: string
  phone: string
  country: string
  countryArea: string
  city: string
  cityArea: string
  streetAddress1: string
  streetAddress2: string
  postalCode: string
  companyName: string
  isDefaultShippingAddress: boolean
}

interface FormErrors {
  [key: string]: string
}

export default function AddressModal({
  visible,
  onClose,
  onAddressAdded,
  onAddressUpdated,
  addressToEdit,
}: AddressModalProps) {
  const { user } = useUserStore()
  const [show, setShow] = useState(visible)
  const [loading, setLoading] = useState(false)
  const [isCdekPvzSelected, setIsCdekPvzSelected] = useState(false)

  // Determine if we are in Edit Mode
  const isEditMode = !!addressToEdit

  const initialFormState: FormData = {
    firstName: '',
    lastName: '',
    phone: '',
    country: 'RU', // По умолчанию Россия
    countryArea: '',
    city: '',
    cityArea: '',
    streetAddress1: '',
    streetAddress2: '',
    postalCode: '',
    companyName: '',
    isDefaultShippingAddress: false,
  }

  const [formData, setFormData] = useState<FormData>(initialFormState)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (visible) {
      setShow(true)

      if (addressToEdit) {
        // Safe extraction of country code (handles if backend returns object or string)
        const countryCode =
          typeof addressToEdit.country === 'object' && addressToEdit.country !== null
            ? (addressToEdit.country as any).code
            : addressToEdit.country

        setFormData({
          firstName: addressToEdit.firstName || '',
          lastName: addressToEdit.lastName || '',
          phone: addressToEdit.phone || '',
          country: countryCode || 'RU', // По умолчанию Россия
          countryArea: addressToEdit.countryArea || '',
          city: addressToEdit.city || '', // Ensure this is not undefined
          cityArea: addressToEdit.cityArea || '',
          streetAddress1: addressToEdit.streetAddress1 || '',
          streetAddress2: addressToEdit.streetAddress2 || '',
          postalCode: addressToEdit.postalCode || '',
          companyName: addressToEdit.companyName || '',
          isDefaultShippingAddress: addressToEdit.isDefaultShippingAddress || false,
        })
      } else {
        // Pre-fill for new address using User Profile data
        setFormData({
          ...initialFormState,
          firstName: user.name || '',
          lastName: user.familyName || '',
          phone: user.phone || '',
        })
      }
    } else {
      const timeout = setTimeout(() => {
        setShow(false)
        setErrors({})
        setIsCdekPvzSelected(false)
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [visible, addressToEdit, user])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (visible) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, onClose])

  const validatePostalCode = (code: string, country: string): boolean => {
    const cleanCode = code.replace(/[\s-]/g, '')
    const patterns: { [key: string]: RegExp } = {
      UZ: /^\d{6}$/,
      RU: /^\d{6}$/,
      US: /^\d{5}(-\d{4})?$/,
      GB: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
      CA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
      DE: /^\d{5}$/,
      FR: /^\d{5}$/,
      IT: /^\d{5}$/,
      ES: /^\d{5}$/,
      AU: /^\d{4}$/,
      JP: /^\d{7}$/,
      CN: /^\d{6}$/,
      IN: /^\d{6}$/,
      BR: /^\d{5}-?\d{3}$/,
      MX: /^\d{5}$/,
    }

    const pattern = patterns[country]
    if (pattern) {
      return pattern.test(cleanCode)
    }
    return /^\d{3,10}$/.test(cleanCode)
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'Обязательное поле'
    if (!formData.lastName.trim()) newErrors.lastName = 'Обязательное поле'
    if (!formData.phone.trim()) newErrors.phone = 'Обязательное поле'
    if (!formData.country) newErrors.country = 'Обязательное поле'
    if (!formData.countryArea.trim()) newErrors.countryArea = 'Обязательное поле'
    
    // Crucial check: City is required
    if (!formData.city.trim()) newErrors.city = 'Обязательное поле'
    
    if (!isCdekPvzSelected && !formData.cityArea.trim()) {
      newErrors.cityArea = 'Обязательное поле'
    }
    if (!formData.streetAddress1.trim())
      newErrors.streetAddress1 = 'Обязательное поле'
    
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Обязательное поле'
    } else if (!validatePostalCode(formData.postalCode, formData.country)) {
      const formats: { [key: string]: string } = {
        UZ: '6 цифр (например: 100000)',
        RU: '6 цифр (например: 101000)',
        US: '5 цифр (например: 12345)',
        GB: 'формат UK (например: SW1A 1AA)',
        CA: 'формат CA (например: K1A 0B1)',
      }
      const expectedFormat =
        formats[formData.country] || 'корректный почтовый индекс'
      newErrors.postalCode = `Неверный формат. Ожидается: ${expectedFormat}`
    }
    
    // companyName не обязательное поле

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Пожалуйста, заполните все обязательные поля')
      return
    }

    setLoading(true)

    try {
      const addressInput = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        country: formData.country,
        countryArea: formData.countryArea,
        city: formData.city,
        cityArea: formData.cityArea,
        streetAddress1: formData.streetAddress1,
        streetAddress2: formData.streetAddress2,
        postalCode: formData.postalCode,
        companyName: formData.companyName,
      }

      if (isEditMode && addressToEdit) {
        // --- EDIT EXISTING ADDRESS ---
        // Note: updateAddress usually returns a list of addresses or the updated user object
        // Adjust this depending on exactly what your service returns. 
        // Assuming it returns the updated list like createAddress based on your context.
        const updatedAddresses = await updateAddress(
          addressToEdit.id,
          addressInput
        )
        
        // Find the updated address in the returned list
        const updatedAddress = updatedAddresses.find((a: AddressInfo) => a.id === addressToEdit.id)
        
        if (onAddressUpdated && updatedAddress) {
          onAddressUpdated(updatedAddress)
        } else if (onAddressUpdated) {
            // Fallback if the backend returns array but ID changed or logic differs
             onAddressUpdated(updatedAddresses.find((a: AddressInfo) => a.streetAddress1 === addressInput.streetAddress1) || updatedAddresses[0])
        }

        toast.success('Адрес успешно обновлен!')
      } else {
        // --- CREATE NEW ADDRESS ---
        const updatedAddresses = await createAddress(
          addressInput,
          formData.isDefaultShippingAddress,
        )

        const newAddress = updatedAddresses[updatedAddresses.length - 1]
        onAddressAdded(newAddress)
        toast.success('Адрес успешно добавлен!')
      }

      onClose()
      
    } catch (error: any) {
      toast.error(isEditMode ? 'Ошибка при обновлении' : 'Ошибка при добавлении адреса')
      console.error('Address operation error:', error)
      
      // If server returns validation errors, try to map them to fields
      if (error.graphQLErrors) {
          error.graphQLErrors.forEach((err: any) => {
              console.log(err.message)
          })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleCdekPvzChoose = (info: CdekPvzInfo) => {
    setIsCdekPvzSelected(true)

    let parsedCity = info.cityName || ''
    let parsedAddress = info.address || info.name || ''

    if (info.name && !info.address) {
      parsedAddress = info.name
      const parts = info.name.split(',').map((p: string) => p.trim())
      if (parts.length >= 2) {
        parsedCity = parts[1]
      }
    }

    setErrors((prev) => ({
      ...prev,
      city: '',
      streetAddress1: '',
      companyName: '',
      countryArea: '',
      cityArea: '',
      postalCode: '',
    }))

    setFormData((prev) => ({
      ...prev,
      city: parsedCity || prev.city,
      streetAddress1: parsedAddress || prev.streetAddress1,
      companyName: info.name || prev.companyName,
      country: 'RU', // По умолчанию Россия
      countryArea: parsedCity || prev.countryArea,
      cityArea: '',
      postalCode: info.postalCode || prev.postalCode || '101000',
    }))

    toast.success('Адрес ПВЗ выбран и заполнен')
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: visible ? 0 : '100%' }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative w-full md:w-[600px] h-full bg-white shadow-xl rounded-tl-3xl md:rounded-l-3xl flex flex-col"
      >
        <div className="max-sm:p-4 p-8 border-b border-black/10 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-semibold">
            {isEditMode ? 'Редактировать адрес' : 'Новый адрес'}
          </h1>
          <button
            onClick={onClose}
            className="hover:border-black border border-transparent rounded-full p-1 duration-300"
          >
            <Image src="/close.png" alt="close" width={24} height={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-sm:px-4 px-8 py-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-2">Имя *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={`h-12 px-4 rounded-xl border text-base outline-none transition ${
                  errors.firstName
                    ? 'border-red-500'
                    : 'border-black/10 focus:border-black/30'
                }`}
              />
              {errors.firstName && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.firstName}
                </span>
              )}
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium mb-2">Фамилия *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={`h-12 px-4 rounded-xl border text-base outline-none transition ${
                  errors.lastName
                    ? 'border-red-500'
                    : 'border-black/10 focus:border-black/30'
                }`}
              />
              {errors.lastName && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.lastName}
                </span>
              )}
            </div>
          </div>

          <PhoneInput
            value={formData.phone}
            onChange={(value) => handleInputChange('phone', value)}
            error={errors.phone}
          />

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2">
              Название компании
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              className={`h-12 px-4 rounded-xl border text-base outline-none transition ${
                errors.companyName
                  ? 'border-red-500'
                  : 'border-black/10 focus:border-black/30'
              }`}
            />
            {errors.companyName && (
              <span className="text-red-500 text-sm mt-1">
                {errors.companyName}
              </span>
            )}
          </div>

          <CountrySelect
            value={formData.country}
            onChange={(value) => handleInputChange('country', value)}
            error={errors.country}
          />

          {formData.country === 'RU' && (
            <div className="flex flex-col gap-3 p-4 border border-black/10 rounded-xl bg-gray-50/50">
              <div>
                <h3 className="text-base font-semibold mb-1">
                  Выбрать пункт выдачи СДЭК
                </h3>
                <p className="text-sm text-black/60">
                  Выберите пункт выдачи заказа в списке или на карте Яндекс,
                  чтобы автоматически заполнить адресные поля
                </p>
              </div>
              <CdekPvzList
                onChoose={handleCdekPvzChoose}
                defaultCity="Москва"
                initialMode="map"
              />
            </div>
          )}

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2">Регион *</label>
            <input
              type="text"
              value={formData.countryArea}
              onChange={(e) => handleInputChange('countryArea', e.target.value)}
              className={`h-12 px-4 rounded-xl border text-base outline-none transition ${
                errors.countryArea
                  ? 'border-red-500'
                  : 'border-black/10 focus:border-black/30'
              }`}
            />
            {errors.countryArea && (
              <span className="text-red-500 text-sm mt-1">
                {errors.countryArea}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-2">Город *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className={`h-12 px-4 rounded-xl border text-base outline-none transition ${
                  errors.city
                    ? 'border-red-500'
                    : 'border-black/10 focus:border-black/30'
                }`}
              />
              {errors.city && (
                <span className="text-red-500 text-sm mt-1">{errors.city}</span>
              )}
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium mb-2">Район *</label>
              <input
                type="text"
                value={formData.cityArea}
                onChange={(e) => handleInputChange('cityArea', e.target.value)}
                className={`h-12 px-4 rounded-xl border text-base outline-none transition ${
                  errors.cityArea
                    ? 'border-red-500'
                    : 'border-black/10 focus:border-black/30'
                }`}
              />
              {errors.cityArea && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.cityArea}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2">Адрес улицы *</label>
            <input
              type="text"
              value={formData.streetAddress1}
              onChange={(e) =>
                handleInputChange('streetAddress1', e.target.value)
              }
              className={`h-12 px-4 rounded-xl border text-base outline-none transition ${
                errors.streetAddress1
                  ? 'border-red-500'
                  : 'border-black/10 focus:border-black/30'
              }`}
            />
            {errors.streetAddress1 && (
              <span className="text-red-500 text-sm mt-1">
                {errors.streetAddress1}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2">
              Дополнительный адрес (комментарий)
            </label>
            <input
              type="text"
              value={formData.streetAddress2}
              onChange={(e) =>
                handleInputChange('streetAddress2', e.target.value)
              }
              placeholder="Например: Квартира 5, подъезд 2"
              className="h-12 px-4 rounded-xl border border-black/10 text-base outline-none transition focus:border-black/30"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2">
              Почтовый индекс *
            </label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => handleInputChange('postalCode', e.target.value)}
              placeholder={
                formData.country === 'UZ'
                  ? '100000'
                  : formData.country === 'RU'
                    ? '101000'
                    : formData.country === 'US'
                      ? '12345'
                      : 'Почтовый индекс'
              }
              className={`h-12 px-4 rounded-xl border text-base outline-none transition ${
                errors.postalCode
                  ? 'border-red-500'
                  : 'border-black/10 focus:border-black/30'
              }`}
            />
            {errors.postalCode && (
              <span className="text-red-500 text-sm mt-1">
                {errors.postalCode}
              </span>
            )}
          </div>

          {!isEditMode && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefaultShippingAddress}
                onChange={(e) =>
                  handleInputChange('isDefaultShippingAddress', e.target.checked)
                }
                className="w-5 h-5 rounded border-black/20 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">
                Установить как адрес доставки по умолчанию
              </span>
            </label>
          )}
        </div>

        <div className="max-sm:p-4 p-8 border-t border-black/10 shrink-0">
          <Button
            onClick={handleSubmit}
            className={`${loading ? 'disabled' : ''} w-full justify-center `}
          >
            <h2 className="font-semibold">
              {loading
                ? 'Сохранение...'
                : isEditMode
                  ? 'Сохранить изменения'
                  : 'Добавить адрес'}
            </h2>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}