'use client'

import Image from 'next/image'
import { useState } from 'react'

type OrderItem = {
  id: number
  title: string
  volume: string
  qty: number
  oldPrice: number
  price: number
  img: string
}

type Order = {
  id: string
  date: string
  status: string
  items: OrderItem[]
}

interface Props {
  orders: Order[]
}

export default function OrdersTabs({ orders }: Props) {
  const [activeTab, setActiveTab] = useState<'all' | 'active'>('all')

  // Активные заказы - это те, у которых статус НЕ "Доставлено" (FULFILLED)
  const filteredOrders =
    activeTab === 'active'
      ? orders.filter((o) => o.status !== 'Доставлено' && o.status !== 'FULFILLED')
      : orders

  const activeOrdersCount = orders.filter((o) => o.status !== 'Доставлено' && o.status !== 'FULFILLED').length

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-14 mb-6 sm:mb-8">
        <button
          className={`cursor-pointer relative font-semibold text-xl sm:text-2xl whitespace-nowrap ${
            activeTab === 'all' ? 'text-black' : 'text-textgrey'
          }`}
          onClick={() => setActiveTab('all')}
        >
          Все заказы{' '}
          <span
            className={`absolute top-0 left-full ml-2 font-normal text-sm whitespace-nowrap ${activeTab === 'all' ? 'text-black' : 'text-textgrey'}`}
          >
            ({orders.length})
          </span>
        </button>
        <button
          className={`cursor-pointer relative font-semibold text-xl sm:text-2xl whitespace-nowrap text-right ${
            activeTab === 'active' ? 'text-black' : 'text-textgrey'
          }`}
          onClick={() => setActiveTab('active')}
        >
          Активные заказы
          <span
            className={`absolute top-0 left-full ml-2 font-normal text-sm whitespace-nowrap ${activeTab === 'active' ? 'text-black' : 'text-textgrey'}`}
          >
            ({activeOrdersCount})
          </span>
        </button>
      </div>

      {/* Orders */}
      <div className="space-y-8">
        {filteredOrders.length === 0 ? (
          <p className="text-black/40 text-center py-10">
            {activeTab === 'active' 
              ? 'У вас нет активных заказов' 
              : 'У вас пока нет заказов'}
          </p>
        ) : (
          filteredOrders.map((order) => (
          <div key={order.id} className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="font-semibold text-black text-xl">{order.date}</p>
                <p className="text-textgrey text-sm">{order.id}</p>
              </div>
              <span className="font-semibold text-xl text-black">
                {order.status}
              </span>
            </div>

            <div className="space-y-2.5">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-end justify-between border border-black rounded-2xl p-3 "
                >
                  <div className="flex gap-4">
                    <div className="relative w-26 h-26 shrink-0 rounded-xl overflow-hidden">
                      <Image
                        src={item.img}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-between py-2">
                      <hgroup className="flex flex-col">
                        <p className="font-semibold text-xl text-black">
                          {item.title}
                        </p>
                        <p className="text-sm">{item.volume}</p>
                      </hgroup>
                      <p className="text-xl font-semibold">{item.qty} шт.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xl font-semibold">
                    {item.oldPrice > 0 && item.oldPrice > item.price && (
                      <p className="text-textgrey line-through">
                        {item.oldPrice.toLocaleString()} ₽
                      </p>
                    )}
                    <p className="text-black">
                      {item.price.toLocaleString()} ₽
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          ))
        )}
      </div>
    </>
  )
}
