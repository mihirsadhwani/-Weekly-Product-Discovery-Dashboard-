import Link from 'next/link'
import { ArrowUpRight, Award, Compass, Info, Sparkles } from 'lucide-react'
import { getProductsData } from '@/lib/products'
import { computeOpportunityScores, detectMarketOpportunities } from '@/lib/intelligence'
import { categoryMeta } from '@/lib/categories'
import { formatINR } from '@/lib/format'
import PageHeader from '@/components/PageHeader'
import CsvExportButton from '@/components/CsvExportButton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Market Opportunity Finder — Flipkart Product Intelligence' }

export default async function OpportunitiesPage() {
  const { products } = await getProductsData()
  const scored = computeOpportunityScores(products)
  const opportunities = detectMarketOpportunities(scored)
  const topCandidates = [...scored].sort((a, b) => b.opportunityScore - a.opportunityScore)

  const csvRows = topCandidates.map(p => ({
    Product_Name: p.name,
    Category: categoryMeta(p.category).label,
    Price_INR: p.price,
    Opportunity_Score: p.opportunityScore,
    D_Discount_Score: p.scoreBreakdown.discountScore,
    R_Rating_Score: p.scoreBreakdown.ratingScore,
    P_Price_Competitiveness: p.scoreBreakdown.priceCompetitiveness,
    C_Sentiment_Score: p.scoreBreakdown.sentimentScore,
    Is_VFM: Boolean(p.is_vfm),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="06. Market Opportunity Finder — Product Gaps & Scoring Model"
          description="Identify white-space price segments where high demand, price drops, and recurring customer complaints signal an opportunity for better-quality product sourcing."
        />
        <CsvExportButton
          filename="flipkart_market_opportunities"
          label="Export Opportunity Candidates CSV"
          rows={csvRows}
        />
      </div>

      {/* Methodology & Weighted Formula Banner */}
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-xs">
            <p className="flex items-center gap-1.5 font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              Weighted Opportunity Scoring Model (Normalized 0–100 Scale)
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Formula:</strong>{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                Opportunity Score = 0.25·D + 0.25·R + 0.25·P + 0.25·C
              </code>{' '}
              where <strong>D</strong> = Discount Attractiveness, <strong>R</strong> = Rating Performance,{' '}
              <strong>P</strong> = Price Competitiveness vs. Category Median, and <strong>C</strong> = Customer Review Sentiment.
            </p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Illustrative scoring model: identifies high-potential candidates for PM/category investigation, not guaranteed commercial outcomes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Category Segment Opportunity Detection Cards */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Compass className="h-4 w-4 text-primary" />
          Category Price-Band Gap Analysis
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {opportunities.map(opp => (
            <Card key={opp.category}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{opp.categoryLabel}</CardTitle>
                  <Badge variant="success">Avg Opportunity Score: {opp.avgOpportunityScore}/100</Badge>
                </div>
                <CardDescription>Dominant Price Cluster: {opp.dominantPriceBand}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded border bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground">In {opp.dominantPriceBand}</p>
                    <p className="mt-0.5 text-sm font-bold">
                      {opp.inDominantBand} / {opp.totalProducts} SKUs
                    </p>
                  </div>
                  <div className="rounded border bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground">Rated 4.0★+</p>
                    <p className="mt-0.5 text-sm font-bold text-success">{opp.ratedAbove4} SKUs</p>
                  </div>
                  <div className="rounded border bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground">Observed Price Cuts</p>
                    <p className="mt-0.5 text-sm font-bold text-primary">{opp.withPriceDrops} SKUs</p>
                  </div>
                  <div className="rounded border bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground">Quality Complaints</p>
                    <p className="mt-0.5 text-sm font-bold text-warning">{opp.withComplaints} SKUs</p>
                  </div>
                </div>

                <div className="rounded-md bg-muted/50 p-3 leading-relaxed">
                  <p className="font-semibold text-foreground">PM Opportunity Hypothesis:</p>
                  <p className="mt-0.5 text-muted-foreground">{opp.pmRecommendation}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Top Ranked Opportunity Candidates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-primary" />
            Ranked Product Opportunity Candidates
          </CardTitle>
          <CardDescription>
            Individual SKUs ranked by composite Opportunity Score with normalized component scores (D, R, P, C).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-y bg-muted/90 backdrop-blur">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Rank &amp; Product</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 text-right font-medium">Price</th>
                  <th className="px-3 py-2.5 text-right font-medium">D (Disc)</th>
                  <th className="px-3 py-2.5 text-right font-medium">R (Rate)</th>
                  <th className="px-3 py-2.5 text-right font-medium">P (Price)</th>
                  <th className="px-3 py-2.5 text-right font-medium">C (Sent)</th>
                  <th className="px-4 py-2.5 text-right font-medium">Opportunity Score</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topCandidates.slice(0, 35).map((p, idx) => (
                  <tr key={p.id} className="hover:bg-muted/40">
                    <td className="max-w-[260px] px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        <Link
                          href={`/product/${p.id}`}
                          className="truncate font-medium hover:text-primary hover:underline"
                        >
                          {p.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{categoryMeta(p.category).label}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">{formatINR(p.price)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                      {p.scoreBreakdown.discountScore}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                      {p.scoreBreakdown.ratingScore}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                      {p.scoreBreakdown.priceCompetitiveness}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                      {p.scoreBreakdown.sentimentScore}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge variant={p.opportunityScore >= 75 ? 'success' : 'secondary'}>
                        {p.opportunityScore} / 100
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

