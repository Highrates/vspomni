import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function BackButton() {
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  return (
    <button
      onClick={handleBack}
      className=" flex items-center font-semibold cursor-pointer mt-8 mb-10"
      aria-label="Вернуться назад"
    >
      <Image
        src="/to_right.svg"
        alt="all news link"
        width={20}
        height={20}
        className="mr-1 rotate-180"
      />
      <span className="text-left text-md text-black select-none font-medium">
        Вернуться назад
      </span>
    </button>
  )
}
