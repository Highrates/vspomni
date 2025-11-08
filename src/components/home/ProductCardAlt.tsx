import Image from 'next/image'
import Link from 'next/link'
import ProductTag from '../ui/ProductTag'
import { productsGridItem, productGroupItem } from '@/lib/mock/products'

export default function ProductCard({
  product,
}: {
  product: productsGridItem
}) {
  return (
    <div className="rounded-xl overflow-hidden bg-white hover:shadow-lg transition flex flex-col gap-4">
      <div className="group w-full min-h-96 relative overflow-hidden transition-all duration-500 group-hover:-translate-y-0.5">
        <Image
          src={product.image[0]}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 24vw, (max-width: 1600px) 23px, 369px"
          className="rounded-[16px] object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* бейдж 100 мл */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-[12px] font-medium text-black px-2 py-0.5 rounded-full border border-neutral-200 ">
          100 мл
        </div>
      </div>
      <div className="flex flex-row justify-between items-start">
        <div className="flex flex-col gap-2.5 pl-2 pb-4">
          <Link
            href={'/product/' + product.id}
            className="font-semibold text-brand text-xl select-none cursor-pointer"
          >
            {product.title}
          </Link>
          <div className="flex flex-wrap gap-2 w-full">
            {product.groups.map((tag: productGroupItem, index: number) => (
              <ProductTag tag={tag} key={tag + '_' + index} />
            ))}
          </div>
          <p className="text-brand text-[15px] font-semibold select-none">
            {product.price.toLocaleString()} ₽
          </p>
        </div>

        <Link href={'/product/' + product.id}>
          <button className="rounded-full bg-black  w-[42px]  h-[42px] flex items-center justify-center relative cursor-pointer mr-2">
            <Image
              src="/shopping-bag.svg"
              alt="cart icon"
              width={22}
              height={22}
            />
          </button>
        </Link>
      </div>
    </div>
  )
}
