'use client'

type ProductCardProps = {
  title: string
  volume: string
  quantity: string
  oldPrice: string
  newPrice: string
  imageUrl: string
}

export const ProductCard = ({
  title,
  volume,
  quantity,
  oldPrice,
  newPrice,
  imageUrl,
}: ProductCardProps) => {
  return (
    <div className="flex items-center gap-4 p-[11px] border rounded-lg shadow-md mb-4">
      <img
        src={imageUrl}
        alt={title}
        className="w-24 h-24 object-cover rounded-[20px]"
      />
      <div className="flex-1 flex flex-col justify-around h-24">
        <div className="mb-2.5">
          {' '}
          <div className="font-semibold mb-1 text-5 truncate">
            {' '}
            <span>{title}</span>
          </div>
          <div className="text-sm text-black-500">
            <span>{volume}</span>
          </div>
        </div>
        <div className="font-semibold text-xl">{quantity}</div>{' '}
      </div>
      <div className="text-right flex h-24 items-end">
        {' '}
        <div className="mr-1.5 line-through font-semibold text-xl text-gray-400">
          {oldPrice}
        </div>
        <div className="font-semibold text-xl">{newPrice}</div>
      </div>
    </div>
  )
}
