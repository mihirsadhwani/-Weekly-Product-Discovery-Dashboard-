import { ArrowUpRight, Flame, Hash, IndianRupee, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { getTrendsData } from '@/lib/products'
import { categoryMeta } from '@/lib/categories'
import { formatINR, trustedOriginalPrice } from '@/lib/format'
import PageHeader from '@/components/PageHeader'
import TrendsChart from '@/components/charts/TrendsChart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Trends — Weekly Product Discovery' }

function Delta({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (!value) return <span className="text-muted-foreground">No change</span>
  const up = value > 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${up ? 'text-success' : 'text-destructive'}`}>
      <Icon className="h-3.5 w-3.5" />
      {up ? '+' : ''}{value}{suffix}
    </span>
  )
}

export default async function TrendsPage() {
  const trends = await getTrendsData()

  if (!trends) {
    return (
      <>
        <PageHeader title="Trends" description="Week-over-week movement across categories." />
        <div className="rounded-xl border border-dashed py-20 text-center text-sm text-muted-foreground">
          Trend data is not available yet.
        </div>
      </>
    )
  }

  const deal = trends.best_deal
  const dealOriginal = deal ? trustedOriginalPrice(deal.price, deal.original_price, deal.discount_percent) : null

  return (
    <>
      <PageHeader
        title="Trends"
        description={trends.has_history ? `Week ${trends.week_number} compared with last week.` : 'Week-over-week comparison unlocks after the second weekly run.'}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Flame className="h-4 w-4 text-muted-foreground" /> Listings by category</CardTitle>
            <CardDescription>Which categories have the most products this week.</CardDescription>
          </CardHeader>
          <CardContent><TrendsChart data={trends.hot_categories} /></CardContent>
        </Card>

        {deal && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-muted-foreground" /> Best deal of the week</CardTitle>
              <CardDescription>Top-ranked discounted pick.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary">{categoryMeta(deal.category).label}</Badge>
              <p className="text-sm font-medium leading-snug">{deal.name}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{formatINR(deal.price)}</span>
                {dealOriginal && <span className="text-sm text-muted-foreground line-through">{formatINR(dealOriginal)}</span>}
                {deal.discount_percent ? <Badge variant="destructive">{deal.discount_percent}% off</Badge> : null}
              </div>
              <Button asChild size="sm" className="w-full">
                <a href={deal.flipkart_url} target="_blank" rel="noopener noreferrer">View on Flipkart <ArrowUpRight /></a>
              </Button>
            </CardContent>
          </Card>
        )}

        {trends.price_movements && trends.price_movements.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><IndianRupee className="h-4 w-4 text-muted-foreground" /> Price movement</CardTitle>
              <CardDescription>Average listed price per category.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Category</th>
                    <th className="px-6 py-2 text-right font-medium">Avg price</th>
                    <th className="px-6 py-2 text-right font-medium">Vs last week</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {trends.price_movements.map(m => {
                    const meta = categoryMeta(m.category)
                    return (
                      <tr key={m.category}>
                        <td className="px-6 py-3"><span className="flex items-center gap-2"><meta.icon className="h-4 w-4 text-muted-foreground" />{meta.label}</span></td>
                        <td className="px-6 py-3 text-right tabular-nums">{formatINR(m.avg_price)}</td>
                        <td className="px-6 py-3 text-right">{m.delta === undefined ? <span className="text-muted-foreground">–</span> : <Delta value={Math.round(m.delta)} />}</td>
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
            <CardTitle className="flex items-center gap-2 text-base"><Hash className="h-4 w-4 text-muted-foreground" /> Emerging keywords</CardTitle>
            <CardDescription>Terms gaining mentions in reviews.</CardDescription>
          </CardHeader>
          <CardContent>
            {trends.emerging_keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {trends.emerging_keywords.map(k => (
                  <Badge key={k.keyword} variant="secondary">{k.keyword} <span className="text-muted-foreground">{k.mentions}</span></Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No emerging keywords detected this week.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
