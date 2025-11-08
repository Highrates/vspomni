'use client'

import { useState } from 'react'
import Image from 'next/image'
import { mockFaq } from '@/lib/mock/faq'
import { motion } from 'framer-motion'

export default function FaqBlock() {
  const [activeId, setActiveId] = useState<number | null | string>(null)

  const toggleFaq = (id: number | string) => {
    setActiveId(activeId === id ? null : id)
  }

  return (
    <section className="mb-20 sm:mb-28 md:mb-36 lg:mb-[180px] px-4 sm:px-6 md:px-8">
      <div className="flex items-center justify-between mb-8 sm:mb-10 md:mb-12 lg:mb-14">
        <h3 className="text-[32px] sm:text-[38px] md:text-[42px] lg:text-[48px] font-semibold select-none">FAQ</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
        {/* ====== IMAGE GRID (Correct fixed layout) ====== */}
        <div className="lg:grid lg:grid-cols-2 flex flc gap-4 sm:gap-5">
          <div className="relative w-full  rounded-2xl sm:rounded-[22px] overflow-hidden">
            <Image
              src="/images/image_faq_1.png"
              alt="faq image"
              fill
              className="object-cover"
            />
          </div>

          <div className="relative w-full lg:block hidden lg:row-span-2 rounded-2xl sm:rounded-[22px] overflow-hidden">
            <Image
              src="/images/image_faq_3.png"
              alt="faq image"
              fill
              className="object-cover"
            />
          </div>

          <div className="relative w-full lg:block hidden lg:row-span-2 rounded-2xl sm:rounded-[22px] overflow-hidden">
            <Image
              src="/images/image_faq_2.png"
              alt="faq image"
              fill
              className="object-cover"
            />
          </div>

          <div className="relative w-full not-lg:h-[200px] rounded-2xl sm:rounded-[22px] overflow-hidden">
            <Image
              src="/images/image_faq_4.png"
              alt="faq image"
              fill
              className="object-cover"
            />
          </div>
        </div>


        {/* ====== FAQ LIST ====== */}
        <ul className="flex flex-col divide-y divide-borderdarkgrey border-t border-borderdarkgrey">
          {mockFaq.map((item) => {
            const isActive = activeId === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => toggleFaq(item.id)}
                  className="w-full text-left py-4 sm:py-5 flex items-center justify-between gap-4 select-none transition-all hover:opacity-70"
                >
                  <p className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold text-black leading-tight">
                    {item.title}
                  </p>
                  <motion.div
                    animate={{ rotate: isActive ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex-shrink-0"
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
                  <p className="text-[14px] sm:text-[15px] md:text-[16px] text-black/70 leading-[20px] sm:leading-[22px] pb-4 sm:pb-5">
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