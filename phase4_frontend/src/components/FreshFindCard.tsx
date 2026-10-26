import { Package, Zap } from 'lucide-react'
import type { FreshFind } from '@/types/product'
import { categoryMeta } from '@/lib/categories'
import { formatINR } from '@/lib/format'

export default function FreshFindCard({ product }: { product: FreshFind }) {
  const qa = product.quick_analysis
  const meta = categoryMeta(product.category)
  const scored = !!qa && qa.quick_score > 0

  return (
    <div className="group relative flex flex-col bg-card p-4 transition-shadow hover:z-10 hover:shadow-md">
      <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
        <Zap className="h-3 w-3" /> NEW
      </span>

      <div className="flex h-44 items-center justify-center">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} loading="lazy" className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" />
        ) : (
          <Package className="h-12 w-12 text-muted-foreground" />
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><meta.icon className="h-3 w-3" />{meta.label}</p>
        <p className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>

        {qa && (scored || qa.quick_verdict === 'Worth checking') && (
          <div className="flex items-center gap-2 text-xs">
            {scored && (
              <span className="inline-flex rounded-md bg-success/10 px-1.5 py-0.5 font-semibold text-success">{qa.quick_score}/100</span>
            )}
            <span className={qa.quick_verdict === 'Worth checking' ? 'font-semibold text-success' : 'text-muted-foreground'}>
              {qa.quick_verdict}
            </span>
          </div>
        )}
        {qa?.top_pros.slice(0, 1).map((p, i) => <p key={i} className="line-clamp-1 text-xs text-muted-foreground">+ {p}</p>)}

        <p className="mt-auto pt-1 text-base font-semibold">{formatINR(product.price)}</p>
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
