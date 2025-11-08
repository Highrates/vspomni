import { FC } from 'react'
import { productGroupItem } from '@/lib/mock/products'

interface ProductTagProps {
  tag: productGroupItem
}

interface TagItem {
  id: number
  key: productGroupItem
  image: string
  title: string
}

interface ProductTagProps {
  tag: productGroupItem
}

const tags: TagItem[] = [
  {
    id: 1,
    key: 'sweet',
    image: '/images/hero-right-1.jpg',
    title: 'Cладкий 🤤',
  },
  {
    id: 2,
    key: 'flower',
    image: '/images/hero-right-1.jpg',
    title: 'Цветочный 🌸',
  },
  {
    id: 3,
    key: 'wood',
    image: '/images/hero-right-1.jpg',
    title: 'Древесный \uD83E\uDEB5',
  },
]

const ProductTag: FC<ProductTagProps> = ({ tag }) => {
  const foundTag = tags.find((item) => item.key === tag)

  if (!foundTag) {
    return null
  }

  return (
    <div className="border border-bordergrey pt-1 pb-1 pl-2 pr-2 bg-white rounded-full flex item-center justify-center ">
      <p
        className="font-semibold text-[14px]"
        style={{ letterSpacing: '-0.01em' }}
      >
        {foundTag.title}
      </p>{' '}
    </div>
  )
}

export default ProductTag
