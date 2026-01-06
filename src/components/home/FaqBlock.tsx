'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useFaqStore } from '@/stores/useFaq'
import { motion } from 'framer-motion'

export default function FaqBlock() {
  const [activeId, setActiveId] = useState<number | null | string>(null)

  const { faqs, fetchFaqs } = useFaqStore()
  
    useEffect(() => {
      fetchFaqs()
    }, [])

  const toggleFaq = (id: number | string) => {
    setActiveId(activeId === id ? null : id)
  }

  return (
    <section id="faq" className="mb-8 sm:mb-12  md:mb-20 lg:mb-[180px] py-4 px-2 scroll-mt-[100px]">
      <div className="flex items-center justify-between mb-6 sm:mb-8 md:mb-12 lg:mb-14">
        <h3 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">FAQ</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
        {/* ====== IMAGE GRID (Correct fixed layout) ====== */}

        <div className="lg:grid lg:grid-cols-2 flex flex-col gap-3 sm:gap-4 lg:gap-5 h-auto lg:h-[752px] relative transition">
          <div className="relative w-full h-[180px] sm:h-[220px] md:h-[260px] lg:h-auto rounded-xl sm:rounded-2xl lg:rounded-[22px] overflow-hidden 
                        transition-all duration-500 hover:-translate-y-0.5">
            <Image
              src="/images/image_faq_1.png"
              alt="faq image"
              fill
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
           <div className="relative w-full lg:block hidden lg:row-span-2 rounded-2xl lg:rounded-[22px] 
                          overflow-hidden transition-all duration-500 hover:-translate-y-0.5">
            <Image
              src="/images/image_faq_3.png"
              alt="faq image"
              fill
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>

          <div className="relative w-full lg:block hidden lg:row-span-2 rounded-2xl lg:rounded-[22px] 
                          overflow-hidden transition-all duration-500 hover:-translate-y-0.5">
            <Image
              src="/images/image_faq_2.png"
              alt="faq image"
              fill
             className="object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>

          <div className="relative w-full h-[180px] sm:h-[220px] md:h-[260px] lg:h-auto rounded-xl sm:rounded-2xl lg:rounded-[22px] 
                        overflow-hidden transition-all duration-500 hover:-translate-y-0.5">
            <Image
              src="/images/image_faq_4.png"
              alt="faq image"
              fill
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>

    </div>

        {/* ====== FAQ LIST ====== */}
        <ul className="flex flex-col divide-y divide-borderdarkgrey border-t border-borderdarkgrey">
          {faqs.map((item) => {
            const isActive = activeId === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => toggleFaq(item.id)}
                  className="w-full text-left py-4 sm:py-5 flex items-center justify-between gap-4 select-none transition-all hover:opacity-70"
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
                      alt="toggle"
                      width={28}
                      height={28}
                      className="w-6 h-6 sm:w-7 sm:h-7"
                    />
                  </motion.div>
                </button>

                {/* Answer */}
                <motion.div
                  initial={false}
                  animate={{
                    height: isActive ? 'auto' : 0,
                    opacity: isActive ? 1 : 0
                  }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <p className="text-[14px] sm:text-[15px] md:text-md text-black/70 leading-5 sm:leading-[22px] pb-4 sm:pb-5">
                    {item.answer}
                  </p>
                </motion.div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}