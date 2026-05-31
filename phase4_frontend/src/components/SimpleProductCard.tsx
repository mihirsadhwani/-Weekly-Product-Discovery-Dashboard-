'use client'

import { useState } from 'react'
import type { NewTodayProduct } from '@/types/product'

const CAT_FALLBACK: Record<string, { emoji: string; bg: string }> = {
  Electronics:   { emoji: '📱', bg: 'bg-blue-50'   },
  Mobiles:       { emoji: '📱', bg: 'bg-blue-50'   },
  Laptops:       { emoji: '💻', bg: 'bg-slate-50'  },
  TVs:           { emoji: '📺', bg: 'bg-indigo-50' },
  Fashion:       { emoji: '👕', bg: 'bg-pink-50'   },
  Men_Fashion:   { emoji: '👔', bg: 'bg-sky-50'    },
  Women_Fashion: { emoji: '👗', bg: 'bg-rose-50'   },
  Home_Kitchen:  { emoji: '🏠', bg: 'bg-orange-50' },
  Beauty:        { emoji: '🧴', bg: 'bg-purple-50' },
  Sports:        { emoji: '🏋️', bg: 'bg-green-50'  },
}

function ProductImage({ src, alt, category }: { src: string | null; alt: string; category: string }) {
  const [failed, setFailed] = useState(false)
  const fb = CAT_FALLBACK[category] ?? { emoji: '📦', bg: 'bg-gray-50' }

  if (!src || failed) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${fb.bg}`}>
        <span className="text-5xl">{fb.emoji}</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      loading="lazy"
      className="w-full h-full object-contain p-4"
    />
  )
}

export default function SimpleProductCard({ product }: { product: NewTodayProduct }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <div className="relative aspect-square">
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow z-10">
          NEW
        </div>
        <ProductImage src={product.image_url} alt={product.name} category={product.category} />
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-xs text-gray-900 line-clamp-2 mb-2 min-h-[2rem]">
          {product.name}
        </h3>

        {product.price !== null && (
          <div className="text-lg font-bold text-green-600 mb-2">
            ₹{product.price.toLocaleString('en-IN')}
          </div>
        )}

        <p className="text-xs text-gray-400 italic mb-3">Analysis coming Sunday</p>

        <a
          href={product.flipkart_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium text-xs transition-colors"
        >
          View on Flipkart →
        </a>
      </div>
    </div>
  )
}
