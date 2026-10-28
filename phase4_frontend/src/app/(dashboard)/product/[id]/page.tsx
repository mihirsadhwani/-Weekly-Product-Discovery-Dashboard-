import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, AlertTriangle, CheckCircle2, Package, Quote, Star } from 'lucide-react'
import { getProductById, getProductsData } from '@/lib/products'
import { categoryMeta } from '@/lib/categories'
import { formatINR, trustedOriginalPrice } from '@/lib/format'
import ShareButton from '@/components/ShareButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function generateStaticParams() {
  return (await getProductsData()).products.map(p => ({ id: p.id }))
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const product = await getProductById(params.id)
  if (!product) return { title: 'Product not found' }
  return {
    title: `${product.name} — Weekly Product Discovery`,
    description: product.analysis?.top_quote || `Analysis for ${product.name}`,
  }
}

const REC_VARIANT = { Buy: 'success', Wait: 'warning', Skip: 'destructive' } as const
const clean = (s: string) => s.replace(/\s*\(\d+\s*mentions?\)/i, '')

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = await getProductById(params.id)
  if (!product) notFound()

  const { analysis } = product
  const meta = categoryMeta(product.category)
  const original = trustedOriginalPrice(product.price, product.original_price, product.discount_percent)
  const analysed = analysis.quality_score > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/deals"><ArrowLeft /> Back to deals</Link>
        </Button>
        <ShareButton productName={product.name} />
      </div>

      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="flex min-h-[320px] items-center justify-center bg-muted/50 p-8">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt={product.name} className="aspect-square w-full max-w-sm object-contain" />
            ) : (
              <Package className="h-16 w-16 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col justify-between gap-6 p-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1.5"><meta.icon />{meta.label}</Badge>
                {analysed && <Badge variant={REC_VARIANT[analysis.recommendation]}>{analysis.recommendation}</Badge>}
              </div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight">{product.name}</h1>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-4xl font-bold">{formatINR(product.price)}</span>
                {original && <span className="text-muted-foreground line-through">{formatINR(original)}</span>}
                {product.discount_percent ? <Badge variant="destructive">{product.discount_percent}% off</Badge> : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {product.rating ? (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Star className="h-4 w-4 fill-warning text-warning" /> {product.rating}
                  </span>
                ) : null}
                {product.review_count ? <span>{product.review_count.toLocaleString('en-IN')} reviews</span> : null}
                {analysed && <span>AI score {analysis.quality_score}/100</span>}
              </div>
            </div>
            <Button asChild size="lg">
              <a href={product.flipkart_url} target="_blank" rel="noopener noreferrer">Buy on Flipkart <ArrowUpRight /></a>
            </Button>
          </div>
        </div>
      </Card>

      {analysed && (analysis.pros.length > 0 || analysis.cons.length > 0) && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4 text-success" /> What people love</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {analysis.pros.map((p, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-success" />{clean(p)}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-destructive" /> What to watch out for</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {analysis.cons.map((c, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-destructive" />{clean(c)}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {analysis.top_quote && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Quote className="h-4 w-4 text-muted-foreground" /> Featured review</CardTitle></CardHeader>
          <CardContent>
            <blockquote className="border-l-2 border-primary pl-4 italic text-muted-foreground">{analysis.top_quote}</blockquote>
          </CardContent>
        </Card>
      )}

      {!analysed && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Deep AI analysis for this product hasn&apos;t run yet. It is generated in the weekly Sunday run.
          </CardContent>
        </Card>
      )}

      {product.comparisons && product.comparisons.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">How it compares</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {product.comparisons.map((c, i) => (
              <div key={i} className="rounded-lg border p-4 text-sm">
                <p className="mb-3 font-medium">
                  vs {c.compared_to.name.slice(0, 60)}{c.compared_to.name.length > 60 ? '…' : ''}
                  {c.compared_to.price ? <span className="ml-2 font-normal text-muted-foreground">{formatINR(c.compared_to.price)}</span> : null}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ul className="space-y-1 text-muted-foreground">{c.better_at?.map((f, j) => <li key={j} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />{f}</li>)}</ul>
                  <ul className="space-y-1 text-muted-foreground">{c.weaker_at?.map((f, j) => <li key={j} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />{f}</li>)}</ul>
                </div>
                {c.verdict && <p className="mt-3 rounded-md bg-muted/60 px-3 py-2 italic">{c.verdict}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
