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
import { useCartStore } from '@/stores/useCart'
import {
  calculateDelivery,
  getCheapestOffer,
  parseYandexOfferPrice,
} from '@/lib/api/yandexDelivery'
import {
  parseVspAddressMeta,
  displayStreetAddress2Comment,
  formatDeliveryAddressSummary,
} from '@/lib/addressVspMeta'

export default function OrderDelivery() {
  const [selected, setSelected] = useState('')
  const [addresses, setAddresses] = useState<AddressInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressInfo | null>(null)
  const { items, setShippingPrice, setShippingLoading, setShippingCarrier } =
    useCartStore()

  const updateShippingPrice = async (address: AddressInfo) => {
    try {
      setShippingLoading(true)

      // Если нет города, не пытаемся считать
      if (!address.city) {
        console.warn('Skipping shipping calculation: City is missing')
        setShippingPrice(0)
        setShippingCarrier('yandex')
        return
      }

      // === Яндекс.Доставка (ПВЗ или курьер: offers + mode door|pvz) ===
      try {
        const { meta } = parseVspAddressMeta(address.streetAddress2 || '')
        const usePvz =
          meta?.dropoff === 'pvz' ||
          (meta?.dropoff !== 'courier' && Boolean(meta?.yandexPvzId?.trim()))
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
          setShippingCarrier('yandex')
          setShippingPrice(sum > 0 ? Math.round(sum) : 0)
          return
        }
      } catch (yErr) {
        console.error('Yandex shipping calculation failed:', yErr)
      }

      setShippingCarrier('yandex')
      setShippingPrice(0)
    } catch (e) {
      console.error('Failed to calculate shipping:', e)
      setShippingCarrier('yandex')
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
            Доставка Яндексом
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
            Доставка Яндексом
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