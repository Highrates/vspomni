'use client'

import Image from 'next/image'
import BackButton from '@/components/ui/BackButton'

export default function ArticlePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-0">
      <BackButton />
      <h2 className="mb-10 sm:mb-14 font-semibold text-2xl sm:text-3xl select-none">
        Заголовок статьи
      </h2>

      <div className="flex flex-col space-y-10 sm:space-y-12">
        {/* Image 1 */}
        <section className="w-full relative aspect-[16/9] sm:aspect-[4/2] overflow-hidden rounded-xl">
          <Image
            src="/images/article1.png"
            alt="image one"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 768px, 768px"
            className="object-cover"
          />
        </section>

        {/* Paragraph 1 */}
        <section className="w-full">
          <p className="font-normal text-base sm:text-lg leading-relaxed text-black/90">
            As we state in our Playbook, we are Design-led. We solve problems
            through Design, which is our product development driver. This stems
            from the fact that Design integrates business goals, product
            requirements, user needs, strategy, technology, and marketing. In
            short, we embrace the fact that Design can make or break a business.
            Of course, Design isn’t the only ingredient in our recipe, but it is
            the main one. Each project is different, and based on its
            requirements, we adapt our processes and approaches accordingly. For
            instance, part of our approach to building successful e-commerce
            platforms is ensuring they are easily manageable from editorial,
            content management, maintenance, logistics, and operations
            perspectives.
          </p>
        </section>

        {/* Section 2 */}
        <section className="w-full">
          <h6 className="font-bold text-xl sm:text-2xl mb-4">
            Like Tetris, but better.
          </h6>
          <p className="font-normal text-base sm:text-lg leading-relaxed text-black/90">
            Many argue 
            <span className="text-blue">Tetris is the best game ever</span>. Who
            are we to disagree? The appeal of blocks has surely reached us and
            our clients, too. And it starts — you guessed it — with Design. Our
            Design process begins with moodboarding so we can align with the
            client and ensure we are on the same page about the visual vibes we
            will build upon. As we draft the Look and Feel, we already consider
            scalability into what will soon become the Design system. This will
            effectively provide a solid foundation that shapes and unifies the
            project's visual and functional aspects. Much like Tetris, i.e. a
            puzzle game, this ensures the website can continue to grow in
            content and pages without compromising its visual qualities.
            Moreover, it guarantees a cohesive integration of the brand identity
            itself.
          </p>
        </section>

        {/* Image 2 with caption */}
        <section className="w-full flex flex-col gap-4">
          <div className="w-full relative aspect-[16/9] sm:aspect-[4/3] overflow-hidden rounded-xl">
            <Image
              src="/images/article2.png"
              alt="image two"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 768px, 768px"
              className="object-cover"
            />
          </div>
          <p className="font-normal text-base text-black/70 text-center italic">
            Capture 1. Title of pic
          </p>
        </section>

        {/* Section 3 */}
        <section className="w-full">
          <h6 className="font-bold text-xl sm:text-2xl mb-4">
            Like Tetris, but better.
          </h6>
          <p className="font-normal text-base sm:text-lg leading-relaxed text-black/90">
            Many argue 
            <span className="text-blue">Tetris is the best game ever</span>. Who
            are we to disagree? The appeal of blocks has surely reached us and
            our clients, too. And it starts — you guessed it — with Design. Our
            Design process begins with moodboarding so we can align with the
            client and ensure we are on the same page about the visual vibes we
            will build upon. As we draft the Look and Feel, we already consider
            scalability into what will soon become the Design system. This will
            effectively provide a solid foundation that shapes and unifies the
            project's visual and functional aspects. Much like Tetris, i.e. a
            puzzle game, this ensures the website can continue to grow in
            content and pages without compromising its visual qualities.
            Moreover, it guarantees a cohesive integration of the brand identity
            itself.
          </p>
        </section>

        {/* Final Section */}
        <section className="w-full">
          <h6 className="font-bold text-xl sm:text-2xl mb-4">
            Like Tetris, but better.
          </h6>
          <p className="font-normal text-base sm:text-lg leading-relaxed text-black/90">
            Many argue 
            <span className="text-blue">Tetris is the best game ever</span>. Who
            are we to disagree? The appeal of blocks has surely reached us and
            our clients, too. And it starts — you guessed it — with Design. Our
            Design process begins with moodboarding so we can align with the
            client and ensure we are on the same page about the visual vibes we
            will build upon. As we draft the Look and Feel, we already consider
            scalability into what will soon become the Design system. This will
            effectively provide a solid foundation that shapes and unifies the
            project's visual and functional aspects. Much like Tetris, i.e. a
            puzzle game, this ensures the website can continue to grow in
            content and pages without compromising its visual qualities.
            Moreover, it guarantees a cohesive integration of the brand identity
            itself.
          </p>
          <p className="font-medium text-base sm:text-lg mt-4 text-gray-500">
            21 Sep 2024
          </p>
        </section>
      </div>
    </article>
  )
}
