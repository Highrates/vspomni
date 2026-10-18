'use client'

type Product = {
  id: string
  title: string
  price: number
  thumbnail: string
  capacity: string[]
  groups: string[]
  overview: string
  about: {
    description: string
    specs: string
    contain: string
  }
  image: string[]
}

type ProductCardProps = {
  product: Product
}

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <div className="flex items-center gap-4 p-[11px] border rounded-lg shadow-md mb-4 hover:shadow-lg transition-shadow cursor-pointer">
      <img
        src={product.thumbnail}
        alt={product.title}
        className="w-24 h-24 object-cover rounded-[20px]"
      />
      <div className="flex-1 flex flex-col justify-around h-24">
        <div className="mb-2.5">
          <div className="font-semibold mb-1 text-5 truncate">
            <span>{product.title}</span>
          </div>
          <div className="text-sm text-black-500">
            <span>{product.capacity.join(', ')}</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          {product.groups.slice(0, 3).map((group, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600"
            >
              {group}
            </span>
          ))}
        </div>
      </div>
      <div className="text-right flex h-24 items-end">
        <div className="font-semibold text-xl">{product.price} ₽</div>
      </div>
    </div>
  )
}