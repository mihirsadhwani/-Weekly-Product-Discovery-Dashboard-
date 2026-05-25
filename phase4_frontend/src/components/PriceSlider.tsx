'use client'

interface Props {
  min?: number
  max?: number
  value: [number, number]
  onChange: (v: [number, number]) => void
}

function fmt(v: number) {
  return v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`
}

export default function PriceSlider({ min = 0, max = 50_000, value, onChange }: Props) {
  const [minVal, maxVal] = value
  const range    = max - min
  const leftPct  = ((minVal - min) / range) * 100
  const rightPct = ((max - maxVal) / range) * 100

  return (
    <div className="flex-1">
      {/* Min / Max labels */}
      <div className="flex justify-between mb-2.5">
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
          {fmt(minVal)}
        </span>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
          {fmt(maxVal)}
        </span>
      </div>

      {/* Dual-thumb track */}
      <div className="range-slider relative h-8 flex items-center">
        {/* Gray background track */}
        <div className="absolute w-full h-2 bg-gray-200 rounded-full" />
        {/* Blue active track */}
        <div
          className="absolute h-2 bg-blue-600 rounded-full shadow-sm"
          style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min} max={max} step={500}
          value={minVal}
          onChange={e => onChange([Math.min(Number(e.target.value), maxVal - 500), maxVal])}
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min} max={max} step={500}
          value={maxVal}
          onChange={e => onChange([minVal, Math.max(Number(e.target.value), minVal + 500)])}
        />
      </div>
    </div>
  )
}
