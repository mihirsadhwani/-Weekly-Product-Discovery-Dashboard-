'use client'

import { useState } from 'react'
import type { FreshFind } from '@/types/product'

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

function scoreColor(score: number) {
  if (score >= 75) return 'text-emerald-600'
  if (score >= 55) return 'text-amber-500'
  return 'text-rose-500'
}

export default function FreshFindCard({ product }: { product: FreshFind }) {
  const [imgFailed, setImgFailed] = useState(false)
  const qa  = product.quick_analysis
  const fb  = CAT_FALLBACK[product.category] ?? { emoji: '📦', bg: 'bg-gray-50' }
  const hasScore = qa && qa.quick_score > 0

  const verdictStyle = qa?.quick_verdict === 'Worth checking'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-amber-50 text-amber-700 border-amber-200'

  return (
    <a
      href={product.flipkart_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image */}
      <div className={`relative h-36 overflow-hidden ${fb.bg}`}>
        {product.image_url && !imgFailed ? (
          <img
            src={product.image_url}
            alt={product.name}
            onError={() => setImgFailed(true)}
            loading="lazy"
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl">{fb.emoji}</span>
          </div>
        )}

        {/* Quick AI badge */}
        <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
          ⚡ Quick AI
        </div>

        {/* Score bubble */}
        {hasScore && (
          <div className="absolute top-2 right-2 bg-white/95 rounded-full w-9 h-9 flex flex-col items-center justify-center shadow-md ring-1 ring-white/80">
            <span className={`text-xs font-extrabold leading-none ${scoreColor(qa.quick_score)}`}>
              {qa.quick_score}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 gap-2">

        {/* Name + price */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
            {product.name}
          </h3>
          {product.price ? (
            <p className="text-sm font-extrabold text-emerald-600 mt-1">
              ₹{product.price.toLocaleString('en-IN')}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Price unavailable</p>
          )}
        </div>

        {/* Pros + con */}
        {qa && (qa.top_pros.length > 0 || qa.top_con) && (
          <div className="space-y-1">
            {qa.top_pros.slice(0, 2).map((pro, i) => (
              <div key={i} className="flex items-start gap-1">
                <span className="text-emerald-500 text-[10px] font-bold mt-px shrink-0">✓</span>
                <span className="text-[10px] text-slate-600 line-clamp-1 leading-tight">{pro}</span>
              </div>
            ))}
            {qa.top_con && (
              <div className="flex items-start gap-1">
                <span className="text-rose-400 text-[10px] font-bold mt-px shrink-0">✗</span>
                <span className="text-[10px] text-slate-500 line-clamp-1 leading-tight">{qa.top_con}</span>
              </div>
            )}
          </div>
        )}

        {/* Verdict + CTA */}
        <div className="mt-auto space-y-1.5 pt-1">
          {qa ? (
            <div className={`text-[10px] font-bold px-2 py-1 rounded-full text-center border ${verdictStyle}`}>
              {qa.quick_verdict === 'Worth checking' ? '✓ Worth checking' : '⏳ Wait for more data'}
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 text-center italic py-1">
              Analysis pending
            </div>
          )}
          <div className="w-full py-1.5 bg-slate-100 group-hover:bg-slate-200 text-slate-600 text-[10px] font-semibold rounded-lg text-center transition-colors">
            View on Flipkart →
          </div>
        </div>

      </div>
    </a>
  )
}
