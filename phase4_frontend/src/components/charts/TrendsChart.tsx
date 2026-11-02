'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { categoryMeta } from '@/lib/categories'
import { formatINR, formatINRCompact } from '@/lib/format'
import type { DecliningCategory, PriceMovement, TrendCategory } from '@/types/product'

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--popover-foreground))',
}

export default function TrendsChart({ data }: { data: TrendCategory[] }) {
  const rows = data.map(d => ({
    ...d,
    label: categoryMeta(d.category).label,
    lastCount: d.last_count ?? d.count,
  }))

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: 0, right: 8 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            interval={0}
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
          <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="lastCount" name="Pehle (Last Week)" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="count" name="Aaj (This Week)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PriceMovementChart({ data }: { data: PriceMovement[] }) {
  const rows = data.map(d => ({
    label: categoryMeta(d.category).label,
    pehlePrice: d.last_avg_price ?? d.avg_price,
    aajPrice: d.avg_price,
  }))

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: 0, right: 12 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            interval={0}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatINRCompact}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            contentStyle={tooltipStyle}
            formatter={(v, name) => [formatINR(Number(v)), String(name)]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="pehlePrice" name="Pehle (Last Week Avg)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="aajPrice" name="Aaj (Today Avg)" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SentimentShiftChart({ data }: { data: DecliningCategory[] }) {
  const rows = data.map(d => ({
    label: categoryMeta(d.category).label,
    pehleSentiment: d.last_sentiment ?? d.avg_sentiment,
    aajSentiment: d.avg_sentiment,
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 20 }}>
          <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            domain={[50, 100]}
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
          <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="pehleSentiment" name="Pehle (Last Week)" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={10} />
          <Bar dataKey="aajSentiment" name="Aaj (This Week)" fill="#16a34a" radius={[0, 4, 4, 0]} barSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
