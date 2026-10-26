'use client'

import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { PieChart as PieIcon, Percent, IndianRupee } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { categoryMeta } from '@/lib/categories'
import { formatINRCompact } from '@/lib/format'

export interface CategoryStat {
  category: string
  count: number
  avgDiscount: number
  avgPrice: number
}

// One accent for bar charts; a blue-to-slate ramp for the donut so slices stay distinguishable.
const ACCENT = 'hsl(var(--primary))'
const RAMP = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#475569', '#94a3b8', '#cbd5e1']

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--popover-foreground))',
}

function ChartCard({
  title, description, icon: Icon, children,
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

export default function OverviewCharts({ stats, total }: { stats: CategoryStat[]; total: number }) {
  const data = stats.map((s, i) => ({ ...s, label: categoryMeta(s.category).label, color: RAMP[i % RAMP.length] }))

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title="Category distribution" description="Share of this week's deals by category." icon={PieIcon}>
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="label" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none">
                  {data.map(d => <Cell key={d.category} fill={d.color} />)}
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

      <ChartCard title="Average discount by category" description="Mean percentage off listed price." icon={Percent}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v) => [`${v}%`, 'Avg discount']} />
              <Bar dataKey="avgDiscount" fill={ACCENT} radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="lg:col-span-2">
        <ChartCard title="Average price by category" description="Mean listed price across this week's deals." icon={IndianRupee}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tickFormatter={formatINRCompact} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={56} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v) => [formatINRCompact(Number(v)), 'Avg price']} />
                <Bar dataKey="avgPrice" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
