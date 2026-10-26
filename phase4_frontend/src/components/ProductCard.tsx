'use client'

import Link from 'next/link'
import { ArrowUpRight, Check, GitCompareArrows, Package, Star, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { Product } from '@/types/product'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { categoryMeta } from '@/lib/categories'
import { formatINR, trustedOriginalPrice } from '@/lib/format'

interface Props {
  product: Product
  isInCompare: boolean
  onToggleCompare: (p: Product) => void
}

const REC_VARIANT = { Buy: 'success', Wait: 'warning', Skip: 'destructive' } as const

export default function ProductCard({ product, isInCompare, onToggleCompare }: Props) {
  const { analysis } = product
  const meta = categoryMeta(product.category)
  const original = trustedOriginalPrice(product.price, product.original_price, product.discount_percent)
  const analysed = analysis.quality_score > 0
  const cleanPoint = (s: string) => s.replace(/\s*\(\d+\s*mentions?\)/i, '')

  return (
    <Card className={`group flex flex-col overflow-hidden transition-shadow hover:shadow-md ${isInCompare ? 'ring-2 ring-primary' : ''}`}>
      <Link href={`/product/${product.id}`} className="relative block aspect-[4/3] bg-muted/50">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-contain p-4" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><Package className="h-10 w-10" /></div>
        )}
        {product.discount_percent ? (
          <Badge variant="destructive" className="absolute left-3 top-3 bg-background/90">{product.discount_percent}% off</Badge>
        ) : null}
        {analysed && (
          <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border bg-background text-xs font-bold shadow-sm">
            {analysis.quality_score}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <meta.icon />
            {meta.label}
          </Badge>
          {analysed && <Badge variant={REC_VARIANT[analysis.recommendation]}>{analysis.recommendation}</Badge>}
        </div>

        <Link href={`/product/${product.id}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug hover:underline">
          {product.name}
        </Link>

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold">{formatINR(product.price)}</span>
          {original && <span className="text-xs text-muted-foreground line-through">{formatINR(original)}</span>}
          {product.rating ? (
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              {product.rating}
            </span>
          ) : null}
        </div>

        {analysed && (analysis.pros.length > 0 || analysis.cons.length > 0) && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {analysis.pros.slice(0, 2).map((p, i) => (
              <li key={`p${i}`} className="flex items-start gap-1.5"><ThumbsUp className="mt-0.5 h-3 w-3 shrink-0 text-success" />{cleanPoint(p)}</li>
            ))}
            {analysis.cons.slice(0, 1).map((c, i) => (
              <li key={`c${i}`} className="flex items-start gap-1.5"><ThumbsDown className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />{cleanPoint(c)}</li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex gap-2 pt-1">
          <Button
            variant={isInCompare ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => onToggleCompare(product)}
          >
            {isInCompare ? <Check /> : <GitCompareArrows />}
            {isInCompare ? 'Selected' : 'Compare'}
          </Button>
          <Button asChild variant="secondary" size="sm" className="flex-1">
            <a href={product.flipkart_url} target="_blank" rel="noopener noreferrer">
              Flipkart <ArrowUpRight />
            </a>
          </Button>
        </div>
      </div>
    </Card>
  )
}
