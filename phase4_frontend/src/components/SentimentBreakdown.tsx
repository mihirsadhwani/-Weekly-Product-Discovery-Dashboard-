'use client'

import { useEffect, useState } from 'react'

interface Props {
  sentimentScore: number
  positiveCount: number
  mixedCount: number
  negativeCount: number
  totalCount: number
}

interface BarProps {
  label: string
  emoji: string
  pct: number
  count: number
  color: string
  bgColor: string
}

function Bar({ label, emoji, pct, count, color, bgColor }: BarProps) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div className="flex items-center gap-4">
      <div className="w-28 shrink-0 flex items-center gap-2 text-sm font-medium text-gray-700">
        <span>{emoji}</span> {label}
      </div>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="w-24 shrink-0 text-right">
        <span className={`text-sm font-semibold ${bgColor}`}>{pct}%</span>
        <span className="text-xs text-gray-400 ml-1">({count})</span>
      </div>
    </div>
  )
}

export default function SentimentBreakdown({
  sentimentScore,
  positiveCount,
  mixedCount,
  negativeCount,
  totalCount,
}: Props) {
  const negativePct = Math.round((100 - sentimentScore) * 0.25)
  const mixedPct    = Math.max(0, 100 - sentimentScore - negativePct)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-1">
        Sentiment analysis from {totalCount.toLocaleString('en-IN')} verified reviews
      </p>
      <Bar label="Positive" emoji="😊" pct={sentimentScore}  count={positiveCount} color="bg-green-500"  bgColor="text-green-600" />
      <Bar label="Mixed"    emoji="😐" pct={mixedPct}        count={mixedCount}    color="bg-yellow-400" bgColor="text-yellow-600" />
      <Bar label="Negative" emoji="😞" pct={negativePct}     count={negativeCount} color="bg-red-400"    bgColor="text-red-600"   />
    </div>
  )
}
