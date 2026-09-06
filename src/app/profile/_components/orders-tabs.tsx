'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { isActiveOrderStatus, orderStatusBadgeClass } from '@/lib/order/status'
import type { OrderListItem, OrdersPagination } from '@/lib/order/types'

interface Props {
  orders: OrderListItem[]
  pagination: OrdersPagination
  onPageChange: (page: number) => void
  loading?: boolean
}

function OrderItemsList({ items }: { items: OrderListItem['items'] }) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-end justify-between border border-black rounded-2xl p-3"
        >
          <div className="flex gap-4 min-w-0">
            <div className="relative w-24 h-24 sm:w-26 sm:h-26 shrink-0 rounded-xl overflow-hidden">
              <Image src={item.img} alt={item.title} fill className="object-cover" />
            </div>
            <div className="flex flex-col justify-between py-2 min-w-0">
              <hgroup className="flex flex-col">
                <p className="font-semibold text-base sm:text-xl text-black truncate">
                  {item.title}
                </p>
                {item.volume ? <p className="text-sm text-black/60">{item.volume}</p> : null}
              </hgroup>
              <p className="text-base sm:text-xl font-semibold">{item.qty} шт.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-base sm:text-xl font-semibold shrink-0 ml-3">
            {item.oldPrice > 0 && item.oldPrice > item.price ? (
              <p className="text-textgrey line-through">{item.oldPrice.toLocaleString('ru-RU')} ₽</p>
            ) : null}
            <p className="text-black">{item.price.toLocaleString('ru-RU')} ₽</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function OrdersTabs({
  orders,
  pagination,
  onPageChange,
  loading = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<'all' | 'active'>('all')

  const filteredOrders =
    activeTab === 'active'
      ? orders.filter((o) => isActiveOrderStatus(o.statusCode))
      : orders

  const activeOrdersOnPage = orders.filter((o) => isActiveOrderStatus(o.statusCode)).length

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-14 mb-6 sm:mb-8">
        <button
          type="button"
          className={`cursor-pointer relative font-semibold text-lg sm:text-2xl whitespace-nowrap ${
            activeTab === 'all' ? 'text-black' : 'text-textgrey'
          }`}
          onClick={() => setActiveTab('all')}
        >
          Все заказы
          <span
            className={`absolute top-0 left-full ml-2 font-normal text-sm whitespace-nowrap ${
              activeTab === 'all' ? 'text-black' : 'text-textgrey'
            }`}
          >
            ({pagination.total})
          </span>
        </button>
        <button
          type="button"
          className={`cursor-pointer relative font-semibold text-lg sm:text-2xl whitespace-nowrap text-right ${
            activeTab === 'active' ? 'text-black' : 'text-textgrey'
          }`}
          onClick={() => setActiveTab('active')}
        >
          Активные на странице
          <span
            className={`absolute top-0 left-full ml-2 font-normal text-sm whitespace-nowrap ${
              activeTab === 'active' ? 'text-black' : 'text-textgrey'
            }`}
          >
            ({activeOrdersOnPage})
          </span>
        </button>
      </div>

      <div className="space-y-8">
        {loading ? (
          <p className="text-black/40 text-center py-10">Загрузка заказов...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="text-black/40 text-center py-10">
            {activeTab === 'active'
              ? 'На этой странице нет активных заказов'
              : 'У вас пока нет заказов'}
          </p>
        ) : (
          filteredOrders.map((order) => (
            <article key={order.orderId} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-semibold text-black text-lg sm:text-xl">{order.date}</p>
                  <p className="text-textgrey text-sm">
                    Заказ №{order.id}
                    {order.carrierLabel ? ` · ${order.carrierLabel}` : ''}
                  </p>
                  {order.deliverySummary ? (
                    <p className="text-sm text-black/60 leading-relaxed break-words whitespace-pre-wrap">
                      {order.deliverySummary}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2 shrink-0 sm:max-w-[240px]">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${orderStatusBadgeClass(order.statusCode)}`}
                  >
                    {order.status}
                  </span>
                  <p className="text-sm text-black/50">{order.chargeStatusDisplay}</p>
                  <p className="font-semibold text-lg sm:text-xl">
                    {order.totalAmount.toLocaleString('ru-RU')} ₽
                    {order.shippingAmount > 0 ? (
                      <span className="text-sm font-normal text-black/50 ml-2">
                        (доставка {order.shippingAmount.toLocaleString('ru-RU')} ₽)
                      </span>
                    ) : null}
                  </p>
                  <Link
                    href={`/profile/orders/${order.orderId}`}
                    className="text-sm font-medium underline underline-offset-2 hover:text-[#2688EB]"
                  >
                    Подробнее о заказе
                  </Link>
                </div>
              </div>

              <OrderItemsList items={order.items} />
            </article>
          ))
        )}
      </div>

      {pagination.total > pagination.pageSize ? (
        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={!pagination.hasPrevious || loading}
            onClick={() => onPageChange(pagination.page - 1)}
            className="h-10 rounded-full border border-black px-5 text-sm font-medium disabled:opacity-40 hover:bg-black hover:text-white transition-colors"
          >
            Назад
          </button>
          <span className="text-sm text-black/60">
            {pagination.page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={!pagination.hasNext || loading}
            onClick={() => onPageChange(pagination.page + 1)}
            className="h-10 rounded-full border border-black px-5 text-sm font-medium disabled:opacity-40 hover:bg-black hover:text-white transition-colors"
          >
            Дальше
          </button>
        </div>
      ) : null}
    </>
  )
}
