'use client'

export default function BackButton() {
  return (
    <button
      type="button"
      className="display flex items-center gap-2 mb-8 mt-8 cursor-pointer text-gray-600 hover:text-black transition-colors"
      onClick={()=>window.history.back()}
    >
      <img src="/arrow-left-logo.svg" alt="arrow-left" className="w-5 h-5" />
      <span className="font-medium text-[16px]">вернуться назад</span>
    </button>
  )
}
