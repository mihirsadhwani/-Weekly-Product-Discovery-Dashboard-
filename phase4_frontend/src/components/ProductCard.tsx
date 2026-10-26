'use client'

import Link from 'next/link'
import { Check, GitCompareArrows, Package, Star } from 'lucide-react'
import type { Product } from '@/types/product'
import { categoryMeta } from '@/lib/categories'
import { formatINR, trustedOriginalPrice } from '@/lib/format'

interface Props {
  product: Product
  isInCompare: boolean
  onToggleCompare: (p: Product) => void
}

const REC_STYLE = {
  Buy: 'text-success',
  Wait: 'text-warning',
  Skip: 'text-destructive',
} as const

export default function ProductCard({ product, isInCompare, onToggleCompare }: Props) {
  const { analysis } = product
  const meta = categoryMeta(product.category)
  const original = trustedOriginalPrice(product.price, product.original_price, product.discount_percent)
  const analysed = analysis.quality_score > 0

  return (
    <div className="group relative flex flex-col bg-card p-4 transition-shadow hover:z-10 hover:shadow-md">
      <button
        type="button"
        onClick={() => onToggleCompare(product)}
        aria-pressed={isInCompare}
        className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md border bg-card px-1.5 py-1 text-[11px] font-medium text-muted-foreground opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100 data-[on=true]:opacity-100"
        data-on={isInCompare}
      >
        {isInCompare ? <Check className="h-3 w-3 text-primary" /> : <GitCompareArrows className="h-3 w-3" />}
        {isInCompare ? 'Added' : 'Compare'}
      </button>

      <Link href={`/product/${product.id}`} className="flex h-44 items-center justify-center">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} loading="lazy" className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" />
        ) : (
          <Package className="h-12 w-12 text-muted-foreground" />
        )}
      </Link>

      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><meta.icon className="h-3 w-3" />{meta.label}</p>
        <Link href={`/product/${product.id}`} className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary">
          {product.name}
        </Link>

        <div className="flex items-center gap-2">
          {product.rating ? (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-success/10 px-1.5 py-0.5 text-xs font-semibold text-success">
              {product.rating} <Star className="h-3 w-3 fill-current" />
            </span>
          ) : null}
          {analysed && (
            <span className={`text-xs font-semibold ${REC_STYLE[analysis.recommendation]}`}>
              AI: {analysis.recommendation} · {analysis.quality_score}/100
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
          <span className="text-base font-semibold">{formatINR(product.price)}</span>
          {original && <span className="text-xs text-muted-foreground line-through">{formatINR(original)}</span>}
          {product.discount_percent ? <span className="text-xs font-semibold text-success">{product.discount_percent}% off</span> : null}
        </div>

        <a
          href={product.flipkart_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex h-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary"
        >
          View on Flipkart
        </a>
      </div>
    </div>
  )
}
