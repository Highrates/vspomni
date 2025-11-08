'use client'

import Image from 'next/image'
import PopularScentsAlt from '@/components/features/PopularScentsAlt'

export default function CatalogPage() {
  return (
    <div>
      <div className="ml-auto mr-auto max-w-[1696px] h-[511px] rounded-[20px] relative mb-23 bg-linear-to-r from-[#00000051] z-1">
        <div className="w-full h-[511px] rounded-[20px] z-2 absolute flex flex-col justify-end items-start pb-14 pl-20">
          <h2 className="text-white text-[48px] font-semibold select-none z-3">
            Каталог
          </h2>
        </div>
        <Image
          src="/images/catalogTop.png"
          alt="image one"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1728px) 1536px, 1536px"
        />
      </div>
      <div className="flex flex-col gap-10 mb-45 ">
        <section className="w-full h-[598px] rounded-[20px] z-1 relative">
          <div className="w-full h-[598px] rounded-[20px] z-2 absolute flex flex-col justify-between p-13.5 bg-linear-to-r from-[#00000051] ">
            <h5 className="text-white text-[48px] font-semibold select-none z-3">
              Диффузоры
            </h5>
            <p className="text-white w-[559px]  text-lg font-normal select-none z-3">
              Согласись, приятно получать посылку с любимой косметикой? Когда
              желанные средства упакованы в яркий, праздничный бокс —
              эмоциональный эффект усиливается в разы. Мы верим, что наши
              стильные боксы каждый раз вызывают на твоём лице улыбку!
            </p>
          </div>
          <Image
            src="/images/catalog1.png"
            alt="image one"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1728px) 1536px, 1536px "
          />
        </section>
        <section className="w-full h-[598px] rounded-[20px] relative">
          <div className="w-full h-[598px] rounded-[20px] z-2 absolute flex flex-col items-end justify-between p-13.5 bg-linear-to-l from-[#00000051] ">
            <h5 className="text-white text-[48px] font-semibold select-none">
              Саше
            </h5>
            <p className="text-white w-[559px]  text-lg font-normal text-right select-none">
              Согласись, приятно получать посылку с любимой косметикой? Когда
              желанные средства упакованы в яркий, праздничный бокс —
              эмоциональный эффект усиливается в разы. Мы верим, что наши
              стильные боксы каждый раз вызывают на твоём лице улыбку!
            </p>
          </div>
          <Image
            src="/images/catalog2.png"
            alt="image one"
            fill
            loading="eager"
            sizes="(max-width: 768px) 100vw, (max-width: 1728px) 1536px, 1536px"
          />
        </section>
        <section className="w-full h-[598px] rounded-[20px] relative z-1">
          <div className="w-full h-[598px] rounded-[20px] z-2 absolute flex flex-col justify-between p-13.5 bg-linear-to-r from-[#00000051] ">
            <h5 className="text-white text-[48px] font-semibold select-none">
              Яркая и стильная упаковка
            </h5>
            <p className="text-white w-[559px]  text-lg font-normal select-none">
              Согласись, приятно получать посылку с любимой косметикой? Когда
              желанные средства упакованы в яркий, праздничный бокс —
              эмоциональный эффект усиливается в разы. Мы верим, что наши
              стильные боксы каждый раз вызывают на твоём лице улыбку!
            </p>
          </div>
          <Image
            src="/images/catalog3.png"
            alt="image one"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1728px) 1536px, 1536px"
          />
        </section>
      </div>
      <PopularScentsAlt />
    </div>
  )
}
