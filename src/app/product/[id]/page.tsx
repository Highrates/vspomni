'use client'

import Image from 'next/image'
import PopularScentsAlt from '@/components/features/PopularScentsAlt'
import Choice from '@/components/home/Choice'
import BackButton from '@/components/ui/BackButton'
import AromaNote from '@/components/features/AromaNote'
import {
  mockAromaNotes,
  mockProductsGrid,
  productsGridItem,
} from '@/lib/mock/products'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import AddCartButton from '@/components/ui/AddCartButton'
import { toast } from 'react-toastify'
import { formatCurrency } from '@/lib/functions'

export default function ProductPage() {
  const [product, setProduct] = useState<productsGridItem | null>(null)
  const [size, setSize] = useState<string | null>(null)
  const [mainImage, setMainImage] = useState(product?.image[0])
  const [price, setPrice] = useState<number>(0)
  const { id } = useParams()

  useEffect(() => {
    const foundProduct = mockProductsGrid.find((item) => item.id === id)
    if (foundProduct) {
      setProduct(foundProduct)
      setMainImage(foundProduct.image[0])
      setPrice(foundProduct.price) // базовая цена
    }
  }, [id])

  if (!product) return <div>Loading...</div>

  // 💰 динамическая цена по объёму
  const priceBySize: Record<string, number> = {
    '50': product.price * 0.7,
    '100': product.price,
    sampler: product.price * 0.3,
  }

  const handleSetSize = (selectedSize: string) => {
    setSize(selectedSize)
    setPrice(priceBySize[selectedSize] || product.price)
  }

  const handleAddToCart = () => {
    if (!size) {
      toast.error('Пожалуйста, выберите размер перед добавлением в корзину.')
      return
    }
    console.log(
      'The product : ' + JSON.stringify({ productId: product.id, size }),
    )
  }

  return (
    <div>
      <BackButton />
      <div className="flex flex-col gap-10 md:gap-20 px-2 ">
        <section className="flex flex-col lg:grid lg:grid-cols-2 gap-5 md:gap-8 ">
          <div className="w-full">
            <div className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-[716px] overflow-hidden rounded-2xl md:rounded-3xl mb-4 md:mb-6 bg-gray-100">
              <Image
                src={mainImage || product.image[0]}
                alt="Main product"
                fill
                className="object-cover duration-300 relative"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 700px"
                priority
              />
            </div>

            {/* Миниатюры под главным изображением */}
            <div className="flex justify-center gap-3 mt-5 md:mt-6  scrollbar-hide px-3">
              {product?.image.map((imgSrc, index) => {
                const isActive = imgSrc === mainImage
                return (
                  <button
                    key={index}
                    onClick={() => setMainImage(imgSrc)}
                    className={`w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] md:w-[124px] md:h-[122px] flex-shrink-0 rounded-2xl md:rounded-3xl overflow-hidden border-2 transition-all duration-300 ${
                      isActive
                        ? 'border-black scale-[1.05]'
                        : 'border-transparent hover:border-neutral-400'
                    }`}
                  >
                    <Image
                      src={imgSrc}
                      alt={`Thumbnail ${index + 1}`}
                      width={124}
                      height={122}
                      className="w-full h-full object-cover"
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="w-full flex flex-col lg:flex-row lg:justify-end lg:items-start">
            <div className="w-full lg:w-[682px] flex flex-col gap-8 md:gap-14 p-4 sm:p-6 border rounded-3xl md:rounded-4xl">
              <div className="flex flex-col gap-2.5">
                <h2 className="font-semibold text-2xl md:text-3xl select-none">
                  {product?.title}
                </h2>
                <p className="font-normal text-sm md:text-md select-none">
                  {product?.overview}
                </p>
              </div>

              {/* 🎵 Ноты */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-row justify-between w-full gap-2.5 select-none">
                  <p className="font-normal text-sm md:text-md text-textgrey whitespace-nowrap">
                    Базовые ноты
                  </p>
                  <div className="flex grow border-b-[3px] border-dotted border-textgrey"></div>
                  <p className="font-normal text-sm md:text-md select-none text-right">
                    {(product?.notes ?? [])
                      .map((note) => note.basic)
                      .flat()
                      .join(', ')}
                  </p>
                </div>

                <div className="flex flex-row justify-between w-full gap-2.5">
                  <p className="font-normal text-sm md:text-md text-textgrey select-none whitespace-nowrap">
                    Средние ноты
                  </p>
                  <div className="flex grow border-b-[3px] border-dotted border-textgrey"></div>
                  <p className="font-normal text-sm md:text-md select-none text-right">
                    {(product?.notes ?? [])
                      .map((note) => note.middle)
                      .flat()
                      .join(', ')}
                  </p>
                </div>

                <div className="flex flex-row justify-between w-full gap-2.5">
                  <p className="font-normal text-sm md:text-md text-textgrey select-none whitespace-nowrap">
                    Верхние аккорды
                  </p>
                  <div className="flex grow border-b-[3px] border-dotted border-textgrey"></div>
                  <p className="font-normal text-sm md:text-md select-none text-right">
                    {(product?.notes ?? [])
                      .map((note) => note.head)
                      .flat()
                      .join(', ')}
                  </p>
                </div>
              </div>

              {/* 💰 Размер и цена */}
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="flex flex-row flex-wrap justify-start w-full gap-2">
                  {product.capacity.map((capacity, index) => {
                    const isSelected = size === capacity
                    return (
                      <div
                        key={index}
                        onClick={() => handleSetSize(capacity)}
                        className={`flex flex-row justify-center items-center py-1.5 px-3 md:pt-1.25 md:pb-1.25 md:pl-2.5 md:pr-2.5 border rounded-full cursor-pointer select-none transition-colors text-sm md:text-base ${
                          isSelected
                            ? 'border-black text-white bg-black'
                            : 'border-textgrey text-textgrey hover:border-black hover:text-black'
                        }`}
                      >
                        {capacity === 'sampler' ? 'Пробник' : `${capacity} мл`}
                      </div>
                    )
                  })}
                </div>

                <h2 className="font-semibold text-2xl md:text-3xl select-none">
                  {formatCurrency(price)}₽
                </h2>

                <AddCartButton product={product} size={size} />
              </div>
            </div>
          </div>
        </section>

        {/* Остальной контент */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-5">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-6 md:gap-8">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                <div className="flex flex-col gap-4 md:gap-6">
                  <h5 className="font-semibold text-lg md:text-xl select-none">
                    Базовые ноты
                  </h5>
                  <div className="flex flex-row gap-3 md:gap-4 overflow-x-auto scrollbar-hide">
                    {mockAromaNotes.map((note) => (
                      <AromaNote key={note.id} id={note.id} />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4 md:gap-6">
                  <h5 className="font-semibold text-lg md:text-xl select-none">
                    Средние ноты
                  </h5>
                  <div className="flex flex-row gap-3 md:gap-4 overflow-x-auto scrollbar-hide">
                    {mockAromaNotes.slice(0, 3).map((note) => (
                      <AromaNote key={note.id} id={note.id} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 md:gap-6">
                <h5 className="font-semibold text-lg md:text-xl select-none">
                  Верхние аккорды
                </h5>
                <div className="flex flex-row gap-3 md:gap-4 overflow-x-auto scrollbar-hide">
                  {mockAromaNotes.slice(0, 3).map((note) => (
                    <AromaNote key={note.id} id={note.id} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6 md:gap-8">
              <div className="flex flex-col gap-4 md:gap-6">
                <h2 className="font-semibold text-2xl md:text-3xl select-none">
                  О продукте
                </h2>
                <Tabs defaultValue="description" className="">
                  <div className="not-sm:overflow-x-auto scrollbar-hide">
                    <TabsList className="flex gap-2 md:space-x-5 ">
                      <TabsTrigger
                        value="description"
                        className="flex flex-row justify-center items-center py-2 px-3 md:pt-2.5 md:pb-2.5 md:pl-4 md:pr-4 rounded-full cursor-pointer select-none text-sm md:text-base"
                      >
                        Описание
                      </TabsTrigger>
                      <TabsTrigger
                        value="characteristics"
                        className="flex flex-row justify-center items-center py-2 px-3 md:pt-2.5 md:pb-2.5 md:pl-4 md:pr-4 rounded-full cursor-pointer select-none text-sm md:text-base"
                      >
                        Характеристики
                      </TabsTrigger>
                      <TabsTrigger
                        value="contain"
                        className="flex flex-row justify-center items-center py-2 px-3 md:pt-2.5 md:pb-2.5 md:pl-4 md:pr-4 rounded-full cursor-pointer select-none text-sm md:text-base"
                      >
                        Состав
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="description" className="mt-6 md:mt-8">
                    <p className="text-sm md:text-base">
                      <b>Описание: </b>
                    </p>
                    <div
                      className="flex flex-col gap-4 md:gap-5 text-sm md:text-base"
                      dangerouslySetInnerHTML={{
                        __html: product.about.description.replace(
                          /\n/g,
                          '<br>',
                        ),
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="characteristics" className="mt-6 md:mt-8">
                    <div className="flex flex-col gap-4 md:gap-5">
                      <p className="text-sm md:text-base">
                        <b>Характеристики продукта:</b>
                      </p>
                      <div
                        className="flex flex-col gap-4 md:gap-5 text-sm md:text-base"
                        dangerouslySetInnerHTML={{
                          __html: product.about.specs.replace(/\n/g, '<br>'),
                        }}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="contain" className="mt-6 md:mt-8">
                    <div className="flex flex-col gap-4 md:gap-5">
                      <p className="text-sm md:text-base">
                        <b>Состав:</b>
                      </p>
                      <div
                        className="flex flex-col gap-4 md:gap-5 text-sm md:text-base"
                        dangerouslySetInnerHTML={{
                          __html: product.about.contain.replace(/\n/g, '<br>'),
                        }}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Choice />
      <PopularScentsAlt />
    </div>
  )
}
