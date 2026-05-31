'use client'

import { useState, useEffect } from 'react'
import type { Product } from '@/types/product'
import { formatPrice } from '@/lib/utils'

interface Props {
  productA: Product
  productB: Product
  onClose: () => void
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-600 bg-emerald-50' : score >= 60 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold ${color}`}>
      {score}<span className="text-xs font-normal opacity-70">/100</span>
    </span>
  )
}

function RecBadge({ rec }: { rec: string }) {
  const styles: Record<string, string> = {
    Buy:  'bg-emerald-500 text-white',
    Wait: 'bg-amber-400 text-white',
    Skip: 'bg-rose-500 text-white',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[rec] ?? styles.Wait}`}>
      {rec}
    </span>
  )
}

function ProductColumn({ product, label }: { product: Product; label: string }) {
  const { analysis } = product
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">{label}</div>

      {/* Image */}
      <div className="h-40 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-3" />
        ) : (
          <span className="text-5xl">📦</span>
        )}
      </div>

      {/* Name */}
      <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-3 min-h-[3.5rem]">
        {product.name}
      </h3>

      {/* Price row */}
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-xl font-extrabold text-emerald-600">{formatPrice(product.price)}</span>
        {product.original_price && product.original_price > (product.price ?? 0) && (
          <span className="text-sm text-slate-400 line-through">{formatPrice(product.original_price)}</span>
        )}
        {product.discount_percent ? (
          <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
            {product.discount_percent}% off
          </span>
        ) : null}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <RecBadge rec={analysis.recommendation} />
        <ScoreBadge score={analysis.quality_score} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <div className="font-bold text-slate-700">{product.rating ?? '—'}</div>
          <div className="text-slate-400">Rating</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <div className="font-bold text-slate-700">
            {product.review_count ? product.review_count.toLocaleString('en-IN') : '—'}
          </div>
          <div className="text-slate-400">Reviews</div>
        </div>
      </div>

      {/* Pros */}
      {analysis.pros.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-1.5">Pros</div>
          <ul className="space-y-1">
            {analysis.pros.slice(0, 3).map((pro, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                <span className="line-clamp-2">{pro.replace(/\s*\(\d+[^)]*\)/g, '').trim()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cons */}
      {analysis.cons.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-1.5">Cons</div>
          <ul className="space-y-1">
            {analysis.cons.slice(0, 2).map((con, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                <span className="text-rose-400 font-bold shrink-0 mt-0.5">✗</span>
                <span className="line-clamp-2">{con}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* View on Flipkart */}
      <a
        href={product.flipkart_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
      >
        View on Flipkart →
      </a>
    </div>
  )
}

export default function CompareModal({ productA, productB, onClose }: Props) {
  const [verdict, setVerdict] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tried, setTried] = useState(false)

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function fetchVerdict() {
    setLoading(true)
    setTried(true)
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productA, productB }),
      })
      const data = await res.json()
      setVerdict(data.verdict ?? null)
    } catch {
      setVerdict(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-extrabold text-slate-900">Side-by-Side Compare</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Comparison grid */}
        <div className="p-6 grid grid-cols-2 gap-6 divide-x divide-slate-100">
          <ProductColumn product={productA} label="Product A" />
          <div className="pl-6">
            <ProductColumn product={productB} label="Product B" />
          </div>
        </div>

        {/* AI Verdict */}
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <span className="font-bold text-slate-800">AI Verdict</span>
              </div>
              {!tried && (
                <button
                  onClick={fetchVerdict}
                  disabled={loading}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full transition-colors disabled:opacity-60"
                >
                  Get AI Verdict
                </button>
              )}
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="inline-block w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                Analyzing both products…
              </div>
            )}

            {!loading && verdict && (
              <p className="text-sm text-slate-700 leading-relaxed">{verdict}</p>
            )}

            {!loading && tried && !verdict && (
              <p className="text-sm text-slate-400 italic">AI verdict unavailable — check GROQ_API_KEY on your deployment.</p>
            )}

            {!tried && (
              <p className="text-xs text-slate-400 italic">Click "Get AI Verdict" for a personalized comparison powered by Llama 3.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
