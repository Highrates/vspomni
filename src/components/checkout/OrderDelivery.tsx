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
import { calculateDelivery as calculateYandex } from '@/lib/api/yandexDelivery'
import { useCdek } from '@/stores/useCdek'
import { useCartStore } from '@/stores/useCart'
// Яндекс-доставка/ПВЗ теперь используется для расчета стоимости

export default function OrderDelivery() {
  const [selected, setSelected] = useState('')
  const [addresses, setAddresses] = useState<AddressInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressInfo | null>(null)
  const { calculateDelivery: calculateCdek } = useCdek()
  const { items, setShippingPrice, setShippingLoading } = useCartStore()

  const updateShippingPrice = async (address: AddressInfo) => {
    try {
      setShippingLoading(true)

      // Если нет города, не пытаемся считать
      if (!address.city) {
        console.warn('Skipping shipping calculation: City is missing')
        setShippingPrice(0)
        return
      }

      // === СДЭК — основной расчёт доставки ===
      console.log('Calculating CDEK shipping for city:', address.city)
      const { getCities } = await import('@/lib/api/cdek')
      const cities = await getCities({ city: address.city, country_codes: 'RU', size: 5 })

      if (cities?.length > 0) {
        const toCityCode = cities[0].code
        const FROM_SPB_CODE = 137 // Код Санкт-Петербурга в СДЭК (склад)

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
          fromCityCode: FROM_SPB_CODE,
          toCityCode,
          weight: Math.ceil(totalWeight), // Вес в граммах (округляем вверх)
          length: Math.ceil(maxLength / 10), // СДЭК принимает в см
          width: Math.ceil(maxWidth / 10), // СДЭК принимает в см
          height: Math.ceil(totalHeight / 10), // СДЭК принимает в см
        })

        if (cdekTariffs?.length > 0) {
          const cheapest = cdekTariffs.reduce((min: any, t: any) =>
            t.delivery_sum < min.delivery_sum ? t : min, cdekTariffs[0])
          console.log('CDEK shipping price:', cheapest.delivery_sum, '₽, tariff:', cheapest.tariff_name || cheapest.tariff_code, 'weight:', totalWeight)
          setShippingPrice(cheapest.delivery_sum)
          return
        }
      }

      console.warn('CDEK: no city or tariffs found for', address.city)
      setShippingPrice(0)
    } catch (e) {
      console.error('Failed to calculate shipping:', e)
      setShippingPrice(0)
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
            const def = data.addresses.find((a: AddressInfo) => a.isDefaultShippingAddress)
            const id = def?.id || data.addresses[0].id
            setSelected(id)

            // Также рассчитаем доставку для адреса по умолчанию при загрузке
            const currentAddr = data.addresses.find((a: AddressInfo) => a.id === id) || data.addresses[0]
            if (currentAddr) {
              console.log('Calculating shipping for initial address:', currentAddr.city)
              updateShippingPrice(currentAddr)
            }
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
    updateShippingPrice(newAddress)
  }

  const handleAddressUpdated = (updatedAddress: AddressInfo) => {
    setAddresses(prev =>
      prev.map(addr => (addr.id === updatedAddress.id ? updatedAddress : addr)),
    )
    if (selected === updatedAddress.id) {
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
        <div className="mb-10">
          <h2 className="text-[32px] leading-tight font-semibold mb-6">
            Доставка
          </h2>

          {addresses.length === 0 ? (
            <p className="text-black/40 mb-6">
              У вас пока нет сохраненных адресов доставки
            </p>
          ) : (
            <ul className="space-y-4 sm:space-y-5 md:space-y-6 mb-4 sm:mb-5 md:mb-6">
              {addresses.map((address) => (
                <li key={address.id} className="relative">
                  <button
                    type="button"
                    onClick={() => handleAddressSelect(address.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                      <span className="mt-1 sm:mt-0 inline-flex h-4 w-4 sm:h-5 sm:w-5 shrink-0 items-center justify-center rounded-full bg-[#2688EB]">
                        {selected === address.id ? (
                          <svg
                            viewBox="0 0 20 20"
                            className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 fill-white"
                          >
                            <path d="M7.6 14.2 3.8 10.4l1.4-1.4 2.4 2.4L14.8 4.8l1.4 1.4-8.6 8z" />
                          </svg>
                        ) : (
                          <span className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-white/30" />
                        )}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-[15px] md:text-[16px] leading-5 sm:leading-6 font-medium">
                          {address.firstName} {address.lastName}
                        </div>
                        <div className="text-xs sm:text-[13px] md:text-[14px] leading-5 sm:leading-6 text-black/40 break-words">
                          {address.countryArea}{address.city ? `, ${address.city}` : ''}{address.cityArea ? `, ${address.cityArea}` : ''}, {address.streetAddress1}
                          {address.companyName ? `, ${address.companyName}` : ''}
                        </div>
                        {address.streetAddress2 && (
                          <div className="text-xs sm:text-[13px] md:text-[14px] leading-5 sm:leading-6 text-black/40">
                            <span>Комментарий: </span>
                            <span className="text-black font-medium">
                              {address.streetAddress2}
                            </span>
                          </div>
                        )}
                      </div>

                      <AddressOptions
                        onDelete={handleDeleteAddress}
                        onEdit={() => handleOpenEdit(address)}
                      />
                    </div>
                  </button>
                </li>
              ))}
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

        <DropdownMenuContent side="right" className="p-2 bg-white border space-y-1">
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