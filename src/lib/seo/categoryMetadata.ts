import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata'

export function buildCategoryMetadata(
  categoryName: string,
  canonicalPath: string,
  productCount: number,
): Metadata {
  const description =
    productCount > 0
      ? `${categoryName} — ${productCount} ${productCountLabel(productCount)} в интернет-магазине ВСПОМНИ. Интерьерные ароматы для дома с доставкой по России.`
      : `${categoryName} — каталог интерьерных ароматов ВСПОМНИ.`

  return buildPageMetadata({
    title: `${categoryName} — каталог`,
    description,
    canonicalPath,
  })
}

function productCountLabel(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'товаров'
  if (mod10 === 1) return 'товар'
  if (mod10 >= 2 && mod10 <= 4) return 'товара'
  return 'товаров'
}
