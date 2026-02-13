import Image from 'next/image'
import Link from 'next/link'

interface AllAromasItemProps {
  item: {
    id: string
    slug: string
    title: string
    text: string
    image: string
  }
}

export default function AllAromasItem({ item }: AllAromasItemProps) {
  return (
    <Link
      href={`/catalog/aroma/${item.slug}`}
      className="rounded-xl bg-white flex flex-col hover:shadow-lg transition-shadow"
    >
      {/* Image Container */}
      <div className="w-full aspect-square sm:aspect-[369/384] relative overflow-hidden rounded-[12px] sm:rounded-[16px] bg-neutral-50">
        {item.image && (
          <Image
            src={item.image}
            alt={item.text || item.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1600px) 25vw, 369px"
            className="rounded-[12px] sm:rounded-[16px] object-cover"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 sm:gap-2 pt-2 sm:pt-3 pb-2 sm:pb-4 px-0.5 sm:px-1">
        {/* Text/Title */}
        {item.text && (
          <h3 className="font-semibold text-brand text-[13px] sm:text-base lg:text-lg select-none cursor-pointer line-clamp-2 leading-tight">
            {item.text}
          </h3>
        )}
        {!item.text && item.title && (
          <h3 className="font-semibold text-brand text-[13px] sm:text-base lg:text-lg select-none cursor-pointer line-clamp-2 leading-tight">
            {item.title}
          </h3>
        )}
      </div>
    </Link>
  )
}
