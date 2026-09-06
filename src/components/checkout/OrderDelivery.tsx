'use client'

import { getMeInfo } from '@/graphql/queries/auth.service'
import { AddressInfo } from '@/graphql/types/auth.types'
import { useEffect, useState } from 'react'
import AddressModal from '../modals/AddressModal'
import { Trash } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { deleteAddress } from '@/graphql/queries/adress.service'
import { toast } from 'react-toastify'
import { useCdek } from '@/stores/useCdek'
import { pickCdekCityForAddress, cleanRuPostalCode } from '@/lib/cdekCityPick'
import { filterCdekPvzTariffs, filterCdekCourierTariffs } from '@/lib/cdekPvzTariffs'
import type { CdekTariff } from '@/types/cdek'
import { useCartStore } from '@/stores/useCart'
import {
  calculateDelivery,
  getCheapestOffer,
  parseYandexOfferPrice,
} from '@/lib/api/yandexDelivery'
import {
  calculateOzonDelivery,
  calculateOzonDeliveryByAddress,
  parseOzonAmount,
} from '@/lib/api/ozonDelivery'
import {
  parseVspAddressMeta,
  getShippingCarrierFromAddress,
  displayStreetAddress2Comment,
  formatDeliveryAddressSummary,
} from '@/lib/addressVspMeta'
import { useUserStore } from '@/stores/useUser'
import { useCheckoutStore } from '@/stores/useCheckout'
import { formatPhoneInputValue } from '@/lib/ruPhone'
import { loadPersistedCheckoutDeliveryAddress } from '@/lib/checkout/deliveryAddress'

/** Подставляем имя/фамилию/телефон из адреса доставки в форму checkout */
function syncCheckoutUserFromAddress(addr: AddressInfo) {
  const { user, setUser } = useUserStore.getState()
  const first = addr.firstName?.trim() || ''
  const last = addr.lastName?.trim() || ''
  const phoneFromAddr = addr.phone?.trim()
    ? formatPhoneInputValue(addr.phone)
    : ''

  setUser({
    ...user,
    name: first || user.name || '',
    familyName: last || user.familyName || '',
    phone: user.phone?.trim() || phoneFromAddr || '',
  })
}

export default function OrderDelivery() {
  const [selected, setSelected] = useState('')
  const [addresses, setAddresses] = useState<AddressInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressInfo | null>(null)
  const { calculateDelivery: calculateCdek } = useCdek()
  const { items, setShippingPrice, setShippingLoading, setShippingCarrier, setShippingError, setShippingIsFree } =
    useCartStore()

  const failShipping = (
    message: string,
    carrier: 'cdek' | 'yandex' | 'ozon' | null,
  ) => {
    setShippingCarrier(carrier)
    setShippingError(message)
    setShippingIsFree(false)
    setShippingPrice(0)
  }

  const succeedShipping = (
    price: number,
    carrier: 'cdek' | 'yandex' | 'ozon',
  ) => {
    if (!Number.isFinite(price) || price < 0) {
      failShipping('Не удалось рассчитать стоимость доставки', carrier)
      return
    }
    setShippingCarrier(carrier)
    setShippingError(null)
    if (price === 0) {
      setShippingIsFree(true)
      setShippingPrice(0)
      return
    }
    setShippingIsFree(false)
    setShippingPrice(Math.round(price))
  }
  const setDeliveryAddress = useCheckoutStore((s) => s.setDeliveryAddress)

  const syncDeliveryAddress = (addr: AddressInfo) => {
    syncCheckoutUserFromAddress(addr)
    setDeliveryAddress(addr)
  }

  const updateShippingPrice = async (address: AddressInfo) => {
    const carrier = getShippingCarrierFromAddress(address.streetAddress2)
    try {
      setShippingLoading(true)
      setShippingError(null)

      // Если нет города, не пытаемся считать
      if (!address.city) {
        console.warn('Skipping shipping calculation: City is missing')
        failShipping('Укажите город в адресе доставки', carrier)
        return
      }

      // === Яндекс.Доставка (ПВЗ или курьер: offers + mode door|pvz) ===
      if (carrier === 'yandex') {
        try {
          const { meta } = parseVspAddressMeta(address.streetAddress2 || '')
          const usePvz =
            meta?.dropoff === 'pvz' ||
            (meta?.dropoff !== 'courier' &&
              Boolean(meta?.yandexPvzId?.trim()))
          const pvzId = usePvz ? meta?.yandexPvzId?.trim() : undefined
          const coords =
            meta?.lon != null &&
            meta?.lat != null &&
            Number.isFinite(meta.lon) &&
            Number.isFinite(meta.lat)
              ? ([meta.lon, meta.lat] as [number, number])
              : undefined
          const shipmentLines = items
            .filter((i) => i.product)
            .map((i) => ({
              quantity: i.quantity,
              weightKg: i.product.weight,
              lengthMm: i.product.length,
              widthMm: i.product.width,
              heightMm: i.product.height,
            }))
          const res = await calculateDelivery({
            city: address.city.trim(),
            fullname: address.streetAddress1,
            coordinates: coords,
            mode: usePvz && pvzId ? 'pvz' : 'door',
            ...(usePvz && pvzId ? { yandexPointId: pvzId } : {}),
            ...(shipmentLines.length > 0 ? { shipmentLines } : {}),
          })
          const allOffers = res.offers || []
          const positiveOffers = allOffers.filter(
            (o) => parseYandexOfferPrice(o.price?.total_price) > 0,
          )
          const cheapest = getCheapestOffer(
            positiveOffers.length > 0 ? positiveOffers : allOffers,
          )
          if (cheapest?.price?.total_price != null) {
            const sum = parseYandexOfferPrice(cheapest.price.total_price)
            succeedShipping(sum, 'yandex')
            return
          }
        } catch (yErr) {
          console.error('Yandex shipping calculation failed:', yErr)
        }
        failShipping('Не удалось рассчитать доставку Яндекс', 'yandex')
        return
      }

      // === Ozon Logistika (ПВЗ или курьер) ===
      if (carrier === 'ozon') {
        try {
          const { meta } = parseVspAddressMeta(address.streetAddress2 || '')
          const shipmentLines = items
            .filter((i) => i.product)
            .map((i) => ({
              quantity: i.quantity,
              weightKg: i.product.weight,
              lengthMm: i.product.length,
              widthMm: i.product.width,
              heightMm: i.product.height,
            }))
          const cartSubtotal = items.reduce(
            (sum, i) => sum + (i.product?.price || 0) * i.quantity,
            0,
          )
          const estimatedPrice = Math.max(1000, Math.round(cartSubtotal))

          const ozonPvzId = meta?.ozonPvzId?.trim()
          const isCourier = meta?.dropoff === 'courier'
          const isPvz =
            meta?.dropoff === 'pvz' ||
            (!isCourier && Boolean(ozonPvzId))

          // Не считаем, пока не выбран ПВЗ или полный адрес курьера
          if (isPvz) {
            if (!ozonPvzId) {
              failShipping('Выберите пункт выдачи Ozon', 'ozon')
              return
            }
            const res = await calculateOzonDelivery({
              deliveryVariantId: ozonPvzId,
              weightG: 0,
              estimatedPrice,
              ...(shipmentLines.length > 0 ? { shipmentLines } : {}),
            })
            const amount = parseOzonAmount(res.amount)
            succeedShipping(amount, 'ozon')
            return
          }

          if (isCourier) {
            const street = address.streetAddress1?.trim() || ''
            // Только city без улицы — ещё не адрес доставки
            if (street.length < 5) {
              failShipping('Укажите адрес доставки Ozon', 'ozon')
              return
            }
            const addrLine = [address.city?.trim(), street]
              .filter(Boolean)
              .join(', ')
            const res = await calculateOzonDeliveryByAddress({
              address: addrLine,
              estimatedPrice,
              ...(shipmentLines.length > 0 ? { shipmentLines } : {}),
            })
            const amount = parseOzonAmount(res.amount)
            succeedShipping(amount, 'ozon')
            return
          }

          failShipping('Выберите ПВЗ или адрес курьера Ozon', 'ozon')
          return
        } catch (ozErr) {
          console.error('Ozon shipping calculation failed:', ozErr)
        }
        failShipping('Не удалось рассчитать доставку Ozon', 'ozon')
        return
      }

      // === СДЭК — расчёт до ПВЗ ===
      const { getCities } = await import('@/lib/api/cdek')
      const cityQuery = address.city.trim()
      const postal = cleanRuPostalCode(address.postalCode)

      let cities = await getCities({
        city: cityQuery,
        country_codes: 'RU',
        size: 40,
        ...(postal ? { postal_code: postal } : {}),
      })

      if ((!cities || cities.length === 0) && postal) {
        cities = await getCities({
          city: cityQuery,
          country_codes: 'RU',
          size: 40,
        })
      }

      const pickedCity = cities?.length
        ? pickCdekCityForAddress(address, cities)
        : null

      if (pickedCity) {
        const toCityCode = pickedCity.code
        // Справочник СДЭК v2: Санкт-Петербург (склад отправителя)
        const FROM_CITY_CODE = 137

        const { meta } = parseVspAddressMeta(address.streetAddress2 || '')
        const isCdekCourier = meta?.dropoff === 'courier'

        // Подсчёт суммарного веса и габаритов из корзины
        // Fallback значения если габариты не указаны в товаре
        const DEFAULT_WEIGHT_G = 300 // 300 г
        const DEFAULT_L = 200 // 200 мм (20 см)
        const DEFAULT_W = 200 // 200 мм (20 см)
        const DEFAULT_H = 100 // 100 мм (10 см)

        let totalWeight = 0;
        let maxLength = DEFAULT_L;
        let maxWidth = DEFAULT_W;
        let totalHeight = 0;

        if (items && items.length > 0) {
          items.forEach(item => {
            const qty = item.quantity || 1;
            const product = item.product || {} as any;

            // Расчет веса (из Saleor приходит в кг, переводим в граммы)
            const w = typeof product.weight === 'number' ? product.weight * 1000 : DEFAULT_WEIGHT_G;
            // Габариты в мм, переводим в см для СДЭК ниже
            const l = typeof product.length === 'number' ? product.length : DEFAULT_L;
            const wth = typeof product.width === 'number' ? product.width : DEFAULT_W;
            const h = typeof product.height === 'number' ? product.height : DEFAULT_H;

            totalWeight += w * qty;
            maxLength = Math.max(maxLength, l);
            maxWidth = Math.max(maxWidth, wth);
            totalHeight += h * qty; // Для простоты складываем высоту каждой единицы товара (как коробки друг на друге)
          });
        } else {
          totalWeight = DEFAULT_WEIGHT_G;
          totalHeight = DEFAULT_H;
        }

        const cdekTariffs = await calculateCdek({
          fromCityCode: FROM_CITY_CODE,
          toCityCode,
          weight: Math.ceil(totalWeight), // Вес в граммах (округляем вверх)
          length: Math.ceil(maxLength / 10), // СДЭК принимает в см
          width: Math.ceil(maxWidth / 10), // СДЭК принимает в см
          height: Math.ceil(totalHeight / 10), // СДЭК принимает в см
          ...(isCdekCourier
            ? {
                toStreetAddress: address.streetAddress1?.trim(),
                toPostalCode: postal || undefined,
              }
            : {}),
        })

        if (cdekTariffs?.length > 0) {
          const filtered = isCdekCourier
            ? filterCdekCourierTariffs(cdekTariffs)
            : filterCdekPvzTariffs(cdekTariffs)
          const pool: CdekTariff[] =
            filtered.length > 0 ? filtered : cdekTariffs
          const positive = pool.filter((t) => Number(t.delivery_sum) > 0)
          const tariffPool = positive.length > 0 ? positive : pool
          const cheapest = tariffPool.reduce((min, t) =>
            Number(t.delivery_sum) < Number(min.delivery_sum) ? t : min,
            tariffPool[0],
          )
          const sum = Number(cheapest.delivery_sum)
          succeedShipping(sum, 'cdek')
          return
        }
      }

      console.warn('CDEK: no city or tariffs found for', address.city)
      failShipping('Не удалось рассчитать доставку СДЭК', 'cdek')
    } catch (e) {
      console.error('Failed to calculate shipping:', e)
      failShipping('Ошибка расчёта доставки. Попробуйте позже', carrier)
    } finally {
      setShippingLoading(false)
    }
  }

  useEffect(() => {
    getMeInfo()
      .then((data) => {
        if (data && data.addresses) {
          setAddresses(data.addresses)

          if (data.addresses.length > 0) {
            const persisted = loadPersistedCheckoutDeliveryAddress()
            const persistedMatch = persisted
              ? data.addresses.find((a: AddressInfo) => a.id === persisted.id)
              : null
            const def = data.addresses.find(
              (a: AddressInfo) => a.isDefaultShippingAddress,
            )
            const currentAddr = persistedMatch || def || data.addresses[0]
            setSelected(currentAddr.id)
            syncDeliveryAddress(currentAddr)
            console.log('Calculating shipping for initial address:', currentAddr.city)
            updateShippingPrice(currentAddr)
          }
        }
      })
      .catch((error) => {
        console.error('Error fetching user info:', error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, []) // Загрузка адресов только при старте

  // Перерасчет доставки при изменении товаров в корзине
  useEffect(() => {
    if (selected && addresses.length > 0) {
      const currentAddr = addresses.find((a: AddressInfo) => a.id === selected)
      if (currentAddr) {
        // Дебаунс можно было бы добавить, но пока вызываем сразу
        updateShippingPrice(currentAddr)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const handleAddressSelect = (id: string) => {
    setSelected(id)
    const addr = addresses.find(a => a.id === id)
    if (addr) {
      syncDeliveryAddress(addr)
      updateShippingPrice(addr)
    }
  }

  const handleAddressAdded = (newAddress: AddressInfo, updatedList?: AddressInfo[]) => {
    if (updatedList?.length) {
      setAddresses(updatedList)
    } else {
      setAddresses((prev) => [...prev, newAddress])
    }
    setSelected(newAddress.id)
    syncDeliveryAddress(newAddress)
    updateShippingPrice(newAddress)
  }

  const handleAddressUpdated = (updatedAddress: AddressInfo) => {
    setAddresses(prev =>
      prev.map(addr => (addr.id === updatedAddress.id ? updatedAddress : addr)),
    )
    if (selected === updatedAddress.id) {
      syncDeliveryAddress(updatedAddress)
      updateShippingPrice(updatedAddress)
    }
  }

  const handleOpenEdit = (address: AddressInfo) => {
    setEditingAddress(address)
    setModalVisible(true)
  }

  const handleDeleteAddress = () => {
    deleteAddress(selected).then(() => {
      toast.success('Адрес удален')
      setAddresses(prev => {
        const remaining = prev.filter(addr => addr.id !== selected)
        if (remaining.length > 0) {
          const def =
            remaining.find(a => a.isDefaultShippingAddress) || remaining[0]
          setSelected(def.id)
          syncCheckoutUserFromAddress(def)
        } else {
          setSelected('')
        }
        return remaining
      })
    })
  }

  if (loading) {
    return (
      <section className="select-none">
        <div className="mb-6 sm:mb-8 md:mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-[32px] leading-tight font-semibold mb-4 sm:mb-5 md:mb-6">
            Доставка
          </h2>
          <p className="text-black/40 text-sm sm:text-base">Загрузка...</p>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="select-none">
        <div className="mb-6 sm:mb-8 md:mb-10 min-w-0">
          <h2 className="text-2xl sm:text-3xl md:text-[32px] leading-tight font-semibold mb-4 sm:mb-5 md:mb-6">
            Доставка
          </h2>

          {addresses.length === 0 ? (
            <p className="text-black/40 mb-6">
              У вас пока нет сохраненных адресов доставки
            </p>
          ) : (
            <ul className="space-y-4 sm:space-y-5 md:space-y-6 mb-4 sm:mb-5 md:mb-6">
              {addresses.map((address) => {
                const addrComment = displayStreetAddress2Comment(
                  address.streetAddress2,
                )
                return (
                <li key={address.id} className="relative">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => handleAddressSelect(address.id)}
                      className="min-w-0 flex-1 text-left flex items-start sm:items-center gap-2 sm:gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                    >
                      <span
                        className={`mt-1 sm:mt-0 inline-flex h-4 w-4 sm:h-5 sm:w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          selected === address.id
                            ? 'border-[#2688EB] bg-[#2688EB]'
                            : 'border-black/25 bg-transparent'
                        }`}
                      >
                        {selected === address.id ? (
                          <svg
                            viewBox="0 0 20 20"
                            className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 fill-white"
                          >
                            <path d="M7.6 14.2 3.8 10.4l1.4-1.4 2.4 2.4L14.8 4.8l1.4 1.4-8.6 8z" />
                          </svg>
                        ) : null}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-[15px] md:text-[16px] leading-5 sm:leading-6 font-medium">
                          {address.firstName} {address.lastName}
                        </div>
                        <div className="text-xs sm:text-[13px] md:text-[14px] leading-5 sm:leading-6 text-black/50 break-words">
                          {formatDeliveryAddressSummary(address)}
                          {address.companyName ? ` · ${address.companyName}` : ''}
                        </div>
                        {addrComment ? (
                          <div className="text-xs sm:text-[13px] md:text-[14px] leading-5 sm:leading-6 text-black/40">
                            <span>Комментарий: </span>
                            <span className="text-black font-medium">
                              {addrComment}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </button>

                    <AddressOptions
                      onDelete={handleDeleteAddress}
                      onEdit={() => handleOpenEdit(address)}
                    />
                  </div>
                </li>
              )})}
            </ul>
          )}

          <button
            type="button"
            onClick={() => setModalVisible(true)}
            className="w-full h-10 sm:h-11 rounded-full border border-black text-sm sm:text-[15px] md:text-[16px] font-semibold hover:bg-black/[0.03] transition"
          >
            + Новый адрес
          </button>
        </div>
      </section>

      <AddressModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false)
          setEditingAddress(null)
        }}
        onAddressAdded={handleAddressAdded}
        onAddressUpdated={handleAddressUpdated}
        addressToEdit={editingAddress}
      />
    </>
  )
}
function AddressOptions({
  onDelete,
  onEdit,
}: {
  onDelete: () => void
  onEdit: () => void
}) {
  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <div className="mt-1 ml-2 inline-flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-[#FAFAFA] hover:bg-black/4 border border-black/20 relative cursor-pointer">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-black">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="bottom"
          align="end"
          collisionPadding={12}
          className="p-2 bg-white border space-y-1 max-w-[calc(100vw-1.5rem)]"
        >
          <button
            className="flex items-center gap-2 w-full px-2 py-1 rounded-sm hover:bg-gray-100 text-sm"
            onClick={() => {
              setDropdownOpen(false)
              onEdit()
            }}
          >
            <span>Редактировать</span>
          </button>
          <button
            className="bg-red-700 text-white flex p-1 rounded-sm items-center gap-2 w-full text-sm"
            onClick={() => {
              setDropdownOpen(false)
              setOpen(true)
            }}
          >
            <Trash className="w-4 h-4" />
            Удалить адрес
          </button>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className='max-w-[400px] z-100'>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы абсолютно уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие невозможно отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Продолжать</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}