'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface StoryGroup {
  id: string
  title: string
  stories: string[]
}

export default function StoryViewer({
  group,
  onClose,
}: {
  group: StoryGroup
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)

  // Сброс индекса при изменении группы
  useEffect(() => {
    setIndex(0)
    setProgress(0)
    setDirection(null)
  }, [group.id])

  const handleNext = useCallback(() => {
    setIndex((prev) => {
      if (prev < group.stories.length - 1) {
        setDirection('next')
        return prev + 1
      } else {
        onClose()
        return prev
      }
    })
  }, [group.stories.length, onClose])

  // авто-переключение
  useEffect(() => {
    setProgress(0)
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = (Date.now() - start) / 4000
      setProgress(Math.min(elapsed * 100, 100))
      if (elapsed >= 1) {
        handleNext()
      }
    }, 50)
    return () => clearInterval(timer)
  }, [index, handleNext])


  const handlePrev = () => {
    if (index > 0) {
      setDirection('prev')
      setIndex((prev) => prev - 1)
    } else {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 touch-none"
        style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Прогресс-бары */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[60%] flex gap-2">
          {group.stories.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden"
            >
              {i === index && (
                <motion.div
                  className="h-full bg-white"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: 'linear', duration: 0.05 }}
                />
              )}
              {i < index && <div className="h-full bg-white w-full" />}
            </div>
          ))}
        </div>

        {/* Картинка сториса */}
        <motion.img
          key={index}
          src={group.stories[index]}
          alt={`story-${index}`}
          className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain select-none"
          initial={{
            opacity: 0,
            x: direction === 'next' ? 80 : direction === 'prev' ? -80 : 0,
          }}
          animate={{ opacity: 1, x: 0 }}
          exit={{
            opacity: 0,
            x: direction === 'next' ? -80 : direction === 'prev' ? 80 : 0,
          }}
          transition={{ duration: 0.3 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, { offset }) => {
            if (offset.x < -80) handleNext()
            if (offset.x > 80) handlePrev()
          }}
        />

        {/* кликабельные зоны */}
        <div
          className="absolute left-0 top-0 w-1/2 h-full cursor-pointer"
          onClick={handlePrev}
        />
        <div
          className="absolute right-0 top-0 w-1/2 h-full cursor-pointer"
          onClick={handleNext}
        />

        {/* крестик */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white text-xl font-semibold hover:opacity-80 transition"
        >
          ✕
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
