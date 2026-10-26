import { ArrowUpRight, Package, ThumbsDown, ThumbsUp, Zap } from 'lucide-react'
import type { FreshFind } from '@/types/product'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { categoryMeta } from '@/lib/categories'
import { formatINR } from '@/lib/format'

export default function FreshFindCard({ product }: { product: FreshFind }) {
  const qa = product.quick_analysis
  const meta = categoryMeta(product.category)
  const scored = !!qa && qa.quick_score > 0

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] bg-muted/50">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-contain p-4" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><Package className="h-10 w-10" /></div>
        )}
        <Badge variant="warning" className="absolute left-3 top-3 bg-background/90"><Zap /> Quick AI</Badge>
        {scored && (
          <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border bg-background text-xs font-bold shadow-sm">
            {qa!.quick_score}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Badge variant="secondary" className="w-fit gap-1.5"><meta.icon />{meta.label}</Badge>
        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug">{product.name}</p>
        <p className="text-lg font-bold">{formatINR(product.price)}</p>

        {qa && (qa.top_pros.length > 0 || qa.top_con) && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {qa.top_pros.slice(0, 2).map((p, i) => (
              <li key={i} className="flex items-start gap-1.5"><ThumbsUp className="mt-0.5 h-3 w-3 shrink-0 text-success" />{p}</li>
            ))}
            {qa.top_con && (
              <li className="flex items-start gap-1.5"><ThumbsDown className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />{qa.top_con}</li>
            )}
          </ul>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          {qa && <Badge variant={qa.quick_verdict === 'Worth checking' ? 'success' : 'secondary'}>{qa.quick_verdict}</Badge>}
          <Button asChild variant="secondary" size="sm" className="ml-auto">
            <a href={product.flipkart_url} target="_blank" rel="noopener noreferrer">View <ArrowUpRight /></a>
          </Button>
        </div>
      </div>
    </Card>
  )
}
