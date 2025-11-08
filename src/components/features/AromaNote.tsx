import { FC } from 'react'
import Image from 'next/image'
import { mockAromaNotes } from '@/lib/mock/products'

interface AromaNoteProps {
  id: number
}

const AromaNote: FC<AromaNoteProps> = ({ id }) => {
  const foundAromaNote = mockAromaNotes.find((item) => item.id === id)

  if (!foundAromaNote) {
    return null
  }

  return (
    <div className="w-[84px] max-h-[132px] flex flex-col item-start justify-start gap-2">
      <div className="w-full h-[84px] rounded-xl relative overflow-hidden">
        <Image
          src={foundAromaNote.image}
          alt="image one"
          fill
          sizes="(max-width: 768px) 84vw, (max-width: 1200px) 84px, 84px"
        />
      </div>
      <p className="w-full font-normal text-center text-xs">
        {foundAromaNote.title}
      </p>
    </div>
  )
}

export default AromaNote
