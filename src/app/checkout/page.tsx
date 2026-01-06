'use client'

import OrderForm from '@/components/checkout/OrderForm'
import OrderSummary from '@/components/checkout/OrderSummary'
import OrderDelivery from '@/components/checkout/OrderDelivery'
import OrderPhone from '@/components/checkout/OrderPhone'
import PaymentBlock from '@/components/checkout/PaymentBlock'
import BackButton from '@/components/checkout/BackButton'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuth'
import { useRouter } from 'next/navigation'

const CheckoutPage = () => {
  const { isAuthenticated } = useAuthStore()
  const navigate = useRouter()
  useEffect(() => {
    if (!isAuthenticated) navigate.push('/login')
  }, [])

  return (
    <div className="flex pb-12">
      <div className="container px-4 sm:px-6 lg:px-0">
        {/* На мобилке сначала товары (OrderSummary), затем форма + доставка + телефон + оплата */}
        <div className="flex flex-col lg:flex-row-reverse gap-6 lg:gap-8">
          {/* Колонка с товарами / суммой заказа */}
          <div className="w-full lg:w-1/2 lg:sticky lg:top-24 lg:h-fit">
            <div className="bg-[#FAFAFA] p-4 sm:p-6 lg:p-8 rounded-lg">
              <OrderSummary />
            </div>
          </div>

          {/* Колонка с данными пользователя и оплатой */}
          <div className="w-full lg:w-1/2">
            <BackButton />
            <div className="border p-4 sm:p-6 lg:p-8 rounded-lg shadow-md mt-4 space-y-6">
              <OrderForm />
              <OrderDelivery />
              <OrderPhone />
              <PaymentBlock />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
