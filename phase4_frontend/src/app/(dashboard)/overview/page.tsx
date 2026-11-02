import Link from 'next/link'
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Compass,
  Lightbulb,
  PackageSearch,
  TrendingDown,
  Zap,
} from 'lucide-react'
import { getDealsPoolData, getFreshFindsData, getProductsData } from '@/lib/products'
import {
  buildManagementDecisions,
  computeOpportunityScores,
  detectMarketOpportunities,
} from '@/lib/intelligence'
import { categoryMeta } from '@/lib/categories'
import { formatINR } from '@/lib/format'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import CsvExportButton from '@/components/CsvExportButton'
import OverviewCharts, { type CategoryStat, type ScatterPoint } from '@/components/charts/OverviewCharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function OverviewPage() {
  const [{ products }, fresh, pool] = await Promise.all([
    getProductsData(),
    getFreshFindsData(),
    getDealsPoolData(),
  ])

  const scored = computeOpportunityScores(products)
  const opportunities = detectMarketOpportunities(scored)
  const managementDecisions = buildManagementDecisions(scored, opportunities)

  const groups = new Map<string, typeof products>()
  for (const p of products) groups.set(p.category, [...(groups.get(p.category) ?? []), p])

  const stats: CategoryStat[] = Array.from(groups, ([category, items]) => {
    const priced = items.filter(i => i.price)
    const avgPrice = Math.round(priced.reduce((s, i) => s + (i.price ?? 0), 0) / (priced.length || 1))
    const avgPrevPrice = Math.round(
      priced.reduce((s, i) => s + (i.previous_price ?? i.price ?? 0), 0) / (priced.length || 1)
    )
    const avgMrp = Math.round(
      priced.reduce((s, i) => s + (i.original_price ?? i.previous_price ?? i.price ?? 0), 0) / (priced.length || 1)
    )
    return {
      category,
      count: items.length,
      avgDiscount: Math.round(items.reduce((s, i) => s + (i.discount_percent ?? 0), 0) / items.length),
      avgPrice,
      avgPrevPrice,
      avgMrp,
      avgQuality: Math.round(items.reduce((s, i) => s + (i.analysis?.quality_score ?? 0), 0) / items.length),
      avgVfm: Math.round(items.reduce((s, i) => s + (i.vfm_score ?? 0), 0) / items.length),
      vfmCount: items.filter(i => i.is_vfm).length,
      buyCount: items.filter(i => i.analysis?.recommendation === 'Buy').length,
      waitCount: items.filter(i => i.analysis?.recommendation === 'Wait').length,
      skipCount: items.filter(i => i.analysis?.recommendation === 'Skip').length,
    }
  }).sort((a, b) => b.count - a.count)

  const scatterPoints: ScatterPoint[] = products
    .filter(p => p.price && p.analysis?.quality_score)
    .map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price ?? 0,
      discount: p.discount_percent ?? 0,
      quality: p.analysis.quality_score,
      vfmScore: p.vfm_score ?? 0,
      isVfm: Boolean(p.is_vfm),
    }))

  const withDiscount = products.filter(p => p.discount_percent)
  const avgDiscount = withDiscount.length
    ? Math.round(withDiscount.reduce((s, p) => s + p.discount_percent!, 0) / withDiscount.length)
    : 0
  const pricedAll = products.filter(p => p.price)
  const avgListedPrice = pricedAll.length
    ? Math.round(pricedAll.reduce((s, p) => s + (p.price ?? 0), 0) / pricedAll.length)
    : 0

  const droppedProducts = products.filter(p => (p.price_change ?? 0) < 0)
  const increasedProducts = products.filter(p => (p.price_change ?? 0) > 0)
  const highValueOpportunities = scored.filter(p => p.opportunityScore >= 72 || p.is_vfm).length
  const totalTrackedPool = (pool.total_products || products.length) + (fresh?.products.length ?? 0)

  const topPriceDrops = [...droppedProducts]
    .sort((a, b) => (a.price_change_pct ?? 0) - (b.price_change_pct ?? 0))
    .slice(0, 6)
  const topDeals = [...withDiscount].sort((a, b) => b.discount_percent! - a.discount_percent!).slice(0, 6)

  const csvRows = scored.map(p => ({
    Name: p.name,
    Category: categoryMeta(p.category).label,
    Price_Today_INR: p.price,
    Price_Last_Week_INR: p.previous_price,
    Observed_Price_Change_INR: p.price_change,
    Observed_Price_Change_Pct: p.price_change_pct,
    MRP_INR: p.original_price,
    MRP_Discount_Pct: p.discount_percent,
    Rating: p.rating,
    Reviews: p.review_count,
    AI_Quality_Score: p.analysis?.quality_score,
    VFM_Score: p.vfm_score,
    Opportunity_Score: p.opportunityScore,
    Recommendation: p.analysis?.recommendation,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="01. Executive Overview — Product & Market Intelligence"
          description="Automated e-commerce intelligence: What is happening in the market, why it is happening, and what the category team should do next."
        />
        <CsvExportButton filename="flipkart_executive_intelligence_report" label="Download Management CSV" rows={csvRows} />
      </div>

      {/* Executive KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Products Tracked"
          value={totalTrackedPool}
          hint={`${products.length} curated weekly + ${pool.total_products} candidate pool`}
          icon={PackageSearch}
        />
        <StatCard
          label="New Products Discovered"
          value={fresh?.products.length ?? 0}
          hint="Fresh launches across 4 categories"
          icon={Zap}
        />
        <StatCard
          label="Products With Price Drops"
          value={droppedProducts.length}
          hint={`Out of ${products.length} active deals vs. last week`}
          icon={TrendingDown}
        />
        <StatCard
          label="High-Value Opportunities"
          value={highValueOpportunities}
          hint="Opportunity score ≥ 72 or certified VFM"
          icon={Compass}
        />
      </div>

      {/* Weekly Price Movement Snapshot Strip */}
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Average Listed Selling Price</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatINR(avgListedPrice)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Average Listed MRP Discount</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-primary">{avgDiscount}%</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Observed Price Decreases (WoW)</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-success">{droppedProducts.length} SKUs</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Observed Price Increases (WoW)</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-warning">{increasedProducts.length} SKUs</p>
          </div>
        </CardContent>
      </Card>

      {/* Management Decision Layer: What is happening / Why / What to do */}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-primary" />
              Management Decision Layer — Insights &amp; Recommended Actions
            </CardTitle>
            <CardDescription>
              Structured PM &amp; Category Manager briefs translating raw price/review signals into concrete actions.
            </CardDescription>
          </div>
          <Link href="/alerts" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            All alerts &amp; actions <ArrowUpRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {managementDecisions.slice(0, 3).map(item => (
            <div key={item.id} className="flex flex-col justify-between rounded-lg border bg-card p-4 text-xs shadow-sm">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{item.categoryLabel}</Badge>
                  <Badge variant={item.priority === 'High' ? 'destructive' : 'warning'}>{item.priority} Priority</Badge>
                </div>
                <div>
                  <p className="font-semibold text-foreground">1. What is happening?</p>
                  <p className="mt-0.5 text-muted-foreground leading-relaxed">{item.whatIsHappening}</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">2. Why is it happening?</p>
                  <p className="mt-0.5 text-muted-foreground leading-relaxed">{item.whyItIsHappening}</p>
                </div>
                <div className="rounded-md bg-primary/5 p-2.5">
                  <p className="font-semibold text-primary">3. Recommended Action</p>
                  <p className="mt-0.5 text-foreground/90 leading-relaxed">{item.whatToDoNext}</p>
                </div>
              </div>
              <p className="mt-3 border-t pt-2 text-[11px] font-medium text-muted-foreground">{item.supportingMetric}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {products.length > 0 && (
        <OverviewCharts stats={stats} scatterPoints={scatterPoints} total={products.length} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Table 1: Before vs Today ("Pehle vs Aaj") Biggest Week-over-Week Price Drops */}
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="text-base">Observed Price Drops (Pehle vs. Aaj)</CardTitle>
              <CardDescription>Largest actual week-over-week price reductions (distinct from MRP badges).</CardDescription>
            </div>
            <Link href="/trends" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Price Intelligence <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {topPriceDrops.map(p => {
                const meta = categoryMeta(p.category)
                const prev = p.previous_price ?? p.price ?? 0
                const cur = p.price ?? 0
                const saved = prev - cur
                return (
                  <li key={p.id}>
                    <Link
                      href={`/product/${p.id}`}
                      className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {meta.label} · Pehle {formatINR(prev)} → <span className="font-semibold text-foreground">Aaj {formatINR(cur)}</span>
                        </p>
                      </div>
                      <Badge variant="success" className="shrink-0 gap-1 whitespace-nowrap">
                        <ArrowDownRight className="h-3.5 w-3.5" />
                        -{formatINR(saved)} ({Math.abs(p.price_change_pct ?? 0)}%)
                      </Badge>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Table 2: Biggest MRP Discounts */}
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="text-base">Highest Displayed MRP Discounts</CardTitle>
              <CardDescription>Products with the largest verified percentage off listed MRP.</CardDescription>
            </div>
            <Link href="/deals" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              All products <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {topDeals.map(p => {
                const meta = categoryMeta(p.category)
                return (
                  <li key={p.id}>
                    <Link
                      href={`/product/${p.id}`}
                      className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                      <Badge variant="secondary" className="hidden gap-1.5 sm:inline-flex">
                        <meta.icon />
                        {meta.label}
                      </Badge>
                      <span className="w-20 text-right text-sm font-semibold tabular-nums">{formatINR(p.price)}</span>
                      <Badge variant="destructive" className="w-20 justify-center whitespace-nowrap">
                        {p.discount_percent}% off
                      </Badge>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
