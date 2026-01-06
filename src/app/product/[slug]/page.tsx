'use client'

import Image from 'next/image'
import PopularScentsAlt from '@/components/features/PopularScentsAlt'
import Choice from '@/components/home/Choice'
import BackButton from '@/components/ui/BackButton'
import AromaNote from '@/components/features/AromaNote'
import { mockAromaNotes } from '@/lib/mock/products'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import AddCartButton from '@/components/ui/AddCartButton'
import { toast } from 'react-toastify'
import { formatCurrency, parseEditorJS } from '@/lib/functions'
import { getSingleProduct, getCatalogDiscounts } from '@/graphql/queries/product.service'
import { ProductDetailNode } from '@/graphql/types/product.types'
import { ProductCardItem } from '@/types/product'
import { useMobile } from '@/lib/hooks'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

const getAttributeBySlug = (attributes: any[], slug: string) => {
  return attributes?.find((attr) => attr.attribute.slug === slug)
}

export default function ProductPage() {
  const [product, setProduct] = useState<ProductDetailNode | null>(null)
  const [productCartFormat, setProductCartFormat] =
    useState<ProductCardItem | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  )
  const [mainImage, setMainImage] = useState('')
  const [price, setPrice] = useState<number>(0)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  const { slug } = useParams()
  const isMobile = useMobile()
  const swiperRef = useRef<any>(null)

  useEffect(() => {
    const fetch = async () => {
      const data = await getSingleProduct(String(slug))
      if (!data) return

      setProduct(data)

      // initial image
      const initialImage = data.media[0]?.url || data.thumbnail?.url || ''
      setMainImage(initialImage)
      setCurrentSlideIndex(0)

      const firstVariant = data.productVariants.edges[0].node
      const basePrice = firstVariant.pricing.price.gross.amount
      let oldPrice = firstVariant.pricing.priceUndiscounted?.gross?.amount
      let discountPercent: number | undefined

      if (oldPrice && oldPrice > basePrice) {
        discountPercent = Math.round(((oldPrice - basePrice) / oldPrice) * 100)
      }

      // Подтягиваем каталожную скидку, если есть
      try {
        const discounts = await getCatalogDiscounts([firstVariant.id])
        const external = discounts[firstVariant.id]
        if (typeof external === 'number' && external > 0) {
          discountPercent = Math.round(external)
          oldPrice = Math.round((basePrice * 100) / (100 - discountPercent))
        }
      } catch (e) {
        console.error('Error fetching catalog discounts for PDP:', e)
      }

      setProductCartFormat({
        id: String(data.id),
        name: data.name,
        price: basePrice,
        oldPrice,
        discountPercent,
        image: data.media[0]?.url || data.thumbnail.url,
        thumbnail: data.thumbnail.url,
        slug: data.slug,
        aromas: ['Cладкий 🤤', 'Цветочный 🌸', 'Древесный 🪵'],
        size: firstVariant.name,
        variantId: firstVariant.id,
        group: [
          { id: 1, group: 'flower', title: 'Cладкий 🤤' },
          { id: 2, group: 'wood', title: 'Цветочный 🌸' },
          { id: 3, group: 'sweet', title: 'Древесный 🪵' },
        ],
      })

      if (data.productVariants?.edges?.length > 0) {
        setSelectedVariantId(firstVariant.id)
        setPrice(basePrice)
      }
    }

    fetch()
  }, [slug])

  if (!product) return <div>Loading...</div>

  const handleSetSize = (variantId: string) => {
    const variant = product.productVariants.edges.find(
      (edge) => edge.node.id === variantId,
    )?.node

    if (variant) {
      setSelectedVariantId(variantId)
      setPrice(variant.pricing.price.gross.amount)
    }
  }
  
  // Handle Thumbnail Click
  const handleImageChange = (index: number) => {
    if (swiperRef.current) {
      swiperRef.current.slideTo(index)
    }
    setCurrentSlideIndex(index)
  }

  // Handle slide change
  const handleSlideChange = (swiper: any) => {
    setCurrentSlideIndex(swiper.activeIndex)
    setMainImage(
      product?.media[swiper.activeIndex]?.url || product?.thumbnail?.url || '',
    )
  }

  const shortDescription =
    getAttributeBySlug(product.attributes || [], 'korotkoe-opisanie-tovara')
      ?.values[0]?.name || ''

  const aromaAttribute = getAttributeBySlug(
    product.attributes || [],
    'aromaty-v-kartochke-tovara',
  )
  const aromas = aromaAttribute?.values || []

  const hasNotes = (
    prod: any,
  ): prod is ProductDetailNode & {
    notes: Array<{ basic: string[]; middle: string[]; head: string[] }>
  } => {
    return prod && Array.isArray(prod.notes) && prod.notes.length > 0
  }

  const characteristicsAttr = getAttributeBySlug(
    product.attributes || [],
    'harakteristiki',
  )
  const characteristicsContent = characteristicsAttr?.values[0]?.richText
    ? parseEditorJS(characteristicsAttr.values[0].richText)
    : characteristicsAttr?.values[0]?.name || ''

  const compositionAttr = getAttributeBySlug(product.attributes || [], 'sostav')
  const compositionContent = compositionAttr?.values[0]?.richText
    ? parseEditorJS(compositionAttr.values[0].richText)
    : compositionAttr?.values[0]?.name || ''

  const descriptionContent = product.description
    ? parseEditorJS(product.description)
    : ''

  return (
    <div>
      <BackButton />
      
      <div className="flex flex-col gap-8 sm:gap-10 md:gap-16 lg:gap-20 px-2 sm:px-4">
        <section className="flex flex-col lg:grid lg:grid-cols-2 gap-5 sm:gap-6 md:gap-8">
          <div className="w-full">
            {/* Main Image Slider Container */}
            <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] xl:h-[716px] rounded-xl sm:rounded-2xl md:rounded-3xl mb-3 sm:mb-4 md:mb-6 bg-gray-100 overflow-hidden">
              {product?.media && product.media.length > 0 ? (
                <>
                  <Swiper
                    modules={[Pagination]}
                    pagination={{ 
                      clickable: true,
                      dynamicBullets: true,
                      enabled: isMobile,
                    }}
                    spaceBetween={0}
                    slidesPerView={1}
                    allowTouchMove={true}
                    onSwiper={(swiper) => {
                      swiperRef.current = swiper
                    }}
                    onSlideChange={handleSlideChange}
                    className="w-full h-full"
                  >
                    {product.media.map((mediaItem, index) => (
                      <SwiperSlide key={index} className="relative">
                        <div className="relative w-full h-full">
                          <Image
                            src={mediaItem.url}
                            alt={mediaItem.alt || `Product image ${index + 1}`}
                            fill
                            className="object-cover duration-300"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 700px"
                            priority={index === 0}
                          />
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>

                  {/* Navigation Arrows - Desktop only */}
                  {!isMobile && product.media.length > 1 && (
                    <>
                      <button
                        onClick={() => swiperRef.current?.slidePrev()}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110 cursor-pointer"
                        aria-label="Previous image"
                      >
                        <svg
                          width="12"
                          height="20"
                          viewBox="0 0 12 20"
                          fill="none"
                          className="w-3 h-5 sm:w-[12px] sm:h-5"
                        >
                          <path
                            d="M10 18L2 10L10 2"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => swiperRef.current?.slideNext()}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110 cursor-pointer"
                        aria-label="Next image"
                      >
                        <svg
                          width="12"
                          height="20"
                          viewBox="0 0 12 20"
                          fill="none"
                          className="w-3 h-5 sm:w-[12px] sm:h-5"
                        >
                          <path
                            d="M2 2L10 10L2 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="relative w-full h-full">
                  <Image
                    src={product?.thumbnail?.url || ''}
                    alt="Product thumbnail"
                    fill
                    className="object-cover duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 700px"
                    priority
                  />
                </div>
              )}

              {/* Thumbnails - Desktop */}
              {!isMobile && product?.media && product.media.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 flex justify-start gap-2 sm:gap-3 scrollbar-hide p-2 sm:p-3 z-30 bg-gradient-to-t from-black/20 to-transparent">
                  {product.media.map((mediaItem, index) => {
                    const isActive = index === currentSlideIndex
                    return (
                      <button
                        key={index}
                        onClick={() => handleImageChange(index)}
                        className={`w-16 h-16 sm:w-20 sm:h-20 md:w-[100px] md:h-[100px] lg:w-[124px] lg:h-[122px] shrink-0 rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden border-2 transition-all duration-300 ${
                          isActive
                            ? 'border-white scale-[1.05] shadow-lg'
                            : 'border-transparent hover:border-white/50'
                        }`}
                      >
                        <Image
                          src={mediaItem.url}
                          alt={`Thumbnail ${index + 1}`}
                          width={124}
                          height={122}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Thumbnails - Mobile */}
            {isMobile && product?.media && product.media.length > 1 && (
              <div className="sm:hidden flex justify-start gap-2 sm:gap-3 mt-4 sm:mt-5 md:mt-6 scrollbar-hide p-2 sm:p-3 overflow-x-auto">
                {product.media.map((mediaItem, index) => {
                  const isActive = index === currentSlideIndex
                  return (
                    <button
                      key={index}
                      onClick={() => handleImageChange(index)}
                      className={`w-16 h-16 sm:w-20 sm:h-20 md:w-[100px] md:h-[100px] lg:w-[124px] lg:h-[122px] shrink-0 rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden border-2 transition-all duration-300 ${
                        isActive
                          ? 'border-black scale-[1.05]'
                          : 'border-gray-300'
                      }`}
                    >
                      <Image
                        src={mediaItem.url}
                        alt={`Thumbnail ${index + 1}`}
                        width={124}
                        height={122}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="w-full flex flex-col lg:flex-row lg:justify-end lg:items-start">
           {/* ... Rest of your component (Product Details) ... */}
           {/* I kept the rest of the code hidden to save space, but it remains exactly the same */}
            <div className="w-full lg:w-[682px] flex flex-col gap-6 sm:gap-8 md:gap-12 lg:gap-14 p-4 sm:p-5 md:p-6 border rounded-2xl sm:rounded-3xl md:rounded-4xl">
              <div className="flex flex-col gap-2 sm:gap-2.5">
                <h2 className="font-semibold text-xl sm:text-2xl md:text-3xl select-none">
                  {product?.name}
                </h2>
                <p className="font-normal text-xs sm:text-sm md:text-md select-none">
                  {shortDescription}
                </p>
              </div>

              {aromas.length > 0 && (
                <div className="flex flex-col gap-2 sm:gap-3">
                  <p className="font-normal text-xs sm:text-sm md:text-md text-textgrey select-none">
                    Ароматы
                  </p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {aromas.map(
                      (aroma: { name: string; id: string }, index: number) => (
                        <span
                          key={aroma.id || index}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 border border-textgrey rounded-full text-xs sm:text-sm md:text-base select-none"
                        >
                          {aroma.name}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              {hasNotes(product) && (
                <div className="flex flex-col gap-2 sm:gap-3">
                  <div className="flex flex-row justify-between w-full gap-1.5 sm:gap-2.5 select-none">
                    <p className="font-normal text-xs sm:text-sm md:text-md text-textgrey whitespace-nowrap shrink-0">
                      Базовые ноты
                    </p>
                    <div className="flex grow border-b-[2px] sm:border-b-[3px] border-dotted border-textgrey mx-1 sm:mx-2"></div>
                    <p className="font-normal text-xs sm:text-sm md:text-md select-none text-right shrink-0">
                      {product.notes
                        .map((note) => note.basic)
                        .flat()
                        .join(', ')}
                    </p>
                  </div>

                  <div className="flex flex-row justify-between w-full gap-1.5 sm:gap-2.5">
                    <p className="font-normal text-xs sm:text-sm md:text-md text-textgrey select-none whitespace-nowrap shrink-0">
                      Средние ноты
                    </p>
                    <div className="flex grow border-b-[2px] sm:border-b-[3px] border-dotted border-textgrey mx-1 sm:mx-2"></div>
                    <p className="font-normal text-xs sm:text-sm md:text-md select-none text-right shrink-0">
                      {product.notes
                        .map((note) => note.middle)
                        .flat()
                        .join(', ')}
                    </p>
                  </div>

                  <div className="flex flex-row justify-between w-full gap-1.5 sm:gap-2.5">
                    <p className="font-normal text-xs sm:text-sm md:text-md text-textgrey select-none whitespace-nowrap shrink-0">
                      Верхние аккорды
                    </p>
                    <div className="flex grow border-b-[2px] sm:border-b-[3px] border-dotted border-textgrey mx-1 sm:mx-2"></div>
                    <p className="font-normal text-xs sm:text-sm md:text-md select-none text-right shrink-0">
                      {product.notes
                        .map((note) => note.head)
                        .flat()
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
                <div className="flex flex-row flex-wrap justify-start w-full gap-1.5 sm:gap-2">
                  {product.productVariants?.edges?.map((edge, index) => {
                    const variant = edge.node
                    const isSelected = selectedVariantId === variant.id
                    return (
                      <div
                        key={index}
                        onClick={() => handleSetSize(variant.id)}
                        className={`flex flex-row justify-center items-center py-1 sm:py-1.5 px-2.5 sm:px-3 md:pt-1.25 md:pb-1.25 md:pl-2.5 md:pr-2.5 border rounded-full cursor-pointer select-none transition-colors text-xs sm:text-sm md:text-base ${
                          isSelected
                            ? 'border-black text-white bg-black'
                            : 'border-textgrey text-textgrey hover:border-black hover:text-black'
                        }`}
                      >
                        {variant.name}
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center gap-3 select-none">
                  <h2 className="font-semibold text-xl sm:text-2xl md:text-3xl">
                    {formatCurrency(price)}₽
                  </h2>
                  {productCartFormat?.oldPrice &&
                    productCartFormat.oldPrice > price && (
                      <span className="text-lg text-gray-400 line-through">
                        {formatCurrency(productCartFormat.oldPrice)} ₽
                      </span>
                    )}
                  {productCartFormat?.discountPercent && productCartFormat.discountPercent > 0 && (
                    <span className="text-sm font-semibold text-red-500">
                      -{productCartFormat.discountPercent}%
                    </span>
                  )}
                </div>

                <AddCartButton
                  product={productCartFormat}
                  size={
                    product.productVariants?.edges?.find(
                      (e) => e.node.id === selectedVariantId,
                    )?.node.name || null
                  }
                  variantId={selectedVariantId}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Остальной контент */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-5">
          <div className="flex flex-col gap-6 sm:gap-8">
            <div className="flex flex-col gap-4 sm:gap-6 md:gap-8">
              <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8">
                <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
                  <h5 className="font-semibold text-base sm:text-lg md:text-xl select-none">
                    Базовые ноты
                  </h5>
                  <div className="flex flex-row gap-2 sm:gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2">
                    {mockAromaNotes.map((note) => (
                      <AromaNote key={note.id} id={note.id} />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
                  <h5 className="font-semibold text-base sm:text-lg md:text-xl select-none">
                    Средние ноты
                  </h5>
                  <div className="flex flex-row gap-2 sm:gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2">
                    {mockAromaNotes.slice(0, 3).map((note) => (
                      <AromaNote key={note.id} id={note.id} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
                <h5 className="font-semibold text-base sm:text-lg md:text-xl select-none">
                  Верхние аккорды
                </h5>
                <div className="flex flex-row gap-2 sm:gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {mockAromaNotes.slice(0, 3).map((note) => (
                    <AromaNote key={note.id} id={note.id} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:gap-6 md:gap-8">
              <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
                <h2 className="font-semibold text-xl sm:text-2xl md:text-3xl select-none">
                  О продукте
                </h2>
                <Tabs defaultValue="description" className="">
                  <div className=" scrollbar-hide">
                    <TabsList className="flex gap-1.5 sm:gap-2 md:space-x-5">
                      <TabsTrigger
                        value="description"
                        className="flex flex-row justify-center items-center py-1.5 sm:py-2 px-2 sm:px-3 md:pt-2.5 md:pb-2.5 md:pl-4 md:pr-4 rounded-full cursor-pointer select-none text-xs sm:text-sm md:text-base whitespace-nowrap"
                      >
                        Описание
                      </TabsTrigger>
                      <TabsTrigger
                        value="characteristics"
                        className="flex flex-row justify-center items-center py-1.5 sm:py-2 px-2 sm:px-3 md:pt-2.5 md:pb-2.5 md:pl-4 md:pr-4 rounded-full cursor-pointer select-none text-xs sm:text-sm md:text-base whitespace-nowrap"
                      >
                        Характеристики
                      </TabsTrigger>
                      <TabsTrigger
                        value="contain"
                        className="flex flex-row justify-center items-center py-1.5 sm:py-2 px-2 sm:px-3 md:pt-2.5 md:pb-2.5 md:pl-4 md:pr-4 rounded-full cursor-pointer select-none text-xs sm:text-sm md:text-base whitespace-nowrap"
                      >
                        Состав
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent
                    value="description"
                    className="mt-4 sm:mt-6 md:mt-8"
                  >
                    <div
                      className="flex flex-col gap-3 sm:gap-4 md:gap-5 text-xs sm:text-sm md:text-base"
                      dangerouslySetInnerHTML={{
                        __html: descriptionContent,
                      }}
                    />
                  </TabsContent>

                  <TabsContent
                    value="characteristics"
                    className="mt-4 sm:mt-6 md:mt-8"
                  >
                    <div className="flex flex-col gap-3 sm:gap-4 md:gap-5">
                      <div
                        className="flex flex-col gap-3 sm:gap-4 md:gap-5 text-xs sm:text-sm md:text-base"
                        dangerouslySetInnerHTML={{
                          __html: characteristicsContent,
                        }}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="contain" className="mt-4 sm:mt-6 md:mt-8">
                    <div className="flex flex-col gap-3 sm:gap-4 md:gap-5">
                      <div
                        className="flex flex-col gap-3 sm:gap-4 md:gap-5 text-xs sm:text-sm md:text-base"
                        dangerouslySetInnerHTML={{
                          __html: compositionContent,
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