'use client'

import { useEffect, useState } from 'react'
import { Loader2, Package, Sparkles } from 'lucide-react'
import type { Product } from '@/types/product'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { formatINR } from '@/lib/format'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  productA: Product
  productB: Product
}

const REC_VARIANT = { Buy: 'success', Wait: 'warning', Skip: 'destructive' } as const

function Column({ product, label }: { product: Product; label: string }) {
  const { analysis } = product
  const analysed = analysis.quality_score > 0
  return (
    <div className="space-y-3">
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex h-36 items-center justify-center rounded-lg bg-muted/50">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-3" />
        ) : (
          <Package className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <h3 className="line-clamp-3 min-h-[3.75rem] text-sm font-semibold leading-snug">{product.name}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xl font-bold">{formatINR(product.price)}</span>
        {product.discount_percent ? <Badge variant="destructive">{product.discount_percent}% off</Badge> : null}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-muted/60 p-2">
          <dd className="font-semibold">{product.rating ?? '–'}</dd>
          <dt className="text-muted-foreground">Rating</dt>
        </div>
        <div className="rounded-md bg-muted/60 p-2">
          <dd className="font-semibold">{analysed ? analysis.quality_score : '–'}</dd>
          <dt className="text-muted-foreground">AI score</dt>
        </div>
        <div className="rounded-md bg-muted/60 p-2">
          <dd>{analysed ? <Badge variant={REC_VARIANT[analysis.recommendation]}>{analysis.recommendation}</Badge> : '–'}</dd>
          <dt className="mt-1 text-muted-foreground">Verdict</dt>
        </div>
      </dl>
    </div>
  )
}

export default function CompareModal({ open, onOpenChange, productA, productB }: Props) {
  const [verdict, setVerdict] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setState('loading')
    setVerdict(null)

    fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productA, productB }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(d => {
        setVerdict(d.verdict ?? null)
        setState(d.verdict ? 'idle' : 'error')
      })
      .catch(e => { if (e.name !== 'AbortError') setState('error') })

    return () => controller.abort()
  }, [open, productA, productB])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold">Compare products</DialogTitle>
        <DialogDescription className="sr-only">Side-by-side comparison with an AI verdict.</DialogDescription>

        <div className="grid gap-6 sm:grid-cols-2">
          <Column product={productA} label="Product A" />
          <Column product={productB} label="Product B" />
        </div>

        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> AI verdict
          </p>
          {state === 'loading' && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Comparing with Gemini...
            </p>
          )}
          {state === 'error' && <p className="text-sm text-muted-foreground">AI verdict is unavailable right now.</p>}
          {verdict && <p className="text-sm leading-relaxed">{verdict}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
