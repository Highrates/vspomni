import Link from 'next/link'
import Image from 'next/image'

interface NewsCardProps {
  date: string;
  title: string;
  shortText: string; 
  imageUrl: string;
  articleUrl: string;
}

export default function NewsCard({ date, title, shortText, imageUrl, articleUrl }: NewsCardProps) {
  const hasImage = imageUrl && imageUrl.trim() !== ''
  
  return (
    <div className={`w-full overflow-hidden grid ${hasImage ? 'grid-rows-[200px_auto] sm:grid-rows-[240px_auto] lg:grid-rows-1 lg:grid-cols-[200px_auto]' : 'grid-rows-1'} border border-borderdarkgrey rounded-xl`}>
      {hasImage && (
        <div className="relative w-full h-full cursor-pointer row-span-1">
          <Image 
            src={imageUrl} 
            alt={title}
            fill
            sizes="(max-width: 1024px) 100vw, 274px"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-col px-4 sm:px-5 md:px-6 py-5 sm:py-6 md:py-8 gap-4 sm:gap-5 md:gap-6">
        <Link href={articleUrl || "/"} className="flex flex-col gap-1 sm:gap-1.5">
          <p className="text-sm sm:text-[15px] md:text-base text-textgrey select-none">{date}</p>
          <h5 className="text-lg sm:text-xl md:text-2xl text-black font-semibold select-none leading-tight">{title}</h5>
        </Link>
        <p className="line-clamp-6 sm:line-clamp-7 lg:line-clamp-8 text-sm sm:text-[15px] md:text-base font-normal leading-5 sm:leading-6 text-black/80">
          {shortText}
        </p>
      </div>
    </div>
  )
}