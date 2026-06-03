'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getComingSoonCategories } from '@/graphql/queries/category.service'
import { Category } from '@/types/category'
import Link from 'next/link'

type Props = {
  /** Категории с сервера (SSR) — ссылки сразу в HTML */
  initialCategories?: Category[]
}

export default function ComingSoon({ initialCategories = [] }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [loading, setLoading] = useState(initialCategories.length === 0)

  useEffect(() => {
    setCategories(initialCategories)
    setLoading(initialCategories.length === 0)
  }, [initialCategories])

  useEffect(() => {
    if (initialCategories.length > 0) return

    let cancelled = false

    const fetchCategories = async () => {
      try {
        const data = await getComingSoonCategories()
        if (!cancelled && data.length > 0) {
          setCategories(data)
        }
      } catch (error) {
        console.error('Failed to fetch coming soon categories:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCategories()
    return () => {
      cancelled = true
    }
  }, [initialCategories.length])

  if (loading) {
    return (
      <section className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-4 sm:mb-6 md:mb-8 lg:mb-10 px-2">
        <div className="mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-2xl bg-gray-200 aspect-[3/2] animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (categories.length === 0) {
    return null
  }

  return (
    <section className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-4 sm:mb-6 md:mb-8 lg:mb-10 px-2">
      <div className="mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category, i) => (
            <Link
              key={category.id}
              href={`/category/${encodeURIComponent(category.slug)}`}
              className="block"
            >
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="relative overflow-hidden rounded-2xl cursor-pointer group"
              >
                <div className="relative w-full aspect-[3/2]">
                  {category.backgroundImage ? (
                    <Image
                      src={category.backgroundImage}
                      alt={category.name || 'Category image'}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : null}
                </div>

                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-all duration-500" />

                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <h3 className="text-white md:text-logo sm:text-[25px] text-xl font-semibold drop-shadow-md">
                    {category.name}
                  </h3>
                  <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition">
                    <ArrowUpRight
                      size={18}
                      strokeWidth={1.8}
                      className="text-black"
                    />
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
