import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { sortCatalogCategories } from '@/lib/category/catalogCategories'
import type { Category } from '@/types/category'

type Props = {
  categories: Category[]
  /** Не показывать карточку текущей категории (страница /category/[slug]) */
  excludeSlug?: string
}

export default function CatalogCategoryBannersView({
  categories,
  excludeSlug,
}: Props) {
  const sortedCategories = sortCatalogCategories(categories, excludeSlug)

  if (sortedCategories.length === 0) return null

  return (
    <div className="flex w-full flex-col gap-5 sm:gap-6 md:gap-8 lg:gap-10 mb-10 sm:mb-12 md:mb-16 lg:mb-20">
      {sortedCategories.map((category: Category, i: number) => (
        <Link
          key={category.id}
          href={'/category/' + encodeURIComponent(category.slug)}
          className="block w-full h-[280px] sm:h-[350px] md:h-[450px] lg:h-[598px] rounded-[10px] sm:rounded-[12px] lg:rounded-[20px] z-1 relative group overflow-hidden touch-manipulation"
          prefetch
        >
          <div
            className={
              'w-full h-[280px] sm:h-[350px] md:h-[450px] lg:h-[598px] rounded-[10px] sm:rounded-[12px] lg:rounded-[20px] z-2 absolute flex flex-col justify-between p-4 sm:p-6 md:p-10 lg:p-13.5 bg-linear-to-r from-[#00000051]' +
              (i % 2 === 0 ? '' : ' items-start lg:items-end ')
            }
          >
            <span className="text-white text-xl sm:text-[28px] md:text-[36px] lg:text-[48px] font-semibold select-none z-3">
              {category.name}
            </span>
            {category.description ? (
              <span
                dangerouslySetInnerHTML={{
                  __html: category.description,
                }}
                className="text-white w-full sm:w-[400px] md:w-[450px] lg:w-[559px] text-xs sm:text-sm md:text-base lg:text-lg font-normal select-none z-3"
              />
            ) : null}
          </div>

          <div className="hidden sm:flex absolute bottom-4 right-4 md:bottom-5 md:right-5 lg:bottom-6 lg:right-6 z-10 w-[48px] h-[48px] md:w-[56px] md:h-[56px] rounded-full bg-white/80 backdrop-blur-[10px] items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <ArrowUpRight
              className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] text-black"
              strokeWidth={1.5}
            />
          </div>
          {category.backgroundImage ? (
            <Image
              src={category.backgroundImage}
              alt={category.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1728px) 1536px, 1536px"
              className="rounded-[12px] lg:rounded-[20px] object-cover object-top-right transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 rounded-[12px] lg:rounded-[20px] bg-neutral-300" />
          )}
        </Link>
      ))}
    </div>
  )
}
