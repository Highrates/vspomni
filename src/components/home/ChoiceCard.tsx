import { Lock, ShoppingBag } from 'lucide-react'

export interface ChoiceCardProps {
  id: number
  image: string
  name: string
  perfume: string
  date: string
  oldPrice?: string
  price?: string
  locked?: boolean
  thumbnails?: string[]
}

export default function ChoiceCard({
  image,
  name,
  date,
  perfume,
  oldPrice = '15 250 ₽',
  price = '12 890 ₽',
  locked = false,
  thumbnails = [],
}: ChoiceCardProps) {
  return (
    <div className="relative w-full rounded-[20px] overflow-hidden">
      {/* Большое изображение */}
      <div className="relative w-full lg:aspect-498/685 md:aspect-520/685  bg-gray-100">
        <img src={image} alt={name} className="w-full h-full object-cover" />

        {/* Имя и дата */}
        <div className="absolute left-[20px] bottom-[118px] text-white text-[14px] leading-[16px] font-medium drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] select-none">
          {name} • {date}
        </div>

        {/* Белая плашка */}
        <div className="absolute left-[16px] right-[16px] bottom-[16px] flex items-center gap-[12px] px-[16px] py-[12px] bg-white rounded-[16px] shadow-[0_8px_20px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.08)]">
          
          {/* Мини-превью */}
          <div className="w-[56px] h-[56px] rounded-[12px] overflow-hidden border border-[rgba(0,0,0,0.1)]  bg-gray-50">
            <img src={image} alt={perfume} className="w-full h-full object-cover" />
          </div>

          {/* Текст и цена */}
          <div className="flex flex-col flex-1 min-w-0 pr-[8px]">
            <span className="text-[15px] font-semibold text-black leading-tight truncate">
              {perfume}
            </span>

            <div className="flex items-center gap-[6px] mt-[2px] whitespace-nowrap">
              {oldPrice && (
                <span className="text-[13px] text-black/40 line-through whitespace-nowrap">
                  {oldPrice}
                </span>
              )}

              {price && (
                <span className="text-[15px] font-semibold text-black whitespace-nowrap leading-none">
                  {price}
                </span>
              )}
            </div>
          </div>

          {/* мини-превью справа */}
          {thumbnails.length > 0 && (
            <div className="hidden sm:flex items-center gap-[8px] mr-[4px]">
              {thumbnails.slice(0, 2).map((t, i) => (
                <div
                  key={i}
                  className="w-[48px] h-[48px] rounded-[12px] overflow-hidden border border-[rgba(0,0,0,0.1)] bg-gray-50"
                >
                  <img src={t} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Иконка справа (не давим на цену) */}
          <button className="flex items-center justify-center w-[44px] h-[44px] flex-shrink-0 rounded-full bg-black text-white shadow-[0_2px_6px_rgba(0,0,0,0.2)] hover:opacity-85 transition">
            {locked ? (
              <Lock size={18} strokeWidth={2} className="text-white" />
            ) : (
              <ShoppingBag size={18} strokeWidth={2} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
