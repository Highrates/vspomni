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

export default function OrderDelivery() {
  const [selected, setSelected] = useState('')
  const [addresses, setAddresses] = useState<AddressInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressInfo | null>(null)
  useEffect(() => {
    getMeInfo()
      .then((data) => {
        if (data && data.addresses) {
          setAddresses(data.addresses)
          
          if (data.addresses.length > 0) {
            const def = data.addresses.find((a) => a.isDefaultShippingAddress)
            setSelected(def?.id || data.addresses[0].id)
          }
        }
      })
      .catch((error) => {
        console.error('Error fetching user info:', error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleAddressAdded = (newAddress: AddressInfo) => {
    setAddresses((prev) => [...prev, newAddress])
    setSelected(newAddress.id)
  }

  const handleAddressUpdated = (updatedAddress: AddressInfo) => {
    setAddresses(prev =>
      prev.map(addr => (addr.id === updatedAddress.id ? updatedAddress : addr)),
    )
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
        // выбираем первый оставшийся адрес, если есть
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
                    onClick={() => setSelected(address.id)}
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
                          {address.firstName } {address.lastName}
                        </div>
                        <div className="text-xs sm:text-[13px] md:text-[14px] leading-5 sm:leading-6 text-black/40 break-words">
                          {address.countryArea}, {address.streetAddress1}, {address.companyName}
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