import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  CdekCity,
  CdekDeliveryPoint,
  CdekTariff,
  CdekOrderResponse,
  CDEK_TARIFFS,
} from '@/types/cdek'

// ============================================
// CDEK Store - Управление данными доставки СДЭК
// ============================================

interface CdekDeliveryInfo {
  cityCode: number
  cityName: string
  deliveryPoint?: CdekDeliveryPoint
  tariff?: CdekTariff
  tariffCode: number
  deliverySum: number
  periodMin: number
  periodMax: number
}

interface CdekOrderInfo {
  uuid: string
  cdekNumber?: string
  imNumber?: string
  status?: string
  createdAt: string
}

interface CdekState {
  // Выбранный город
  selectedCity: CdekCity | null
  
  // Выбранный пункт выдачи
  selectedDeliveryPoint: CdekDeliveryPoint | null
  
  // Выбранный тариф
  selectedTariff: CdekTariff | null
  
  // Доступные тарифы
  availableTariffs: CdekTariff[]
  
  // Информация о доставке для текущего заказа
  deliveryInfo: CdekDeliveryInfo | null
  
  // История заказов СДЭК
  orders: CdekOrderInfo[]
  
  // Загрузка
  isCalculating: boolean
  isCreatingOrder: boolean
  
  // Ошибки
  error: string | null
  
  // Actions
  setSelectedCity: (city: CdekCity | null) => void
  setSelectedDeliveryPoint: (point: CdekDeliveryPoint | null) => void
  setSelectedTariff: (tariff: CdekTariff | null) => void
  setAvailableTariffs: (tariffs: CdekTariff[]) => void
  setDeliveryInfo: (info: CdekDeliveryInfo | null) => void
  addOrder: (order: CdekOrderInfo) => void
  updateOrder: (uuid: string, updates: Partial<CdekOrderInfo>) => void
  setCalculating: (value: boolean) => void
  setCreatingOrder: (value: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  selectedCity: null,
  selectedDeliveryPoint: null,
  selectedTariff: null,
  availableTariffs: [],
  deliveryInfo: null,
  orders: [],
  isCalculating: false,
  isCreatingOrder: false,
  error: null,
}

export const useCdekStore = create<CdekState>()(
  persist(
    (set) => ({
      ...initialState,

      setSelectedCity: (city) => set({ selectedCity: city, error: null }),
      
      setSelectedDeliveryPoint: (point) => set({ selectedDeliveryPoint: point, error: null }),
      
      setSelectedTariff: (tariff) => set({ 
        selectedTariff: tariff,
        deliveryInfo: tariff ? {
          cityCode: 0,
          cityName: '',
          tariff,
          tariffCode: tariff.tariff_code,
          deliverySum: tariff.delivery_sum,
          periodMin: tariff.period_min,
          periodMax: tariff.period_max,
        } : null,
        error: null,
      }),
      
      setAvailableTariffs: (tariffs) => set({ availableTariffs: tariffs, error: null }),
      
      setDeliveryInfo: (info) => set({ deliveryInfo: info, error: null }),
      
      addOrder: (order) => set((state) => ({
        orders: [...state.orders, order],
        error: null,
      })),
      
      updateOrder: (uuid, updates) => set((state) => ({
        orders: state.orders.map((order) =>
          order.uuid === uuid ? { ...order, ...updates } : order
        ),
      })),
      
      setCalculating: (value) => set({ isCalculating: value }),
      
      setCreatingOrder: (value) => set({ isCreatingOrder: value }),
      
      setError: (error) => set({ error }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'cdek-storage',
      partialize: (state) => ({
        orders: state.orders,
        selectedCity: state.selectedCity,
      }),
    }
  )
)

// ============================================
// Хук для работы с СДЭК
// ============================================

import {
  getCities,
  getDeliveryPoints,
  calculateTariffList,
  calculateTariff,
  createOrder,
  getOrder,
  deleteOrder,
  refuseOrder,
  createShopOrder,
  trackOrder,
} from '@/lib/api/cdek'
import type { CdekOrderRequest, CdekCalculatorRequest } from '@/types/cdek'

export function useCdek() {
  const store = useCdekStore()

  /**
   * Загрузить города
   */
  const loadCities = async (countryCode = 'RU', size = 10000) => {
    try {
      const cities = await getCities({ country_codes: countryCode, size })
      return cities.sort((a, b) => a.city.localeCompare(b.city, 'ru'))
    } catch (error) {
      store.setError('Ошибка загрузки городов')
      throw error
    }
  }

  /**
   * Загрузить пункты выдачи для города
   */
  const loadDeliveryPoints = async (cityCode: number) => {
    try {
      const points = await getDeliveryPoints({ city_code: cityCode, size: 100 })
      return points
    } catch (error) {
      store.setError('Ошибка загрузки пунктов выдачи')
      throw error
    }
  }

  /**
   * Рассчитать стоимость доставки
   */
  const calculateDelivery = async (params: {
    fromCityCode: number
    toCityCode: number
    weight: number
    length?: number
    width?: number
    height?: number
  }) => {
    store.setCalculating(true)
    store.setError(null)

    try {
      const request: CdekCalculatorRequest = {
        type: 1,
        currency: 1,
        from_location: { code: params.fromCityCode },
        to_location: { code: params.toCityCode },
        packages: [{
          weight: params.weight,
          length: params.length || 20,
          width: params.width || 20,
          height: params.height || 10,
        }],
      }

      const result = await calculateTariffList(request)
      const tariffs = result.tariff_codes || []
      
      store.setAvailableTariffs(tariffs)

      // Автоматически выбираем самый дешёвый тариф
      if (tariffs.length > 0) {
        const cheapest = tariffs.reduce((min, t) => 
          t.delivery_sum < min.delivery_sum ? t : min, tariffs[0])
        store.setSelectedTariff(cheapest)
      }

      return tariffs
    } catch (error) {
      store.setError('Ошибка расчета стоимости доставки')
      throw error
    } finally {
      store.setCalculating(false)
    }
  }

  /**
   * Рассчитать доставку по конкретному тарифу
   */
  const calculateByTariff = async (params: {
    fromCityCode: number
    toCityCode: number
    weight: number
    tariffCode: number
    length?: number
    width?: number
    height?: number
  }) => {
    store.setCalculating(true)
    store.setError(null)

    try {
      const request: CdekCalculatorRequest & { tariff_code: number } = {
        type: 1,
        currency: 1,
        tariff_code: params.tariffCode,
        from_location: { code: params.fromCityCode },
        to_location: { code: params.toCityCode },
        packages: [{
          weight: params.weight,
          length: params.length || 20,
          width: params.width || 20,
          height: params.height || 10,
        }],
      }

      return await calculateTariff(request)
    } catch (error) {
      store.setError('Ошибка расчета стоимости')
      throw error
    } finally {
      store.setCalculating(false)
    }
  }

  /**
   * Создать заказ на доставку
   */
  const createDeliveryOrder = async (params: {
    orderNumber: string
    tariffCode?: number
    deliveryPointCode?: string
    recipient: {
      name: string
      phone: string
      email?: string
    }
    address: {
      cityCode: number
      address: string
      postalCode?: string
    }
    items: Array<{
      name: string
      sku: string
      price: number
      weight: number
      quantity: number
    }>
    comment?: string
  }) => {
    store.setCreatingOrder(true)
    store.setError(null)

    try {
      const result = await createShopOrder({
        ...params,
        tariffCode: params.tariffCode || store.selectedTariff?.tariff_code || CDEK_TARIFFS.WAREHOUSE_TO_PVZ,
        deliveryPointCode: params.deliveryPointCode || store.selectedDeliveryPoint?.code,
      })

      if (result.entity?.uuid) {
        store.addOrder({
          uuid: result.entity.uuid,
          cdekNumber: result.entity.cdek_number,
          imNumber: params.orderNumber,
          createdAt: new Date().toISOString(),
        })
      }

      return result
    } catch (error) {
      store.setError('Ошибка создания заказа')
      throw error
    } finally {
      store.setCreatingOrder(false)
    }
  }

  /**
   * Получить информацию о заказе
   */
  const getOrderInfo = async (uuid: string) => {
    try {
      return await getOrder(uuid)
    } catch (error) {
      store.setError('Ошибка получения информации о заказе')
      throw error
    }
  }

  /**
   * Отследить заказ
   */
  const track = async (identifier: string) => {
    try {
      return await trackOrder(identifier)
    } catch (error) {
      store.setError('Ошибка отслеживания заказа')
      throw error
    }
  }

  /**
   * Удалить заказ
   */
  const cancelOrder = async (uuid: string) => {
    try {
      const result = await deleteOrder(uuid)
      store.updateOrder(uuid, { status: 'DELETED' })
      return result
    } catch (error) {
      store.setError('Ошибка удаления заказа')
      throw error
    }
  }

  /**
   * Отказаться от заказа
   */
  const refuse = async (uuid: string) => {
    try {
      const result = await refuseOrder(uuid)
      store.updateOrder(uuid, { status: 'REFUSED' })
      return result
    } catch (error) {
      store.setError('Ошибка отказа от заказа')
      throw error
    }
  }

  return {
    // State
    ...store,
    
    // Actions
    loadCities,
    loadDeliveryPoints,
    calculateDelivery,
    calculateByTariff,
    createDeliveryOrder,
    getOrderInfo,
    track,
    cancelOrder,
    refuse,
  }
}

export { CDEK_TARIFFS }

