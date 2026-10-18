import { FC } from 'react'
import { ItemGroups } from '@/types/product'

interface ProductTagProps {
  tag: ItemGroups
}

const ProductTag: FC<ProductTagProps> = ({ tag }) => {
  return (
    <div className="border border-bordergrey pt-1 pb-1 pl-2 pr-2 bg-white rounded-full flex item-center justify-center ">
      <p
        className="font-semibold text-[14px]"
        style={{ letterSpacing: '-0.01em' }}
      >
        {tag.title}
      </p>{' '}
    </div>
  )
}

export default ProductTag
