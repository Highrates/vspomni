'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface StoryGroup {
  id: string
  title: string
  stories: string[]
}

export default function StoryViewer({
  groups,
  currentGroupIndex,
  initialStoryIndex = 0,
  onClose,
  onGoToGroup,
}: {
  groups: StoryGroup[]
  currentGroupIndex: number
  initialStoryIndex?: number
  onClose: () => void
  onGoToGroup: (groupIndex: number) => void
}) {
  const group = groups[currentGroupIndex]
  const [index, setIndex] = useState(initialStoryIndex)
  const [progress, setProgress] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const touchStartX = useRef<number | null>(null)

  // Синхронизация индекса сторис при смене группы (или initialStoryIndex от родителя)
  useEffect(() => {
    setIndex(initialStoryIndex)
    setProgress(0)
    setDirection(null)
  }, [group?.id, currentGroupIndex, initialStoryIndex])

  const goToNextGroup = useCallback(() => {
    const nextIndex = currentGroupIndex + 1
    if (nextIndex >= groups.length) {
      onClose()
    } else {
      onGoToGroup(nextIndex)
    }
  }, [currentGroupIndex, groups.length, onClose, onGoToGroup])

  const goToPrevGroup = useCallback(() => {
    const prevIndex = currentGroupIndex - 1
    if (prevIndex < 0) {
      onClose()
    } else {
      onGoToGroup(prevIndex)
    }
  }, [currentGroupIndex, onClose, onGoToGroup])

  const handleNext = useCallback(() => {
    if (!group) return
    if (index < group.stories.length - 1) {
      setDirection('next')
      setIndex((prev) => prev + 1)
    } else {
      goToNextGroup()
    }
  }, [group, index, goToNextGroup])

  // авто-переключение
  useEffect(() => {
    if (!group) return
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
  }, [group?.id, index, handleNext])

  const handlePrev = useCallback(() => {
    if (!group) return
    if (index > 0) {
      setDirection('prev')
      setIndex((prev) => prev - 1)
    } else {
      goToPrevGroup()
    }
  }, [group, index, goToPrevGroup])

  const minSwipe = 60
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    // Как в Instagram: свайп влево = следующий кружок, свайп вправо = пред. слайд или пред. кружок
    if (dx < -minSwipe) goToNextGroup()
    else if (dx > minSwipe) handlePrev()
  }

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const threshold = 40
      const { offset, velocity } = info
      if (offset.x < -threshold || velocity.x < -150) goToNextGroup()
      else if (offset.x > threshold || velocity.x > 150) handlePrev()
    },
    [goToNextGroup, handlePrev]
  )

  if (!group || group.stories.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90"
        style={{ height: '100dvh', minHeight: '-webkit-fill-available', touchAction: 'none' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
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

        {/* Картинка сториса — свайп влево = след. кружок, вправо = пред. слайд/кружок; тап по зонам = слайды */}
        <motion.img
          key={index}
          src={group.stories[index]}
          alt={`story-${index}`}
          className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain select-none touch-none"
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
          dragConstraints={{ left: -120, right: 120 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
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
