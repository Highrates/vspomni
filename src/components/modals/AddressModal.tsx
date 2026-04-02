'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { CustomButton as Button } from '../common/CustomButton'
import { AddressInfo } from '@/graphql/types/auth.types'
import { createAddress, updateAddress } from '@/graphql/queries/adress.service'
import PhoneInput from '../ui/PhoneInput'
import { formatPhoneInputValue, isValidRuPhone } from '@/lib/ruPhone'
import { useUserStore } from '@/stores/useUser'
import CdekPvzList, { type CdekPvzInfo } from '../ui/CdekPvzList'
import YandexPvzList from '../ui/YandexPvzList'
import type { YandexPickupPoint } from '@/types/yandexDelivery'
import {
  buildStreetAddress2WithMeta,
  parseVspAddressMeta,
  type VspAddressMeta,
} from '@/lib/addressVspMeta'
import { yandexPickupCityArea } from '@/lib/yandexPickupCityArea'
import { inferRuCountryAreaFromYandexPvz } from '@/lib/ruAddressRegion'
import { yandexPointIdForCargoOffers } from '@/lib/yandexPickupPointId'

interface AddressModalProps {
  visible: boolean
  onClose: () => void
  /** После добавления: newAddress — только что созданный, updatedList — полный список с сервера (чтобы список «прогрузился» как в СДЭК) */
  onAddressAdded: (address: AddressInfo, updatedList?: AddressInfo[]) => void
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

/** Одна сущность для профиля и checkout: `ProfileIndex`, `OrderDelivery`. */
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
  const [deliveryService, setDeliveryService] = useState<'cdek' | 'yandex'>('cdek')
  /** Координаты выбранного ПВЗ Яндекса (для расчёта доставки на checkout) */
  const [yandexPvzCoords, setYandexPvzCoords] = useState<{
    lon: number
    lat: number
  } | null>(null)
  /** id пункта из API Яндекса — для расчёта с type=pvz */
  const [yandexPvzId, setYandexPvzId] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setShow(true)

      if (addressToEdit) {
        const { meta, comment } = parseVspAddressMeta(
          addressToEdit.streetAddress2 || '',
        )
        setDeliveryService(meta?.carrier ?? 'cdek')
        if (
          meta?.carrier === 'yandex' &&
          meta.lon != null &&
          meta.lat != null &&
          Number.isFinite(meta.lon) &&
          Number.isFinite(meta.lat)
        ) {
          setYandexPvzCoords({ lon: meta.lon, lat: meta.lat })
        } else {
          setYandexPvzCoords(null)
        }
        setYandexPvzId(meta?.yandexPvzId?.trim() || null)

        // Safe extraction of country code (handles if backend returns object or string)
        const countryCode =
          typeof addressToEdit.country === 'object' && addressToEdit.country !== null
            ? (addressToEdit.country as any).code
            : addressToEdit.country

        setFormData({
          firstName: addressToEdit.firstName || '',
          lastName: addressToEdit.lastName || '',
          phone: formatPhoneInputValue(addressToEdit.phone || ''),
          country: countryCode || 'RU', // По умолчанию Россия
          countryArea: addressToEdit.countryArea || '',
          city: addressToEdit.city || '', // Ensure this is not undefined
          cityArea: addressToEdit.cityArea || '',
          streetAddress1: addressToEdit.streetAddress1 || '',
          streetAddress2: comment,
          postalCode: addressToEdit.postalCode || '',
          companyName: addressToEdit.companyName || '',
          isDefaultShippingAddress: addressToEdit.isDefaultShippingAddress || false,
        })
      } else {
        setDeliveryService('cdek')
        setYandexPvzCoords(null)
        setYandexPvzId(null)
        // Pre-fill for new address using User Profile data
        setFormData({
          ...initialFormState,
          firstName: user.name || '',
          lastName: user.familyName || '',
          phone: formatPhoneInputValue(user.phone || ''),
        })
      }
    } else {
      const timeout = setTimeout(() => {
        setShow(false)
        setErrors({})
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

  const validateForm = (): true | FormErrors => {
    const newErrors: FormErrors = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'Заполните имя'
    if (!formData.lastName.trim()) newErrors.lastName = 'Заполните фамилию'
    if (!formData.phone.trim()) newErrors.phone = 'Укажите номер телефона'
    else if (!isValidRuPhone(formData.phone)) {
      newErrors.phone = 'Номер в формате +7 (900) 000-00-00'
    }
    // Для РФ Saleor часто принимает пустой регион; неверная строка даёт INVALID
    if (
      formData.country !== 'RU' &&
      !formData.countryArea.trim()
    ) {
      newErrors.countryArea = 'Обязательное поле'
    }
    if (!formData.city.trim()) newErrors.city = 'Заполните город'
    if (formData.country !== 'RU' && !formData.cityArea.trim()) {
      newErrors.cityArea = 'Обязательное поле'
    }
    if (!formData.streetAddress1.trim())
      newErrors.streetAddress1 = 'Заполните улицу и номер дома'
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Заполните почтовый индекс'
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
    return Object.keys(newErrors).length === 0 ? true : newErrors
  }

  const handleSubmit = async () => {
    console.log('--- Address Form Submit Data ---', formData)
    const validation = validateForm()
    if (validation !== true) {
      const message = Object.values(validation).join('. ')
      toast.error(message)
      return
    }

    setLoading(true)

    try {
      const metaPayload: VspAddressMeta = {
        carrier: deliveryService,
        ...(deliveryService === 'yandex' &&
        yandexPvzCoords &&
        Number.isFinite(yandexPvzCoords.lon) &&
        Number.isFinite(yandexPvzCoords.lat)
          ? { lon: yandexPvzCoords.lon, lat: yandexPvzCoords.lat }
          : {}),
        ...(deliveryService === 'yandex' && yandexPvzId?.trim()
          ? { yandexPvzId: yandexPvzId.trim() }
          : {}),
      }
      const streetAddress2WithMeta = buildStreetAddress2WithMeta(
        metaPayload,
        formData.streetAddress2,
      )

      const addressInput = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        country: formData.country,
        countryArea: formData.countryArea,
        city: formData.city,
        cityArea: formData.cityArea,
        streetAddress1: formData.streetAddress1,
        streetAddress2: streetAddress2WithMeta,
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
        // Новый адрес обычно последний в ответе Saleor; передаём полный список, чтобы родитель обновил список и выбрал новый (как с СДЭК)
        const newAddress = updatedAddresses[updatedAddresses.length - 1]
        onAddressAdded(newAddress, updatedAddresses)
        toast.success('Адрес успешно добавлен!')
      }

      onClose()

    } catch (error: any) {
      toast.error(`ОШИБКА: ${error.message || 'неизвестно'}`)
      console.error('Address operation error:', error)
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

  const handleCdekPvzChoose = (pvz: CdekPvzInfo) => {
    setYandexPvzCoords(null)
    setYandexPvzId(null)
    setFormData((prev) => ({
      ...prev,
      country: 'RU',
      countryArea: pvz.region || prev.countryArea,
      city: pvz.cityName || prev.city,
      cityArea: pvz.cityArea || prev.cityArea,
      streetAddress1: pvz.address || prev.streetAddress1,
      postalCode: pvz.postalCode ?? prev.postalCode,
    }))
    setErrors((prev) => ({
      ...prev,
      countryArea: '',
      city: '',
      streetAddress1: '',
      postalCode: '',
    }))
  }

  const handleYandexPvzChoose = (pvz: YandexPickupPoint) => {
    const city =
      pvz.address?.locality || pvz.address?.region || ''
    const inferredRegion = inferRuCountryAreaFromYandexPvz(pvz, city)

    const area = yandexPickupCityArea(pvz.address)

    setFormData((prev) => ({
      ...prev,
      country: 'RU',
      countryArea: inferredRegion || prev.countryArea,
      city: city || prev.city,
      cityArea: area || prev.cityArea,
      streetAddress1: pvz.address?.full_address || prev.streetAddress1,
      postalCode: pvz.address?.postal_code || prev.postalCode,
      companyName: pvz.name || prev.companyName,
    }))

    const cargoId = yandexPointIdForCargoOffers(pvz)
    setYandexPvzId(cargoId || null)

    if (
      pvz.position &&
      Number.isFinite(pvz.position.longitude) &&
      Number.isFinite(pvz.position.latitude)
    ) {
      setYandexPvzCoords({
        lon: pvz.position.longitude,
        lat: pvz.position.latitude,
      })
    } else {
      setYandexPvzCoords(null)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'
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
                className={`h-12 px-4 rounded-xl border text-base outline-none transition ${errors.firstName
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
                className={`h-12 px-4 rounded-xl border text-base outline-none transition ${errors.lastName
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
            placeholder="+7 (900) 000-00-00"
            showFormatHint={false}
          />

          {/* Доставка: выбор ПВЗ */}
          <div className="flex flex-col gap-3 p-4 border border-black/10 rounded-xl bg-gray-50/50">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-semibold">Пункты выдачи</h3>
                <p className="text-sm text-black/60">
                  Выберите пункт выдачи на карте или укажите адрес вручную
                </p>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-black/5 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setDeliveryService('cdek')
                  setYandexPvzCoords(null)
                  setYandexPvzId(null)
                }}
                className={`flex-1 h-10 rounded-lg text-sm font-semibold transition ${deliveryService === 'cdek' ? 'bg-white shadow-sm text-black' : 'text-black/40 hover:text-black/60'
                  }`}
              >
                СДЭК
              </button>
              <button
                type="button"
                onClick={() => setDeliveryService('yandex')}
                className={`flex-1 h-10 rounded-lg text-sm font-semibold transition ${deliveryService === 'yandex' ? 'bg-white shadow-sm text-black' : 'text-black/40 hover:text-black/60'
                  }`}
              >
                Яндекс
              </button>
            </div>

            <div className="mt-2 border border-black/10 rounded-xl p-3 bg-white max-h-[400px] overflow-y-auto min-h-[200px]">
              {deliveryService === 'cdek' ? (
                <CdekPvzList onChoose={handleCdekPvzChoose} />
              ) : (
                <YandexPvzList
                  onChoose={handleYandexPvzChoose}
                  defaultCity={formData.city?.trim() || 'Москва'}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2">
              Регион
              {formData.country === 'RU' && (
                <span className="font-normal text-black/50"> — для РФ можно оставить пустым</span>
              )}
            </label>
            <input
              type="text"
              value={formData.countryArea}
              onChange={(e) => handleInputChange('countryArea', e.target.value)}
              placeholder="Область, край"
              className={`h-12 px-4 rounded-xl border text-base outline-none transition ${errors.countryArea
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
                className={`h-12 px-4 rounded-xl border text-base outline-none transition ${errors.city
                  ? 'border-red-500'
                  : 'border-black/10 focus:border-black/30'
                  }`}
              />
              {errors.city && (
                <span className="text-red-500 text-sm mt-1">{errors.city}</span>
              )}
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium mb-2">
                Район
                {formData.country === 'RU' && (
                  <span className="font-normal text-black/50"> — необязательно</span>
                )}
              </label>
              <input
                type="text"
                value={formData.cityArea}
                onChange={(e) => handleInputChange('cityArea', e.target.value)}
                className={`h-12 px-4 rounded-xl border text-base outline-none transition ${errors.cityArea
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
              className={`h-12 px-4 rounded-xl border text-base outline-none transition ${errors.streetAddress1
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
              className={`h-12 px-4 rounded-xl border text-base outline-none transition ${errors.postalCode
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

          {
            !isEditMode && (
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
            )
          }
        </div >

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
      </motion.div >
    </div >
  )
}