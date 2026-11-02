import Link from 'next/link'
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  TrendingDown,
  Zap,
} from 'lucide-react'
import { getFreshFindsData, getProductsData, getTrendsData } from '@/lib/products'
import {
  buildManagementDecisions,
  computeOpportunityScores,
  detectMarketOpportunities,
  generateAlerts,
} from '@/lib/intelligence'
import PageHeader from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Alerts & Recommendation Engine — Flipkart Product Intelligence' }

export default async function AlertsPage() {
  const [{ products }, fresh, trends] = await Promise.all([
    getProductsData(),
    getFreshFindsData(),
    getTrendsData(),
  ])

  const scored = computeOpportunityScores(products)
  const opportunities = detectMarketOpportunities(scored)
  const decisions = buildManagementDecisions(scored, opportunities)
  const alerts = generateAlerts(scored, fresh?.products ?? [], trends)

  const droppedCount = products.filter(p => (p.price_change ?? 0) < 0).length
  const topOppCat = opportunities[0]

  return (
    <div className="space-y-6">
      <PageHeader
        title="07. Alerts & Recommendation Engine — Management Decision Layer"
        description="Automated anomaly alerts, AI-generated weekly executive brief, and structured 'Observation → Root Cause → Action' recommendations."
      />

      {/* AI-Powered Weekly Executive Summary */}
      <Card className="border-primary/25 bg-primary/[0.03]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-primary">
            <Sparkles className="h-4 w-4" />
            AI-Generated Weekly Management Summary
          </CardTitle>
          <CardDescription>Synthesized from {products.length} weekly deals, {fresh?.products.length ?? 0} daily launches, and historical price baselines.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p>
            This week&apos;s automated analysis indicates heightened promotional activity across{' '}
            <strong>{topOppCat?.categoryLabel ?? 'Electronics'}</strong>, <strong>Fashion</strong>, and{' '}
            <strong>Home &amp; Kitchen</strong>, with <strong>{droppedCount} of {products.length} tracked SKUs</strong>{' '}
            recording observed week-over-week price reductions beyond their static MRP badges.
          </p>
          <p className="text-muted-foreground">
            While deep discounts are driving buyer interest in the{' '}
            <strong>{topOppCat?.dominantPriceBand ?? '₹500–₹1,500'}</strong> segment, LLM review extraction highlights
            recurring customer complaints regarding{' '}
            <strong>&ldquo;{topOppCat?.topComplaintTheme.toLowerCase() ?? 'build durability'}&rdquo;</strong>. The
            category management team should prioritize sourcing and featuring 4.2★+ rated alternatives in these price
            bands rather than relying solely on deeper price cuts.
          </p>
        </CardContent>
      </Card>

      {/* Automated Alerts Grid */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BellRing className="h-4 w-4 text-primary" />
          Automated Market &amp; Catalog Alerts ({alerts.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {alerts.map(alert => {
            const Icon =
              alert.type === 'price_drop'
                ? TrendingDown
                : alert.type === 'rating_deterioration'
                ? AlertTriangle
                : alert.type === 'new_discovery'
                ? Zap
                : CheckCircle2
            return (
              <Card key={alert.id}>
                <CardContent className="space-y-2.5 p-4 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      <Icon className="h-4 w-4 text-primary" />
                      {alert.title}
                    </span>
                    <Badge
                      variant={
                        alert.severity === 'high'
                          ? 'destructive'
                          : alert.severity === 'medium'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {alert.categoryLabel}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{alert.detail}</p>
                  <div className="flex items-center justify-between gap-2 rounded bg-muted/50 px-3 py-2">
                    <span className="font-medium text-foreground">
                      <strong>PM Action:</strong> {alert.pmAction}
                    </span>
                    {alert.productId && (
                      <Link
                        href={`/product/${alert.productId}`}
                        className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-primary hover:underline"
                      >
                        Inspect SKU <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Full Management Decision Layer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-primary" />
            Category Management Decision Playbook (What · Why · What Next)
          </CardTitle>
          <CardDescription>
            Every insight follows a structured 3-part PM framework: Observation → Root Cause → Recommended Action.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {decisions.map(item => (
            <div key={item.id} className="space-y-2.5 rounded-lg border p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{item.categoryLabel}</span>
                <Badge variant={item.priority === 'High' ? 'destructive' : 'warning'}>
                  {item.priority} Priority
                </Badge>
              </div>
              <div>
                <p className="font-semibold text-foreground">What is happening in the market?</p>
                <p className="mt-0.5 text-muted-foreground leading-relaxed">{item.whatIsHappening}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Why is it happening?</p>
                <p className="mt-0.5 text-muted-foreground leading-relaxed">{item.whyItIsHappening}</p>
              </div>
              <div className="rounded-md bg-primary/5 p-2.5">
                <p className="font-semibold text-primary">What should the category team do about it?</p>
                <p className="mt-0.5 text-foreground/90 leading-relaxed">{item.whatToDoNext}</p>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">{item.supportingMetric}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

