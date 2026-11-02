'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { Award, CheckCircle2, IndianRupee, Percent, PieChart as PieIcon, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { categoryMeta } from '@/lib/categories'
import { formatINR, formatINRCompact } from '@/lib/format'

export interface CategoryStat {
  category: string
  count: number
  avgDiscount: number
  avgPrice: number
  avgPrevPrice: number
  avgMrp: number
  avgQuality: number
  avgVfm: number
  vfmCount: number
  buyCount: number
  waitCount: number
  skipCount: number
}

export interface ScatterPoint {
  id: string
  name: string
  category: string
  price: number
  discount: number
  quality: number
  vfmScore: number
  isVfm: boolean
}

const ACCENT = 'hsl(var(--primary))'
const RAMP = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#0284c7', '#0d9488', '#6366f1', '#64748b']

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--popover-foreground))',
}

function ChartCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  icon: typeof PieIcon
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function OverviewCharts({
  stats,
  scatterPoints,
  total,
}: {
  stats: CategoryStat[]
  scatterPoints: ScatterPoint[]
  total: number
}) {
  const data = stats.map((s, i) => ({
    ...s,
    label: categoryMeta(s.category).label,
    color: RAMP[i % RAMP.length],
  }))

  const vfmPoints = scatterPoints.filter(p => p.isVfm)
  const regularPoints = scatterPoints.filter(p => !p.isVfm)

  const discountBrackets = [
    { bracket: '0–20%', count: scatterPoints.filter(p => p.discount < 20).length },
    { bracket: '20–40%', count: scatterPoints.filter(p => p.discount >= 20 && p.discount < 40).length },
    { bracket: '40–60%', count: scatterPoints.filter(p => p.discount >= 40 && p.discount < 60).length },
    { bracket: '60–75%', count: scatterPoints.filter(p => p.discount >= 60 && p.discount < 75).length },
    { bracket: '75%+', count: scatterPoints.filter(p => p.discount >= 75).length },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 1. Full-width: "Pehle vs Aaj" (Before vs Today) Category Price Comparison */}
      <div className="lg:col-span-2">
        <ChartCard
          title="Before vs. Today Price Comparison by Category (MRP vs. Pehle vs. Aaj)"
          description="Compare average listed MRP, Last Week's price (Pehle), and Today's deal price (Aaj) across all 8 categories."
          icon={IndianRupee}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tickFormatter={formatINRCompact}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={58}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  formatter={(v, name) => [formatINR(Number(v)), String(name)]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="avgMrp" name="MRP (Original)" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="avgPrevPrice" name="Pehle (Last Week)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="avgPrice" name="Aaj (Today)" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* 2. Value-for-Money (VFM) Matrix: Discount % vs AI Quality Score Scatter */}
      <ChartCard
        title="Value-for-Money (VFM) Quadrant Matrix"
        description="Discount % vs. AI Quality Score across all products. Green dots are certified VFM Picks."
        icon={Award}
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                dataKey="discount"
                name="Discount"
                unit="%"
                domain={[0, 95]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="quality"
                name="AI Quality"
                domain={[45, 100]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <ZAxis type="number" dataKey="vfmScore" range={[45, 140]} name="VFM Score" />
              <ReferenceLine x={40} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <ReferenceLine y={74} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={tooltipStyle}
                formatter={(val, name) => [
                  name === 'Discount' ? `${val}%` : val,
                  String(name),
                ]}
                labelFormatter={(_, payload) => {
                  const pt = payload?.[0]?.payload as ScatterPoint | undefined
                  return pt ? `${pt.name.slice(0, 42)} (${formatINR(pt.price)})` : ''
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Scatter name="VFM Picks (is_vfm)" data={vfmPoints} fill="#16a34a" />
              <Scatter name="Standard Deals" data={regularPoints} fill="#3b82f6" fillOpacity={0.65} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 3. AI Quality Score vs VFM Score by Category */}
      <ChartCard
        title="AI Quality vs. VFM Score by Category"
        description="Mean AI sentiment/quality score alongside composite Value-for-Money score (0–100)."
        icon={Sparkles}
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20 }}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={105}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="avgQuality" name="AI Quality" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey="avgVfm" name="VFM Score" fill="#16a34a" radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 4. Category Distribution Donut */}
      <ChartCard title="Category distribution" description="Share of this week's deals by category." icon={PieIcon}>
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map(d => (
                    <Cell key={d.category} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v} deals`, String(n)]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{total}</span>
              <span className="text-xs text-muted-foreground">deals</span>
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            {data.map(d => (
              <li key={d.category} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-md" style={{ backgroundColor: d.color }} />
                <span className="flex-1 truncate">{d.label}</span>
                <span className="tabular-nums text-muted-foreground">{Math.round((d.count / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </ChartCard>

      {/* 5. Discount Bracket Distribution (Histogram) */}
      <ChartCard
        title="Discount bracket distribution"
        description="How many tracked products fall into each MRP discount bracket."
        icon={Percent}
      >
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={discountBrackets} margin={{ left: 0, right: 16, top: 8 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="bracket"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'hsl(var(--muted))' }}
                formatter={v => [`${v} products`, 'Count']}
              />
              <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 6. Full-width: AI Recommendation Distribution (Buy vs Wait vs VFM) by Category */}
      <div className="lg:col-span-2">
        <ChartCard
          title="AI Verdict & VFM Certification Breakdown by Category"
          description="Number of products rated 'Buy', 'Wait', and certified as 'VFM Picks' in each vertical."
          icon={CheckCircle2}
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="buyCount" name="AI: Buy" stackId="rec" fill="#16a34a" radius={[0, 0, 0, 0]} maxBarSize={36} />
                <Bar dataKey="waitCount" name="AI: Wait" stackId="rec" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="vfmCount" name="Certified VFM Picks" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
