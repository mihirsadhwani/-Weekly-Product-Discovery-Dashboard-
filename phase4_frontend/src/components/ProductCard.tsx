'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Product } from '@/types/product'
import { formatPrice } from '@/lib/utils'

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

const BADGE: Record<string, { bg: string; ring: string; dot: string; label: string }> = {
  Buy:  { bg: 'bg-emerald-500',  ring: 'ring-emerald-400/40', dot: 'bg-emerald-300', label: 'BUY'  },
  Wait: { bg: 'bg-amber-400',    ring: 'ring-amber-300/40',   dot: 'bg-amber-200',   label: 'WAIT' },
  Skip: { bg: 'bg-rose-500',     ring: 'ring-rose-400/40',    dot: 'bg-rose-300',    label: 'SKIP' },
}

const CAT_CHIP: Record<string, { bg: string; text: string }> = {
  Electronics:   { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  Mobiles:       { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  Laptops:       { bg: 'bg-slate-100',  text: 'text-slate-700'  },
  TVs:           { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  Fashion:       { bg: 'bg-pink-100',   text: 'text-pink-700'   },
  Men_Fashion:   { bg: 'bg-sky-100',    text: 'text-sky-700'    },
  Women_Fashion: { bg: 'bg-rose-100',   text: 'text-rose-700'   },
  Home_Kitchen:  { bg: 'bg-orange-100', text: 'text-orange-700' },
  Beauty:        { bg: 'bg-purple-100', text: 'text-purple-700' },
  Sports:        { bg: 'bg-green-100',  text: 'text-green-700'  },
}

function ScoreRing({ score }: { score: number }) {
  const size  = 52
  const sw    = 4.5
  const r     = (size / 2) - sw / 2
  const circ  = 2 * Math.PI * r
  const pct   = Math.min(Math.max(score, 0), 100)
  const offset = circ - (pct / 100) * circ
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#f43f5e'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={sw}
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-extrabold text-gray-800 leading-none">{Math.round(pct)}</span>
        <span className="text-[9px] text-gray-400 leading-none mt-0.5 font-medium tracking-wide">score</span>
      </div>
    </div>
  )
}

function ProductImage({ src, alt, category }: { src: string | null; alt: string; category: string }) {
  const [failed, setFailed] = useState(false)
  const fb = CAT_FALLBACK[category] ?? { emoji: '📦', bg: 'bg-gray-50' }

  if (!src || failed) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${fb.bg}`}>
        <span className="text-7xl">{fb.emoji}</span>
      </div>
    )
  }
  return (
    <img
      src={src} alt={alt}
      onError={() => setFailed(true)}
      loading="lazy"
      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 ease-out"
    />
  )
}

export default function ProductCard({
  product,
  isInCompare,
  onToggleCompare,
}: {
  product: Product
  isInCompare?: boolean
  onToggleCompare?: (product: Product) => void
}) {
  const { analysis } = product
  const badge  = BADGE[analysis.recommendation] ?? BADGE.Wait
  const chip   = CAT_CHIP[product.category] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  const topPro = analysis.pros?.[0]?.replace(/\s*\(\d+[^)]*\)/g, '').trim()

  return (
    <Link
      href={`/product/${product.id}`}
      className={`group block bg-white rounded-2xl overflow-hidden border shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-300 cursor-pointer ${
        isInCompare ? 'border-indigo-400 ring-2 ring-indigo-300/50' : 'border-slate-100'
      }`}
    >
      {/* Image area */}
      <div className="relative h-52 bg-slate-50 overflow-hidden">
        <ProductImage src={product.image_url} alt={product.name} category={product.category} />

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />

        {/* Recommendation badge */}
        <div className={`
          absolute top-3 left-3 flex items-center gap-1.5
          ${badge.bg} ${badge.ring} ring-2
          text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md
        `}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} animate-pulse`} />
          {badge.label}
        </div>

        {/* Score ring */}
        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-full p-1 shadow-md ring-1 ring-white/80">
          <ScoreRing score={analysis.quality_score} />
        </div>

        {/* Compare toggle button */}
        {onToggleCompare && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleCompare(product) }}
            className={`absolute bottom-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold shadow-md transition-all duration-200 ${
              isInCompare
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-300/60'
                : 'bg-white/90 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 opacity-0 group-hover:opacity-100'
            }`}
          >
            {isInCompare ? '✓ Added' : '+ Compare'}
          </button>
        )}

        {/* VFM badge */}
        {product.is_vfm && (
          <div className="absolute bottom-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 rounded-full shadow-lg font-bold text-xs uppercase flex items-center gap-1 z-10">
            <span>💰</span>
            <span>VFM</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2.5">

        {/* Category + reviews row */}
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${chip.bg} ${chip.text} tracking-wide uppercase`}>
            {product.category.replace('_', ' ')}
          </span>
          <span className="text-[11px] text-slate-400 tabular-nums">
            {product.review_count && product.review_count > 0
              ? `${product.review_count.toLocaleString('en-IN')} reviews`
              : 'New product'}
          </span>
        </div>

        {/* Product name */}
        <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Price + discount */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-2xl font-extrabold text-emerald-600 tracking-tight leading-none">
              {formatPrice(product.price)}
            </p>
            {product.discount_percent && product.discount_percent > 0 && (
              <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md">
                {product.discount_percent}% off
              </span>
            )}
          </div>
          {product.original_price && product.original_price > (product.price ?? 0) && (
            <p className="text-xs text-slate-400 line-through leading-none">
              MRP {formatPrice(product.original_price)}
            </p>
          )}
        </div>

        {/* Price drop prediction */}
        {product.price_prediction?.likely && (
          <div className="flex items-start gap-2 bg-amber-50 border-l-4 border-amber-400 rounded-lg px-3 py-2">
            <span className="text-amber-500 text-sm shrink-0 leading-tight mt-px">⏰</span>
            <div className="text-xs">
              <span className="font-semibold text-amber-900">
                Price may drop {product.price_prediction.estimated_drop_pct}
              </span>
              <span className="text-amber-700 ml-1">· {product.price_prediction.timeframe}</span>
            </div>
          </div>
        )}

        {/* Top pro */}
        {topPro && (
          <div className="flex items-start gap-2 bg-emerald-50 rounded-lg px-3 py-2">
            <span className="text-emerald-500 text-sm font-bold shrink-0 leading-tight mt-px">✓</span>
            <span className="text-xs text-emerald-800 leading-snug line-clamp-1">{topPro}</span>
          </div>
        )}

        {/* CTA */}
        <button className="
          w-full py-2.5 mt-0.5
          bg-gradient-to-r from-indigo-600 to-indigo-700
          group-hover:from-indigo-500 group-hover:to-indigo-600
          text-white text-sm font-semibold rounded-xl
          flex items-center justify-center gap-1.5
          transition-all duration-200 shadow-sm
        ">
          View Full Analysis
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

      </div>
    </Link>
  )
}
