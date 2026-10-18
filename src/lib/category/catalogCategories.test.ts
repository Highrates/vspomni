import { describe, expect, it } from 'vitest'
import {
  pickComingSoonCategories,
  COMING_SOON_CATEGORY_SLUGS,
} from './catalogCategories'
import type { Category } from '@/types/category'

const cat = (slug: string, name: string, img?: string): Category =>
  ({
    id: slug,
    name,
    slug,
    backgroundImage: img,
  }) as Category

describe('pickComingSoonCategories', () => {
  it('берёт категории по Nest slug', () => {
    const list = [
      cat('diffuzory', 'Диффузоры', '/a.jpg'),
      cat(COMING_SOON_CATEGORY_SLUGS[0]!, 'Парфюм', '/b.jpg'),
      cat(COMING_SOON_CATEGORY_SLUGS[1]!, 'Саше', '/c.jpg'),
    ]
    const picked = pickComingSoonCategories(list)
    expect(picked.map((c) => c.slug)).toEqual([
      COMING_SOON_CATEGORY_SLUGS[0],
      COMING_SOON_CATEGORY_SLUGS[1],
    ])
  })

  it('предпочитает slug-список, а не Saleor GID как id', () => {
    const list = [
      { ...cat('diffuzory', 'Диффузоры', '/a.jpg'), id: 'Q2F0ZWdvcnk6Mw==' },
      cat(COMING_SOON_CATEGORY_SLUGS[0]!, 'Парфюм', '/b.jpg'),
    ]
    expect(pickComingSoonCategories(list).map((c) => c.slug)).toEqual([
      COMING_SOON_CATEGORY_SLUGS[0],
    ])
  })
})
