'use client'

import React from 'react'
import Image from 'next/image'
import { parseArticleContent } from '@/lib/articles'

export type RenderEditorJsOptions = {
  /** Для статей: обычный или полужирный абзац */
  bodyEmphasis?: 'normal' | 'semibold'
  /** Страница аромата: компактная типографика body */
  bodyPreset?: 'article' | 'aroma'
}

function resolveBodyTypography(options?: RenderEditorJsOptions): {
  paragraph: string
  listItem: string
} {
  if (options?.bodyPreset === 'aroma') {
    const t =
      'font-normal text-xs sm:text-sm md:text-md select-none text-black whitespace-pre-line'
    return { paragraph: t, listItem: t }
  }
  if (options?.bodyEmphasis === 'semibold') {
    return {
      paragraph:
        'font-semibold text-base sm:text-lg leading-relaxed text-black whitespace-pre-line',
      listItem:
        'font-semibold text-base sm:text-lg leading-relaxed text-black',
    }
  }
  return {
    paragraph:
      'font-normal text-base sm:text-lg leading-relaxed text-black/90 whitespace-pre-line',
    listItem:
      'font-normal text-base sm:text-lg leading-relaxed text-black/90',
  }
}

/** Рендер JSON Editor.js / строки из поля content страницы Saleor */
export function renderEditorJsContent(
  content: unknown,
  options?: RenderEditorJsOptions,
) {
  if (!content) return null

  const parsed = parseArticleContent(content)
  const { paragraph: pClass, listItem: liClass } =
    resolveBodyTypography(options)

  if (typeof parsed === 'string') {
    const text = parsed.replace(/<[^>]*>/g, '').trim()
    if (!text) return null
    return (
      <section className="w-full">
        <p className={pClass}>{text}</p>
      </section>
    )
  }

  if (parsed?.blocks?.length) {
    return parsed.blocks
      .map((block: any, index: number) => {
        if (block.type === 'paragraph' && block.data?.text) {
          const text = block.data.text
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim()
          return (
            <section key={index} className="w-full">
              <p className={pClass}>{text}</p>
            </section>
          )
        }
        if (block.type === 'header' && block.data?.text) {
          const level = Math.min(block.data.level || 2, 6)
          const text = block.data.text
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim()
          const HeadingTag = `h${level}` as
            | 'h1'
            | 'h2'
            | 'h3'
            | 'h4'
            | 'h5'
            | 'h6'
          return (
            <section key={index} className="w-full">
              {React.createElement(
                HeadingTag,
                { className: 'font-bold text-xl sm:text-2xl mb-4' },
                text,
              )}
            </section>
          )
        }
        if (block.type === 'list' && block.data?.items) {
          const ListTag = (block.data.style === 'ordered' ? 'ol' : 'ul') as
            | 'ol'
            | 'ul'
          return (
            <section key={index} className="w-full">
              {React.createElement(
                ListTag,
                { className: 'list-disc list-inside space-y-2' },
                block.data.items.map((item: string, itemIndex: number) => (
                  <li
                    key={itemIndex}
                    className={liClass}
                    dangerouslySetInnerHTML={{
                      __html: item.replace(/&nbsp;/g, ' '),
                    }}
                  />
                )),
              )}
            </section>
          )
        }
        if (block.type === 'image' && block.data?.file?.url) {
          return (
            <section key={index} className="w-full flex flex-col gap-4">
              <div className="w-full relative aspect-[16/9] sm:aspect-[4/3] overflow-hidden rounded-xl">
                <Image
                  src={block.data.file.url}
                  alt={block.data.caption || 'Article image'}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 768px, 768px"
                  className="object-cover"
                />
              </div>
              {block.data.caption && (
                <p className="font-normal text-base text-black/70 text-center italic">
                  {block.data.caption}
                </p>
              )}
            </section>
          )
        }
        return null
      })
      .filter(Boolean)
  }

  return null
}
