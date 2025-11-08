'use client'

import OrderForm from '@/components/checkout/OrderForm'
import OrderSummary from '@/components/checkout/OrderSummary'
import OrderDelivery from '@/components/checkout/OrderDelivery'
import OrderPhone from '@/components/checkout/OrderPhone'
import PaymentBlock from '@/components/checkout/PaymentBlock'
import BackButton from '@/components/checkout/BackButton'

const CheckoutPage = () => {
  return (
    <div className="flex pb-12">
      <div className="container px-0">
        <div className="flex ">
          <div className="w-1/2 container mx-auto">
            <BackButton />
            <div className="border p-4 rounded-lg shadow-md">
              <OrderForm />
              <OrderDelivery />
              <OrderPhone />
              <PaymentBlock />
            </div>
          </div>
          <div className="w-1/2 container mx-auto bg-[#FAFAFA]">
            <OrderSummary />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
