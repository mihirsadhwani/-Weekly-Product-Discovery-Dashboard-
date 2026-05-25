'use client'

import { useState, useEffect } from 'react'
import { getRelativeTime } from '@/lib/utils'

interface Props {
  lastUpdated: string | null
  totalProducts: number
}

export default function FreshnessBanner({ lastUpdated, totalProducts }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [relTime, setRelTime]     = useState('')

  useEffect(() => { setRelTime(getRelativeTime(lastUpdated)) }, [lastUpdated])

  if (dismissed || !lastUpdated) return null

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 border-b border-indigo-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5">

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-indigo-100">Live data</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-xs text-indigo-200">Updated</span>
            <span className="text-xs font-bold text-white">{relTime}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-xs text-indigo-200">Products</span>
            <span className="text-xs font-bold text-white">{totalProducts}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-xs text-indigo-200">Next refresh</span>
            <span className="text-xs font-bold text-white">Sunday</span>
          </div>

        </div>

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-indigo-300 hover:bg-indigo-500/50 hover:text-white transition-colors text-xs"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
