'use client'

import { useRef, useState, useEffect } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import StoryViewer from './StoryViewer'
import { getAllStories, StoryNode } from '@/graphql/queries/stories.service'

export default function StoryBlock() {
  const swiperRef = useRef<any>(null)
  const [activeStoryGroup, setActiveStoryGroup] = useState<string | null>(null)
  const [stories, setStories] = useState<StoryNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const data = await getAllStories()
        setStories(data)
      } catch (error) {
        console.error('Failed to fetch stories:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStories()
  }, [])

  if (loading) {
    return null
  }

  if (stories.length === 0) {
    return null
  }

  const storyGroups = stories
    .filter(
      (story) => story.isPublished && story.items && story.items.length > 0,
    )
    .sort((a, b) => a.order - b.order)
    .map((story) => ({
      id: story.id,
      title: story.title,
      stories: story.items
        .sort((a, b) => a.order - b.order)
        .map((item) => item.image),
    }))

  const activeGroup = storyGroups.find((g) => g.id === activeStoryGroup)

  return (
    <>
      <section className="mt-6 sm:mt-8 md:mt-10 lg:mt-[40px] mb-8 sm:mb-10 md:mb-12 ">
        <div className="relative flex justify-center lg:overflow-hidden ">
          <div className="relative w-full max-w-[1062px]  pl-4 sm:pl-6 md:pl-8 lg:pl-16 pr-4 sm:pr-6 md:pr-8 lg:pr-10 ">
            {/* Left Navigation Button */}
            <button
              onClick={() => swiperRef.current?.slidePrev()}
              className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-[40px] h-[40px] sm:w-[45px] sm:h-[45px] md:w-[49px] md:h-[49px] rounded-full bg-white shadow hover:shadow-lg transition-shadow left-10 sm:left-0 max-md:hidden  border border-gray-300"
              aria-label="Previous"
            >
              <svg
                width="7"
                height="14"
                viewBox="0 0 7 14"
                fill="none"
                className="w-[6px] h-[12px] sm:w-[7px] sm:h-[14px]"
              >
                <path
                  d="M6 13L1 7L6 1"
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Swiper Container */}
            <Swiper
              modules={[Navigation]}
              onSwiper={(swiper) => (swiperRef.current = swiper)}
              slidesPerView="auto"
              draggable
              spaceBetween={12}
              breakpoints={{
                640: {
                  spaceBetween: 14,
                },
                768: {
                  spaceBetween: 16,
                },
                1024: {
                  spaceBetween: 18,
                },
              }}
              className="popular-swiper overflow-hidden lg:overflow-visible pl-24 sm:pl-28 md:pl-32"
            >
              {storyGroups.map((group) => (
                <SwiperSlide
                  key={group.id}
                  className="!w-auto flex flex-col items-center text-center "
                >
                  <button
                    onClick={() => setActiveStoryGroup(group.id)}
                    className="relative flex items-center justify-center w-[70px] h-[70px] sm:w-[80px] sm:h-[80px] md:w-[88px] md:h-[88px] lg:w-[96px] lg:h-[96px] rounded-full border border-black transition-all duration-300 hover:border-black/60"
                  >
                    <div className="w-[62px] h-[62px] sm:w-[72px] sm:h-[72px] md:w-[79px] md:h-[79px] lg:w-[87px] lg:h-[87px] rounded-full overflow-hidden bg-white">
                      <img
                        src={
                          group.stories[0] ||
                          stories.find((s) => s.id === group.id)?.image ||
                          '/images/image_faq_3.png'
                        }
                        alt={group.title}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </button>
                  <span className="text-[11px] sm:text-[12px] md:text-[13px] leading-[14px] sm:leading-[15px] md:leading-[16px] font-medium mt-1.5 sm:mt-2 text-neutral-700 text-center max-w-[70px] sm:max-w-[80px] md:max-w-[88px] lg:max-w-[96px] truncate">
                    {group.title}
                  </span>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Right Navigation Button */}
            <button
              onClick={() => swiperRef.current?.slideNext()}
              className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-[40px] h-[40px] sm:w-[45px] sm:h-[45px] md:w-[49px] md:h-[49px] rounded-full bg-white shadow hover:shadow-lg transition-shadow -right-1 sm:right-0 max-md:hidden border border-gray-300"
              aria-label="Next"
            >
              <svg
                width="7"
                height="14"
                viewBox="0 0 7 14"
                fill="none"
                className="w-[6px] h-[12px] sm:w-[7px] sm:h-[14px]"
              >
                <path
                  d="M1 13L6 7L1 1"
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {activeStoryGroup && activeGroup && (
        <StoryViewer
          group={activeGroup}
          onClose={() => setActiveStoryGroup(null)}
        />
      )}
    </>
  )
}
