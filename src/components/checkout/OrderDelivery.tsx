'use client'

import { useState } from 'react'

type DeliveryItem = {
  id: string
  title: string
  address: string
  comment?: string
}

const OPTIONS: DeliveryItem[] = [
  {
    id: 'pvz-1',
    title: 'Пункт СДЭК',
    address: 'г. Суздаль, ул. Ленина, 138/2',
  },
  {
    id: 'pvz-2',
    title: 'Пункт СДЭК',
    address: 'г. Суздаль, ул. Ленина, 138/2',
  },
  {
    id: 'courier-1',
    title: 'Курьером по адресу:',
    address: 'г. Суздаль, ул. Ленина, 138/2',
    comment: 'Осторожно, злая собака!',
  },
]

export default function OrderDelivery() {
  const [selected, setSelected] = useState<string>('pvz-1')

  return (
    <section className="select-none">
      <div className="mb-10">
        <h2 className="text-[32px] leading-tight font-semibold mb-6">
          Доставка
        </h2>

        <ul className="space-y-6 mb-6">
          {OPTIONS.map((opt) => (
            <li key={opt.id} className="relative">
              <button
                type="button"
                onClick={() => setSelected(opt.id)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2688EB]">
                    {selected === opt.id ? (
                      <svg
                        viewBox="0 0 20 20"
                        className="h-3.5 w-3.5 fill-white"
                        aria-hidden="true"
                      >
                        <path d="M7.6 14.2 3.8 10.4l1.4-1.4 2.4 2.4L14.8 4.8l1.4 1.4-8.6 8z" />
                      </svg>
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full bg-white/30" />
                    )}
                  </span>

                  <div className="flex-1">
                    <div className="text-[16px] leading-6 font-medium">
                      {opt.title}
                    </div>
                    <div className="text-[14px] leading-6 text-black/40">
                      {opt.address}
                    </div>
                    {!!opt.comment && (
                      <div className="text-[14px] leading-6 text-black/40">
                        <span>Комментарий: </span>
                        <span className="text-black font-medium">
                          {opt.comment}
                        </span>
                      </div>
                    )}
                  </div>

                  <div
                    className="mt-1 ml-2 inline-flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-[#FAFAFA] hover:bg-black/[0.04]"
                    aria-label="Дополнительно"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5 fill-black"
                      aria-hidden="true"
                    >
                      <circle cx="5" cy="12" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="19" cy="12" r="2" />
                    </svg>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="w-full h-11 rounded-full border border-black text-[16px] font-semibold hover:bg-black/[0.03] transition"
        >
          + Новый адрес
        </button>
      </div>
    </section>
  )
}
