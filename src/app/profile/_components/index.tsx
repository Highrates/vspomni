'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/useAuth'
import { useUserStore } from '@/stores/useUser'
import { useRouter } from 'next/navigation'
import IconThreeDots from '@/assets/icons/three-dots'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/profile-tabs'
import Image from 'next/image'
import OrdersTabs from './orders-tabs'

// --- Imports from OrderDelivery logic ---
import { getMeInfo } from '@/graphql/queries/auth.service'
import {
  deleteAddress,
  setDefaultAddress,
} from '@/graphql/queries/adress.service'
import { AddressInfo } from '@/graphql/types/auth.types'
import { toast } from 'react-toastify'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import AddressModal from '@/components/modals/AddressModal'
import PasswordChangeModal from '@/components/modals/PasswordChangeModal'
import ProductCard from '@/components/home/ProductCard'
import { usePopularScentsStore } from '@/stores/usePopularScents'
import { formatDate } from '@/lib/functions'

export default function ProfileIndex() {
  const { isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const { greed, fetchGrid } = usePopularScentsStore()

  const { user, fetchUser, setUser } = useUserStore()

  // --- Address Logic States ---
  const [addresses, setAddresses] = useState<AddressInfo[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [addressModalVisible, setAddressModalVisible] = useState(false)
  
  // State for holding the address being edited
  const [editingAddress, setEditingAddress] = useState<AddressInfo | null>(null)

  // --- Orders Logic States ---
  const [orders, setOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  // --- Password Change Modal State ---
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      await useAuthStore.getState().checkAuth()
    }
    checkAuth()
  }, [])

  // Fetch User Logic
  useEffect(() => {
    if (isAuthenticated) {
      fetchUser()
      fetchGrid()
    }
  }, [isAuthenticated])

  // Fetch Address Logic
  useEffect(() => {
    getMeInfo().then((data) => {
      setAddresses(data.addresses)
      setLoadingAddresses(false)
    })
  }, [])

  // Fetch Orders Logic
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true)
      console.log('Fetching orders...')
      
      // Используем REST эндпоинт для получения только оформленных заказов
      const baseUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL ?? ''
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.warn('No token found, skipping orders fetch')
        setOrders([])
        setLoadingOrders(false)
        return
      }
      
      console.log('Fetching orders from:', `${baseUrl}/auth/orders/`)
      
      const response = await fetch(`${baseUrl}/auth/orders/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      console.log('Orders response status:', response.status)
      
      const data = await response.json()
      console.log('Orders response data:', data)
      
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Ошибка при загрузке заказов')
      }
      
      // Преобразуем данные из REST API в формат компонента
      const transformedOrders = (data.orders || []).map((order: any) => {
        return {
          id: order.number || order.id,
          date: formatDate(order.created),
          status: order.statusDisplay || order.status,
          items: (order.lines || []).map((line: any, index: number) => {
            const unitPrice = line.unitPrice?.gross?.amount || 0
            const undiscountedPrice = line.undiscountedUnitPrice?.gross?.amount || unitPrice
            const variantName = line.variantName || '100 мл'
            
            // Если цены одинаковые, не показываем старую цену
            const hasDiscount = undiscountedPrice > unitPrice && unitPrice > 0
            
            return {
              id: index + 1,
              title: line.productName || 'Товар',
              volume: variantName,
              qty: line.quantity || 1,
              oldPrice: hasDiscount ? Math.round(undiscountedPrice / 100) : 0,
              price: Math.round(unitPrice / 100) || 0,
              img: line.thumbnail?.url || '/images/product1.png',
            }
          }),
        }
      })
      
      console.log('Transformed orders:', transformedOrders)
      setOrders(transformedOrders)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated])

  useEffect(() => {
    // Wait a bit for checkAuth to complete before redirecting
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.push('/login')
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [isAuthenticated, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUser({ ...user, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    try {
      const { updateAccount, getMeInfo } = await import('@/graphql/queries/auth.service')
      const { updateAddress } = await import('@/graphql/queries/adress.service')
      
      // Обновляем имя и фамилию
      await updateAccount(user.name, user.familyName)
      
      // Обновляем телефон в адресе (если есть адрес и он полный)
      if (user.phone) {
        if (addresses.length > 0) {
          const defaultAddress = addresses.find(
            (addr) => addr.isDefaultShippingAddress || addr.isDefaultBillingAddress
          ) || addresses[0]
          
          if (defaultAddress) {
            // Проверяем, что адрес полный (есть все обязательные поля)
            const hasRequiredFields = 
              defaultAddress.city && 
              defaultAddress.streetAddress1 && 
              defaultAddress.postalCode &&
              defaultAddress.country
            
            if (hasRequiredFields) {
              // Преобразуем country в строку, если это объект
              const countryCode = typeof defaultAddress.country === 'object' && defaultAddress.country !== null
                ? (defaultAddress.country as any).code
                : defaultAddress.country || 'RU' // По умолчанию Россия
              
              try {
                // Обновляем адрес с новым телефоном
                const updatedAddresses = await updateAddress(defaultAddress.id, {
                  firstName: defaultAddress.firstName,
                  lastName: defaultAddress.lastName,
                  phone: user.phone,
                  country: countryCode,
                  countryArea: defaultAddress.countryArea || '',
                  city: defaultAddress.city || '',
                  cityArea: defaultAddress.cityArea || '',
                  streetAddress1: defaultAddress.streetAddress1 || '',
                  streetAddress2: defaultAddress.streetAddress2 || '',
                  postalCode: defaultAddress.postalCode || '',
                  companyName: defaultAddress.companyName || '',
                })
                
                // Обновляем список адресов в компоненте с актуальными данными
                setAddresses(updatedAddresses)
                
                // Сразу обновляем телефон в локальном состоянии пользователя
                // чтобы он отображался правильно до следующего fetchUser
                const updatedDefaultAddress = updatedAddresses.find(
                  (addr) => addr.id === defaultAddress.id
                ) || updatedAddresses.find(
                  (addr) => addr.isDefaultShippingAddress || addr.isDefaultBillingAddress
                ) || updatedAddresses[0]
                
                // Сохраняем обновленный телефон из ответа updateAddress
                const savedPhone = updatedDefaultAddress?.phone || user.phone
                
                // Сразу обновляем телефон в локальном состоянии
                // Это важно - используем телефон из ответа updateAddress, а не ждем getMeInfo
                setUser({ ...user, phone: savedPhone })
                
                // Сохраняем флаг, что мы только что обновили адрес
                // чтобы не перезаписывать телефон старыми данными с бекенда
                const addressJustUpdated = true
                
                // Небольшая задержка, чтобы дать БД время обновиться
                await new Promise(resolve => setTimeout(resolve, 300))
                
                // Обновляем список адресов и данные пользователя с бекенда
                const meInfo = await getMeInfo()
                if (meInfo) {
                  // Обновляем список адресов с актуальными данными с бекенда
                  setAddresses(meInfo.addresses)
                  
                  // НО: используем телефон из updatedAddresses, который мы только что получили
                  // а не из meInfo, так как он может быть еще не обновлен
                  const finalPhone = savedPhone // Используем телефон из updateAddress
                  
                  // Обновляем данные пользователя с актуальным телефоном
                  setUser({
                    ...user,
                    name: meInfo.firstName || user.name,
                    familyName: meInfo.lastName || user.familyName,
                    phone: finalPhone, // Используем телефон из updateAddress
                  })
                } else {
                  // Если getMeInfo не вернул данные, просто обновляем пользователя
                  await fetchUser()
                }
              } catch (addressError: any) {
                // Если ошибка обновления адреса, не блокируем сохранение профиля
                console.warn('Не удалось обновить телефон в адресе:', addressError)
              }
            }
          }
        }
      }
      
      // Если адрес не обновлялся, просто обновляем данные с бекенда
      if (!user.phone || user.phone === '') {
        const meInfo = await getMeInfo()
        if (meInfo) {
          const defaultAddress = meInfo.addresses?.find(
            (addr) => addr.isDefaultShippingAddress || addr.isDefaultBillingAddress
          ) || meInfo.addresses?.[0]
          
          setUser({
            ...user,
            name: meInfo.firstName || user.name,
            familyName: meInfo.lastName || user.familyName,
            phone: defaultAddress?.phone || user.phone,
          })
        } else {
          await fetchUser()
        }
      }
      
      toast.success('Профиль успешно обновлен')
    } catch (error: any) {
      console.error('Update error:', error)
      let errorMessage = error.message || 'Ошибка при обновлении профиля'
      
      // Переводим ошибки на русский
      if (errorMessage.includes('required') || errorMessage.includes('обязательное')) {
        errorMessage = 'Заполните все обязательные поля'
      } else if (errorMessage.includes('address') && errorMessage.includes('required')) {
        errorMessage = 'Для сохранения телефона необходимо заполнить адрес доставки'
      }
      
      toast.error(errorMessage)
    }
  }

  // Handle new address added from Modal
  const handleAddressAdded = (newAddress: AddressInfo) => {
    setAddresses((prev) => [...prev, newAddress])
  }

  // Handle address deletion (passed down to AddressRow)
  const handleAddressDeleted = (id: string) => {
    setAddresses((prev) => prev.filter((addr) => addr.id !== id))
  }
  const handleAddressesUpdated = (updatedList: AddressInfo[]) => {
    setAddresses(updatedList)
  }

  // Open Edit Modal
  const handleOpenEdit = (address: AddressInfo) => {
    setEditingAddress(address)
    setAddressModalVisible(true)
  }

  // Handle Modal Close (Reset edit state)
  const handleModalClose = () => {
    setAddressModalVisible(false)
    // Small timeout to clear state after animation closes
    setTimeout(() => {
      setEditingAddress(null)
    }, 300)
  }

  // Handle Update Success
  const handleAddressUpdated = (updatedAddress: AddressInfo) => {
    setAddresses((prev) =>
      prev.map((addr) => (addr.id === updatedAddress.id ? updatedAddress : addr))
    )
  }

  return (
    <div className="relative min-h-screen -mt-40 sm:-mt-74 md:-mt-90 text-black overflow-x-hidden">
      {/* Header Section - White text for overlay header */}
      <section className="relative z-20 container mx-auto px-4 sm:px-6 md:px-8 pt-24 sm:pt-28 md:pt-40 pb-6 sm:pb-8 md:pb-12">
        {/* Empty header space for background image */}
      </section>

      <Tabs defaultValue="global-info" onValueChange={(value) => {
        // Перезагружаем заказы при переключении на вкладку "Заказы"
        if (value === 'my-orders' && isAuthenticated) {
          console.log('Switched to orders tab, fetching orders...')
          fetchOrders()
        }
      }}>
        {/* Main Content Container */}
        <section className="relative z-10 mt-2 sm:mt-10 container mx-auto px-2 sm:px-6 md:px-8 py-4 sm:py-6 md:py-12 flex flex-col lg:flex-row gap-4 sm:gap-8 lg:gap-24">
          {/* Sidebar / Navigation */}
          <aside className="border border-black rounded-t-2xl sm:rounded-2xl py-4 sm:py-6 md:py-8 w-full lg:w-[369px] px-3 sm:px-4 md:px-6 h-fit backdrop-blur-sm lg:sticky lg:top-24 bg-white/90 lg:bg-transparent -mt-4 sm:mt-0">
            <TabsList className="mt-1 md:mt-8 flex flex-col items-start gap-3 sm:gap-4 bg-transparent rounded-none px-0 max-md:h-auto">
              <TabsTrigger
                value="global-info"
                className="px-0 w-full justify-start cursor-pointer text-textgrey data-[state=active]:text-black rounded-none outline-none text-base sm:text-lg md:text-xl font-semibold shadow-none ring-0 bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:border-0 data-[state=active]:shadow-none hover:text-black transition-colors"
              >
                Общая информация
              </TabsTrigger>
              <TabsTrigger
                value="my-orders"
                className="px-0 w-full justify-start cursor-pointer text-textgrey data-[state=active]:text-black rounded-none outline-none text-base sm:text-lg md:text-xl font-semibold shadow-none ring-0 bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:border-0 data-[state=active]:shadow-none hover:text-black transition-colors"
              >
                Заказы
              </TabsTrigger>
              <TabsTrigger
                value="logout"
                className="px-0 w-full justify-start cursor-pointer text-textgrey data-[state=active]:text-black rounded-none outline-none text-base sm:text-lg md:text-xl font-semibold shadow-none ring-0 bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:border-0 data-[state=active]:shadow-none hover:text-black transition-colors"
              >
                Выйти
              </TabsTrigger>
            </TabsList>
            <div className="mt-8 md:mt-[55px] h-px bg-textgrey mb-6" />
            <div>
              <p className="text-sm text-textgrey mb-1">Нужна помощь?</p>
              <button className="text-md font-medium cursor-pointer hover:underline">
                Свяжитесь с нами
              </button>
            </div>
          </aside>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <TabsContent value="global-info" className="mt-0">
              <main>
                {/* Greeting moved here */}
                <h1 className="text-2xl sm:text-3xl md:text-3xl font-semibold mb-6 sm:mb-8 text-black">
                  Здравствуйте{user?.name ? ', ' + user.name : '!'}
                </h1>
                
                <div className="flex flex-col sm:flex-row justify-between mb-6 sm:mb-8 gap-4 sm:gap-0 sm:items-center">
                  <h2 className="text-xl sm:text-2xl font-semibold">Информация о вас</h2>
                  <button
                    type="button"
                    className="bg-black cursor-pointer text-white px-4 sm:px-6 rounded-full hover:bg-gray-900 transition h-9 sm:h-10 text-sm sm:text-md font-medium disabled:bg-gray-400 w-full sm:w-auto"
                    onClick={handleSave}
                    disabled={
                      !Boolean(user.name.length > 0 && user.email.length > 5)
                    }
                  >
                    Сохранить
                  </button>
                </div>

                <form className="space-y-4 sm:space-y-6 md:space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm mb-2.5 text-textgrey">
                        Имя
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={user.name}
                        onChange={handleChange}
                        className="w-full rounded-xl bg-[#fafafa] px-4 text-md font-medium py-2 border border-bordergrey outline-none focus:outline-none focus:ring-1 focus:ring-black transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2.5 text-textgrey">
                        Фамилия
                      </label>
                      <input
                        type="text"
                        name="familyName"
                        value={user.familyName}
                        onChange={handleChange}
                        className="w-full rounded-xl bg-[#F9F7F5] px-4 text-md font-medium py-2 border border-bordergrey outline-none focus:outline-none focus:ring-1 focus:ring-black transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm mb-2 sm:mb-2.5 text-textgrey">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={user.email}
                        onChange={handleChange}
                        className="w-full rounded-xl bg-[#fafafa] px-3 sm:px-4 text-sm sm:text-md font-medium py-2 border border-bordergrey outline-none focus:outline-none focus:ring-1 focus:ring-black transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm mb-2 sm:mb-2.5 text-textgrey">
                        Телефон
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={user.phone}
                        onChange={handleChange}
                        className="w-full rounded-xl bg-[#F9F7F5] px-3 sm:px-4 text-sm sm:text-md font-medium py-2 border border-bordergrey outline-none focus:outline-none focus:ring-1 focus:ring-black transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setPasswordModalVisible(true)}
                      className="text-md underline hover:text-black text-foreground font-medium"
                    >
                      Сменить пароль
                    </button>
                  </div>
                </form>

                <section className="mt-8 sm:mt-12 md:mt-16">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-semibold">Доставка</h2>
                    <button
                      onClick={() => setAddressModalVisible(true)}
                      className="border font-medium text-sm sm:text-md border-black cursor-pointer text-black px-3 sm:px-4 rounded-full transition hover:bg-black hover:text-white h-9 sm:h-10 w-full sm:w-fit"
                    >
                      + Новый адрес
                    </button>
                  </div>

                  <aside className="mt-6 flex flex-col gap-6">
                    {loadingAddresses ? (
                      <p className="text-black/40">Загрузка адресов...</p>
                    ) : addresses.length === 0 ? (
                      <p className="text-black/40">
                        У вас пока нет сохраненных адресов
                      </p>
                    ) : (
                      addresses.map((address) => (
                        <AddressRow
                          key={address.id}
                          address={address}
                          onDelete={handleAddressDeleted}
                          onUpdate={handleAddressesUpdated}
                          onEdit={() => handleOpenEdit(address)}
                        />
                      ))
                    )}
                  </aside>
                </section>

                <aside className="mt-8 sm:mt-12 md:mt-16">
                  <h2 className="text-xl sm:text-2xl font-semibold">
                    Кое что новое для вас
                  </h2>
                  <div className="mt-6 sm:mt-8 md:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-5">
                    {greed.slice(0, 4).map((product) => (
                      <ProductCard product={product} key={product.id} />
                    ))}
                  </div>
                </aside>
              </main>
            </TabsContent>

            <TabsContent value="my-orders" className="mt-0">
              {loadingOrders ? (
                <p className="text-black/40">Загрузка заказов...</p>
              ) : orders.length === 0 ? (
                <p className="text-black/40">У вас пока нет заказов</p>
              ) : (
                <OrdersTabs orders={orders} />
              )}
            </TabsContent>

            <TabsContent value="logout" className="mt-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="h-10 rounded-full border-black border px-9 hover:bg-black hover:text-white cursor-pointer transition-colors text-center flex items-center justify-center">
                  Назад
                </button>
                <button
                  onClick={logout}
                  className="h-10 rounded-full border-black border px-9 hover:bg-black hover:text-white cursor-pointer transition-colors text-center flex items-center justify-center"
                >
                  Выйти
                </button>
              </div>
            </TabsContent>
          </div>
        </section>
      </Tabs>

      {/* Address Modal with Props */}
      <AddressModal
        visible={addressModalVisible}
        onClose={handleModalClose}
        onAddressAdded={handleAddressAdded}
        onAddressUpdated={handleAddressUpdated}
        addressToEdit={editingAddress}
      />

      {/* Password Change Modal */}
      <PasswordChangeModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />
    </div>
  )
}

// --- Sub-Component: Address Row (Encapsulates Design & Delete Logic) ---

function AddressRow({
  address,
  onDelete,
  onUpdate,
  onEdit
}: {
  address: AddressInfo
  onDelete: (id: string) => void
  onUpdate: (updatedList: AddressInfo[]) => void
  onEdit: () => void
}) {
  const [openAlert, setOpenAlert] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleDelete = () => {
    deleteAddress(address.id).then(() => {
      toast.success('Адрес удален')
      getMeInfo().then((data) => onUpdate(data.addresses))

      setOpenAlert(false)
    })
  }
  const handleSetDefault = async () => {
    setIsUpdating(true)
    try {
      const updatedAddresses = await setDefaultAddress(address.id, 'SHIPPING')

      onUpdate(updatedAddresses)
      toast.success('Адрес установлен по умолчанию')
      setDropdownOpen(false)
    } catch (error: any) {
      console.error(error)
      toast.error('Не удалось установить адрес по умолчанию')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 border-b border-gray-100 pb-4 sm:border-none sm:pb-0 last:border-0">
      <hgroup className="max-w">
        <h4 className="text-md text-foreground font-medium">
          {address.companyName || `${address.firstName} ${address.lastName}`}
        </h4>
        <p className="text-textgrey text-sm">
          {address.countryArea ? `${address.countryArea}, ` : ''}
          {address.streetAddress1}
        </p>

        {/* Render Comment if exists (Logic from design) */}
        {address.streetAddress2 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <p className="text-textgrey text-sm">Комментарий:</p>{' '}
            <span className="font-medium text-sm">
              {address.streetAddress2}
            </span>
          </div>
        )}
      </hgroup>

      <div className="flex items-center justify-between sm:justify-start gap-2 mt-2 sm:mt-0">
        {/* Default Badge */}
        {address.isDefaultShippingAddress && (
          <p className="text-md font-medium text-foreground">по умолчанию</p>
        )}

        {/* Action Menu (Dropdown + Alert) */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer p-2 hover:bg-gray-100 rounded-full transition outline-none">
              <IconThreeDots />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="bottom"
            align="end"
            className=" border shadow-md rounded-md z-50 space-y-2 p-1"
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                setDropdownOpen(false)
                onEdit()
              }}
              className="cursor-pointer flex items-center justify-center gap-2 p-2 hover:bg-gray-100 rounded-md focus:bg-gray-100 focus:outline-none font-medium"
            >
              <span>Редактировать</span>
            </DropdownMenuItem>

            {!address.isDefaultShippingAddress && (
              <DropdownMenuItem
                disabled={isUpdating}
                onClick={(e) => {
                  e.preventDefault()
                  handleSetDefault()
                }}
                className="cursor-pointer flex items-center justify-center gap-2 p-2 hover:bg-gray-100 rounded-md focus:bg-gray-100 focus:outline-none"
              >
                <span>Сделать основным</span>
              </DropdownMenuItem>
            )}

            <button
              className="bg-red-50 text-red-700 hover:bg-red-100 flex p-2 rounded-md justify-center items-center gap-2 w-full text-sm font-medium transition-colors"
              onClick={() => {
                setDropdownOpen(false)
                setOpenAlert(true)
              }}
            >
              Удалить адрес
            </button>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={openAlert} onOpenChange={setOpenAlert}>
          <AlertDialogContent className="w-200 z-100 bg-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Вы абсолютно уверены?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие невозможно отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                className="bg-black text-white hover:bg-black/80"
                onClick={handleDelete}
              >
                Продолжать
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}