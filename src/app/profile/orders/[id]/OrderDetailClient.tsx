'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchUserOrderDetail } from '@/lib/order/api'
import { orderStatusBadgeClass } from '@/lib/order/status'
import { formatOrderDate, transformOrderDetail } from '@/lib/order/transform'
import type { OrderDetail } from '@/lib/order/types'
import { useAuthStore } from '@/stores/useAuth'

export default function OrderDetailClient({ orderRef }: { orderRef: string }) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchUserOrderDetail(orderRef)
        if (!cancelled) {
          setOrder(transformOrderDetail(data))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить заказ')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, orderRef, router])

  if (loading) {
    return <p className="text-black/40 py-10">Загрузка заказа...</p>
  }

  if (error || !order) {
    return (
      <div className="space-y-4 py-10">
        <p className="text-red-500">{error || 'Заказ не найден'}</p>
        <Link
          href="/profile?tab=my-orders"
          className="inline-flex h-10 items-center rounded-full border border-black px-6 text-sm font-medium hover:bg-black hover:text-white transition-colors"
        >
          К списку заказов
        </Link>
      </div>
    )
  }

  const address = order.shippingAddress

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/profile?tab=my-orders"
          className="text-sm text-black/60 hover:text-black underline underline-offset-2"
        >
          ← Все заказы
        </Link>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${orderStatusBadgeClass(order.statusCode)}`}
        >
          {order.status}
        </span>
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold">Заказ №{order.id}</h1>
        <p className="text-black/60">{formatOrderDate(order.created)}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black p-4 sm:p-5 space-y-3">
          <h2 className="font-semibold text-lg">Доставка</h2>
          {order.deliverySummary ? (
            <p className="text-sm sm:text-base">{order.deliverySummary}</p>
          ) : null}
          {address ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-black/50">Получатель</dt>
                <dd>
                  {[address.firstName, address.lastName].filter(Boolean).join(' ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-black/50">Телефон</dt>
                <dd>{address.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-black/50">Адрес</dt>
                <dd>
                  {[address.postalCode, address.city, address.streetAddress1]
                    .filter(Boolean)
                    .join(', ')}
                </dd>
              </div>
              {address.comment ? (
                <div>
                  <dt className="text-black/50">Комментарий</dt>
                  <dd>{address.comment}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-black/50">Перевозчик</dt>
                <dd>
                  {address.carrierLabel}
                  {address.dropoffLabel ? ` · ${address.dropoffLabel}` : ''}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-black/50 text-sm">Адрес не указан</p>
          )}
          {order.shippingMethodName ? (
            <p className="text-sm text-black/50">Способ: {order.shippingMethodName}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-black p-4 sm:p-5 space-y-3">
          <h2 className="font-semibold text-lg">Оплата</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-black/50">Статус оплаты</dt>
              <dd className="font-medium">{order.chargeStatusDisplay}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-black/50">Товары</dt>
              <dd>{order.subtotalAmount.toLocaleString('ru-RU')} ₽</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-black/50">Доставка</dt>
              <dd>{order.shippingAmount.toLocaleString('ru-RU')} ₽</dd>
            </div>
            <div className="flex justify-between gap-4 pt-2 border-t border-black/10 text-base font-semibold">
              <dt>Итого</dt>
              <dd>{order.totalAmount.toLocaleString('ru-RU')} ₽</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg sm:text-xl">Состав заказа</h2>
        <div className="space-y-2.5">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-end justify-between border border-black rounded-2xl p-3"
            >
              <div className="flex gap-4 min-w-0">
                <div className="relative w-24 h-24 sm:w-26 sm:h-26 shrink-0 rounded-xl overflow-hidden">
                  <Image src={item.img} alt={item.title} fill className="object-cover" />
                </div>
                <div className="flex flex-col justify-between py-2 min-w-0">
                  <div>
                    <p className="font-semibold text-base sm:text-xl">{item.title}</p>
                    {item.volume ? (
                      <p className="text-sm text-black/60">{item.volume}</p>
                    ) : null}
                  </div>
                  <p className="text-base sm:text-xl font-semibold">{item.qty} шт.</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="flex items-center gap-2 text-base sm:text-xl font-semibold justify-end">
                  {item.oldPrice > 0 && item.oldPrice > item.price ? (
                    <p className="text-textgrey line-through">
                      {item.oldPrice.toLocaleString('ru-RU')} ₽
                    </p>
                  ) : null}
                  <p>{item.price.toLocaleString('ru-RU')} ₽</p>
                </div>
                <p className="text-sm text-black/50 mt-1">
                  {item.lineTotal.toLocaleString('ru-RU')} ₽
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
