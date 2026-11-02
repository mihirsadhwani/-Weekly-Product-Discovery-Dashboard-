import { ArrowUpRight, Activity, Flame, Hash, IndianRupee, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { getProductsData, getTrendsData } from '@/lib/products'
import { computeOpportunityScores } from '@/lib/intelligence'
import { categoryMeta } from '@/lib/categories'
import { formatINR, trustedOriginalPrice } from '@/lib/format'
import PageHeader from '@/components/PageHeader'
import TrendsChart, { PriceMovementChart, SentimentShiftChart } from '@/components/charts/TrendsChart'
import PriceComparisonExplorer from '@/components/PriceComparisonExplorer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Price Intelligence — Weekly Product Discovery' }

function PriceDelta({ value }: { value: number }) {
  if (!value) return <span className="text-muted-foreground">No change</span>
  const dropped = value < 0
  const Icon = dropped ? TrendingDown : TrendingUp
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${dropped ? 'text-success' : 'text-destructive'}`}>
      <Icon className="h-3.5 w-3.5" />
      {dropped ? '-' : '+'}
      {formatINR(Math.abs(value))}
    </span>
  )
}

export default async function TrendsPage() {
  const [trends, { products }] = await Promise.all([getTrendsData(), getProductsData()])
  const scoredProducts = computeOpportunityScores(products)

  if (!trends) {
    return (
      <>
        <PageHeader title="03. Price Intelligence" description="Week-over-week movement across categories." />
        <div className="rounded-xl border border-dashed py-20 text-center text-sm text-muted-foreground">
          Trend data is not available yet.
        </div>
      </>
    )
  }

  const deal = trends.best_deal
  const dealOriginal = deal ? trustedOriginalPrice(deal.price, deal.original_price, deal.discount_percent) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="03. Price Intelligence — Price Movements & Discount Tracking"
        description="Track actual week-over-week observed price reductions (Pehle vs. Aaj) separately from static Flipkart MRP discount badges."
      />

      {/* Row 1: Category Before vs Today Price Chart + Best Deal */}
      <div className="grid gap-6 lg:grid-cols-3">
        {trends.price_movements && trends.price_movements.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IndianRupee className="h-4 w-4 text-primary" />
                Category Price Comparison: Pehle (Last Week) vs. Aaj (Today)
              </CardTitle>
              <CardDescription>
                Side-by-side comparison of average selling price last week vs. today across all categories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PriceMovementChart data={trends.price_movements} />
            </CardContent>
          </Card>
        )}

        {deal && (
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-warning" /> Best deal of the week
              </CardTitle>
              <CardDescription>Highest combined discount, AI quality, and VFM score.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{categoryMeta(deal.category).label}</Badge>
                <Badge variant="success">AI Score: {deal.score}/100</Badge>
              </div>
              <p className="text-sm font-medium leading-snug">{deal.name}</p>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-bold">{formatINR(deal.price)}</span>
                {dealOriginal && (
                  <span className="text-sm text-muted-foreground line-through">{formatINR(dealOriginal)}</span>
                )}
                {deal.discount_percent ? <Badge variant="destructive">{deal.discount_percent}% off</Badge> : null}
              </div>
              <Button asChild size="sm" className="w-full">
                <a href={deal.flipkart_url} target="_blank" rel="noopener noreferrer">
                  View on Flipkart <ArrowUpRight />
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 2: Interactive Product-Level "Pehle vs Aaj" Price Comparison Explorer */}
      {scoredProducts.length > 0 && <PriceComparisonExplorer products={scoredProducts} />}

      {/* Row 3: Deal Volume (Pehle vs Aaj) + AI Sentiment Shift (Pehle vs Aaj) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-muted-foreground" /> Deal Volume: Pehle vs. Aaj
            </CardTitle>
            <CardDescription>Category deal supply compared with last week.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendsChart data={trends.hot_categories} />
          </CardContent>
        </Card>

        {trends.declining_categories && trends.declining_categories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-muted-foreground" /> AI Sentiment Shift: Pehle vs. Aaj
              </CardTitle>
              <CardDescription>Week-over-week buyer sentiment score movement per category.</CardDescription>
            </CardHeader>
            <CardContent>
              <SentimentShiftChart data={trends.declining_categories} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 4: Category Price Delta Table + Emerging Keywords */}
      <div className="grid gap-6 lg:grid-cols-3">
        {trends.price_movements && trends.price_movements.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IndianRupee className="h-4 w-4 text-muted-foreground" /> Category Price Summary (Pehle vs. Aaj)
              </CardTitle>
              <CardDescription>Average category price last week vs. today with exact rupee delta.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 text-right font-medium">Pehle (Last Wk Avg)</th>
                    <th className="px-4 py-2 text-right font-medium">Aaj (Today Avg)</th>
                    <th className="px-6 py-2 text-right font-medium">Observed Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {trends.price_movements.map(m => {
                    const meta = categoryMeta(m.category)
                    return (
                      <tr key={m.category}>
                        <td className="px-6 py-3">
                          <span className="flex items-center gap-2">
                            <meta.icon className="h-4 w-4 text-muted-foreground" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {formatINR(m.last_avg_price ?? m.avg_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatINR(m.avg_price)}</td>
                        <td className="px-6 py-3 text-right">
                          {m.delta === undefined ? (
                            <span className="text-muted-foreground">–</span>
                          ) : (
                            <PriceDelta value={Math.round(m.delta)} />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="h-4 w-4 text-muted-foreground" /> Emerging feature keywords
            </CardTitle>
            <CardDescription>Recurring product attributes praised in AI review analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            {trends.emerging_keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {trends.emerging_keywords.map(k => (
                  <Badge key={k.keyword} variant="secondary">
                    {k.keyword} <span className="ml-1 text-muted-foreground">({k.mentions})</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No emerging keywords detected this week.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
