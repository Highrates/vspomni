'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useFaqStore } from '@/stores/useFaq'
import { motion } from 'framer-motion'
import type { FaqItem } from '@/graphql/queries/faq.service'

type Props = {
  /** FAQ с сервера — сразу в HTML для SEO */
  initialFaqs?: FaqItem[]
}

export default function FaqBlock({ initialFaqs = [] }: Props) {
  const [activeId, setActiveId] = useState<number | string | null>(null)
  const { faqs, setFaqs, fetchFaqs } = useFaqStore()

  useEffect(() => {
    if (initialFaqs.length > 0) {
      setFaqs(initialFaqs)
      return
    }
    void fetchFaqs()
  }, [initialFaqs, setFaqs, fetchFaqs])

  const list = faqs.length > 0 ? faqs : initialFaqs

  const toggleFaq = (id: number | string) => {
    setActiveId(activeId === id ? null : id)
  }

  return (
    <section id="faq" className="mb-4 sm:mb-6  md:mb-8 lg:mb-10 py-2 px-2 scroll-mt-[100px]">
      <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
        <h2 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">
          Вопросики
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
        <div className="lg:grid lg:grid-cols-2 flex flex-col gap-3 sm:gap-4 lg:gap-5 h-auto lg:h-[752px] relative transition">
          <div className="faq-block-first-image relative w-full h-[180px] sm:h-[220px] md:h-[260px] lg:h-auto rounded-xl sm:rounded-2xl lg:rounded-[22px] overflow-hidden transition-all duration-500 hover:-translate-y-0.5">
            <Image
              src="/images/image_faq_1.png"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 25vw"
              className="object-cover object-top md:object-center transition-transform duration-500 hover:scale-105"
            />
          </div>
          <div className="relative w-full lg:block hidden lg:row-span-2 rounded-2xl lg:rounded-[22px] overflow-hidden transition-all duration-500 hover:-translate-y-0.5">
            <Image
              src="/images/image_faq_3.png"
              alt=""
              fill
              sizes="25vw"
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>

          <div className="relative w-full lg:block hidden lg:row-span-2 rounded-2xl lg:rounded-[22px] overflow-hidden transition-all duration-500 hover:-translate-y-0.5">
            <Image
              src="/images/image_faq_2.png"
              alt=""
              fill
              sizes="25vw"
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>

          <div className="hidden md:block relative w-full h-[180px] sm:h-[220px] md:h-[260px] lg:h-auto rounded-xl sm:rounded-2xl lg:rounded-[22px] overflow-hidden transition-all duration-500 hover:-translate-y-0.5">
            <Image
              src="/images/image_faq_4.png"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 25vw"
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
        </div>

        <ul className="flex flex-col divide-y divide-borderdarkgrey border-t border-borderdarkgrey">
          {list.map((item) => {
            const isActive = activeId === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggleFaq(item.id)}
                  className="w-full text-left py-4 sm:py-5 flex items-center justify-between gap-4 select-none transition-all hover:opacity-70"
                  aria-expanded={isActive}
                >
                  <p className="text-md sm:text-[18px] md:text-[20px] font-semibold text-black leading-tight">
                    {item.title}
                  </p>
                  <motion.div
                    animate={{ rotate: isActive ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0"
                  >
                    <Image
                      src="/arrow-down.svg"
                      alt=""
                      width={28}
                      height={28}
                      className="w-6 h-6 sm:w-7 sm:h-7"
                    />
                  </motion.div>
                </button>

                <motion.div
                  initial={false}
                  animate={{
                    height: isActive ? 'auto' : 0,
                    opacity: isActive ? 1 : 0,
                  }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div
                    className="text-[14px] sm:text-[15px] md:text-md text-black/70 leading-5 sm:leading-[22px] pb-4 sm:pb-5 faq-answer [&_a]:underline [&_a]:text-[#3D83F6] hover:[&_a]:opacity-80"
                    dangerouslySetInnerHTML={{ __html: item.answer }}
                  />
                </motion.div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
