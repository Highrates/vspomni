'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ProductNode } from '@/graphql/types/product.types'

interface SearchResultsProps {
  products: ProductNode[]
  loading?: boolean
  onClose?: () => void
}

export default function SearchResults({ products, loading, onClose }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="absolute top-full left-0 w-full bg-white border-t border-black/10 shadow-lg z-50 max-h-96 overflow-y-auto mt-2">
        <div className="px-8 py-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="absolute top-full left-0 w-full bg-white border-t border-black/10 shadow-lg z-50 mt-2">
        <div className="px-8 py-4">
          <p className="text-sm text-black/60 py-4">Товары не найдены</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 w-full bg-white border-t border-black/10 shadow-lg z-50 max-h-96 overflow-y-auto mt-2">
      <div className="px-8 py-4">
        <div className="space-y-2">
          {products.map((product) => {
            // Получаем цену из defaultVariant
            const price = (product.defaultVariant as any)?.pricing?.price?.gross;
            const thumbnail = product.thumbnail?.url || product.media?.[0]?.url;

            return (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                onClick={onClose}
                className="flex items-center gap-4 p-3 hover:bg-black/5 rounded-lg transition-colors group"
              >
                {thumbnail && (
                  <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden">
                    <Image
                      src={thumbnail}
                      alt={product.name || 'Product'}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-black group-hover:text-black/80 truncate">
                    {product.name}
                  </h4>
                  {price && (
                    <p className="text-xs text-black/60 mt-1">
                      {parseFloat(price.amount).toFixed(2)} {price.currency}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        {products.length >= 10 && (
          <div className="mt-4 pt-4 border-t border-black/10">
            <Link
              href={`/catalog?search=${encodeURIComponent(products[0]?.name || '')}`}
              onClick={onClose}
              className="text-sm text-black/80 hover:text-black font-medium"
            >
              Показать все результаты →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

