'use client'

export default function BackButton() {
  return (
    <button type="button" className="display flex mb-8 mt-8">
      <img src="/arrow-left-logo.svg" alt="arrow-left-logo.svg" />
      <span className="font-medium text-[16px]">Вернуться назад</span>
    </button>
  )
}
