'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuth';
import { useRouter } from 'next/navigation'
import IconThreeDots from '@/assets/icons/three-dots'
import ProductCard from '@/components/home/ProductCardAlt'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/profile-tabs'
import { mockProductsGrid, productsGridItem } from '@/lib/mock/products'
import Image from 'next/image'
import OrdersTabs from './orders-tabs'

const orders = [
  {
    id: 'F-378755',
    date: '21 марта, 2026',
    status: 'В процессе',
    items: [
      {
        id: 1,
        title: 'Кашемир и слива',
        volume: '100 мл',
        qty: 1,
        oldPrice: 15250,
        price: 12890,
        img: '/images/product1.png',
      },
      {
        id: 2,
        title: 'Кашемир и слива',
        volume: '100 мл',
        qty: 1,
        oldPrice: 15250,
        price: 12890,
        img: '/images/product2.png',
      },
      {
        id: 3,
        title: 'Кашемир и слива',
        volume: '100 мл',
        qty: 1,
        oldPrice: 15250,
        price: 12890,
        img: '/images/product1.png',
      },
    ],
  },
  {
    id: 'F-378754',
    date: '12 марта, 2026',
    status: 'Доставлено',
    items: [
      {
        id: 1,
        title: 'Кашемир и слива',
        volume: '100 мл',
        qty: 1,
        oldPrice: 15250,
        price: 12890,
        img: '/images/product1.png',
      },
    ],
  },
]

export default function ProfileIndex() {

  const { isAuthenticated , logout } = useAuthStore();
  const router = useRouter();

     useEffect(() => {
      isAuthenticated ? null : router.push('/')
    }, [isAuthenticated])

  return (
    <div className="relative min-h-screen text-black">
      <div className="absolute top-[-86px] left-0 w-full h-[511px] -z-10">
        <Image
          src="/images/catalogTop.png"
          alt="background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <section className="container mx-auto px-4 md:px-8 pt-40 pb-12">
        <h1 className="mt-40 text-3xl font-semibold text-white drop-shadow-lg">
          Здравствуйте, Елизавета
        </h1>
      </section>

      <Tabs defaultValue="global-info">
        <section className="mt-5 container py-12 flex justify-between gap-24">
          <aside className="border border-black rounded-2xl py-8 w-[369px] px-6 h-fit backdrop-blur-sm sticky top-24">
            <TabsList className="mt-8 flex flex-col items-start gap-4 bg-transparent rounded-none px-0">
              <TabsTrigger
                value="global-info"
                className="px-0 cursor-pointer text-textgrey data-[state=active]:text-black rounded-none outline-none text-xl font-semibold shadow-none ring-0 bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:border-0 data-[state=active]:shadow-none"
              >
                Общая информация
              </TabsTrigger>
              <TabsTrigger
                value="my-orders"
                className="px-0 cursor-pointer text-textgrey data-[state=active]:text-black rounded-none outline-none text-xl font-semibold shadow-none ring-0 bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:border-0 data-[state=active]:shadow-none"
              >
                Заказы
              </TabsTrigger>
              <TabsTrigger
                value="logout"
                className="px-0 cursor-pointer text-textgrey data-[state=active]:text-black rounded-none outline-none text-xl font-semibold shadow-none ring-0 bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:border-0 data-[state=active]:shadow-none"
              >
                Выйти
              </TabsTrigger>
            </TabsList>
            <div className="mt-[55px] h-px bg-textgrey mb-6" />
            <div>
              <p className="text-sm text-textgrey mb-1">Нужна помощь?</p>
              <button className="text-md font-medium cursor-pointer">
                Свяжитесь с нами
              </button>
            </div>
          </aside>

          <TabsContent value="global-info" className="flex-1">
            <main className="">
              <div className="flex justify-between mb-8">
                <h2 className="text-2xl font-semibold">Информация о вас</h2>
                <button
                  type="submit"
                  className="bg-black cursor-pointer text-white px-6 rounded-full hover:bg-gray-900 transition h-10 text-md font-medium"
                >
                  Сохранить
                </button>
              </div>

              <form className="space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm mb-2.5 text-textgrey">
                      Имя
                    </label>
                    <input
                      type="text"
                      defaultValue="Елизавета"
                      className="
                            w-full
                            rounded-xl
                            bg-[#fafafa]
                            px-4
                            text-md font-medium
                            py-2
                            border
                            border-bordergrey
                            outline-none
                            focus:outline-none
                            focus:ring-0
                            "
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2.5 text-textgrey">
                      Фамилия
                    </label>
                    <input
                      type="text"
                      defaultValue="Романова"
                      className="
                            w-full
                            rounded-xl
                            bg-[#F9F7F5]
                            px-4
                                    text-md font-medium
                            py-2
                            border
                            border-bordergrey
                            outline-none
                            focus:outline-none
                            focus:ring-0
                            "
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm mb-2.5 text-textgrey">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue="f.plevako@gmail.com"
                      className="
                            w-full
                            rounded-xl
                            bg-[#fafafa]
                            px-4
                                    text-md font-medium
                            py-2
                            border
                            border-bordergrey
                            outline-none
                            focus:outline-none
                            focus:ring-0
                            "
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2.5 text-textgrey">
                      Телефон
                    </label>
                    <input
                      type="tel"
                      defaultValue="+7(913) 910 30-70"
                      className="
                            w-full
                            rounded-xl
                            bg-[#F9F7F5]
                            px-4
                                    text-md font-medium
                            py-2
                            border
                            border-bordergrey
                            outline-none
                            focus:outline-none
                            focus:ring-0
                            "
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4">
                  <button
                    type="button"
                    className="text-md underline hover:text-black text-foreground font-medium"
                  >
                    Сменить пароль
                  </button>
                </div>
              </form>

              <section className="mt-16">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Доставка</h2>
                  <button className="border font-medium text-md border-black cursor-pointer text-black px-3 rounded-full transition h-10">
                    + Новый адрес
                  </button>
                </div>
                <aside className="mt-6 flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <hgroup>
                      <h4 className="text-md text-foreground font-medium">
                        Пункт СДЭК
                      </h4>
                      <p className="text-textgrey text-sm">
                        г. Суздаль, ул. Ленина, 138/2
                      </p>
                    </hgroup>
                    <div className="flex items-center gap-2">
                      <p className="text-md font-medium text-foreground">
                        по умолчанию
                      </p>
                      <button className="cursor-pointer">
                        <IconThreeDots />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <hgroup>
                      <h4 className="text-md text-foreground font-medium">
                        Пункт СДЭК
                      </h4>
                      <p className="text-textgrey text-sm">
                        {' '}
                        г. Суздаль, ул. Ленина, 138/2
                      </p>
                    </hgroup>
                    <div className="flex items-center gap-2">
                      <button className="cursor-pointer">
                        <IconThreeDots />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <hgroup>
                      <h4 className="text-md text-foreground font-medium">
                        Курьером по адресу:{' '}
                      </h4>
                      <p className="text-textgrey text-sm">
                        г. Суздаль, ул. Ленина, 138/2
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-textgrey text-sm">Комментарий:</p>{' '}
                        <span className="font-medium">
                          Осторожно, злая собака!
                        </span>
                      </div>
                    </hgroup>
                    <div className="flex items-center gap-2">
                      <button className="cursor-pointer">
                        <IconThreeDots />
                      </button>
                    </div>
                  </div>
                </aside>
              </section>

              <aside className="mt-16">
                <h2 className="text-2xl font-semibold">
                  Кое что новое для вас
                </h2>

                <div className="mt-14 grid grid-cols-3 gap-5">
                  {mockProductsGrid
                    .slice(0, 3)
                    .map((product: productsGridItem) => (
                      <ProductCard product={product} key={product.id} />
                    ))}
                </div>
              </aside>
            </main>
          </TabsContent>

          <TabsContent value="my-orders" className="flex-1">
            <OrdersTabs orders={orders} />
          </TabsContent>
          <TabsContent value="logout" className="flex-1">
            <div className="flex gap-3">
              <button className="h-10 rounded-full border-black border px-9 hover:bg-black hover:text-white cursor-pointer">
                Назад
              </button>
              <button onClick={logout} className="h-10 rounded-full border-black border px-9 hover:bg-black hover:text-white cursor-pointer">
                Выйти
              </button>
            </div>
          </TabsContent>
        </section>
      </Tabs>
    </div>
  )
}
