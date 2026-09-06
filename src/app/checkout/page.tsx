'use client'

import OrderForm from '@/components/checkout/OrderForm'
import OrderSummary from '@/components/checkout/OrderSummary'
import OrderDelivery from '@/components/checkout/OrderDelivery'
import OrderPhone from '@/components/checkout/OrderPhone'
import PaymentBlock from '@/components/checkout/PaymentBlock'
import BackButton from '@/components/checkout/BackButton'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/useAuth'
import { useRouter } from 'next/navigation'

const CheckoutPage = () => {
  const { isAuthenticated, checkAuth } = useAuthStore()
  const navigate = useRouter()
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let active = true
    void checkAuth().finally(() => {
      if (active) setAuthReady(true)
    })
    return () => {
      active = false
    }
  }, [checkAuth])

  useEffect(() => {
    if (!authReady) return
    if (!isAuthenticated) {
      navigate.push('/login?next=/checkout')
    }
  }, [authReady, isAuthenticated, navigate])

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflowX
    const prevBody = document.body.style.overflowX
    document.documentElement.style.overflowX = 'clip'
    document.body.style.overflowX = 'clip'
    return () => {
      document.documentElement.style.overflowX = prevHtml
      document.body.style.overflowX = prevBody
    }
  }, [])

  if (!authReady) {
    return (
      <div className="container px-4 sm:px-6 py-12 text-black/40">
        Загрузка...
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="w-full min-w-0 overflow-x-clip overscroll-x-none touch-pan-y pb-12">
      <div className="container w-full min-w-0 max-w-full px-4 sm:px-6 lg:px-0">
        <div className="flex flex-col lg:flex-row-reverse gap-6 lg:gap-8 min-w-0">
          <div className="w-full min-w-0 lg:w-1/2 lg:sticky lg:top-24 lg:h-fit">
            <div className="bg-[#FAFAFA] p-4 sm:p-6 lg:p-8 rounded-lg overflow-x-clip min-w-0">
              <OrderSummary />
            </div>
          </div>

          <div className="w-full min-w-0 lg:w-1/2">
            <BackButton />
            <div className="border p-4 sm:p-6 lg:p-8 rounded-lg shadow-md mt-4 space-y-6 overflow-x-clip min-w-0">
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
