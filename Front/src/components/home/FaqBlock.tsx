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
    <section id="faq" className="mb-4 scroll-mt-[100px] px-0 py-2 sm:mb-6 sm:px-2 md:mb-8 lg:mb-10">
      <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
        <h2 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">
          Вопросики
        </h2>
      </div>

      <ul className="flex flex-col divide-y divide-borderdarkgrey border-t border-borderdarkgrey w-full">
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
                  className="faq-answer pb-4 text-[14px] leading-5 text-black/70 sm:pb-5 sm:text-[15px] sm:leading-[22px] md:text-md [&_a]:text-[#3D83F6] [&_a]:underline hover:[&_a]:opacity-80 [&_img]:h-auto [&_img]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: item.answer }}
                />
              </motion.div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
