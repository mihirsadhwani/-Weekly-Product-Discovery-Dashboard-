'use client'

interface Props {
  lastUpdated: string | null
  productCount: number
}

function getTimeAgo(timestamp: string | null): string {
  if (!timestamp) return 'unknown'
  const hours = Math.floor((Date.now() - new Date(timestamp).getTime()) / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  if (days <= 7) return days === 1 ? '1 day ago' : `${days} days ago`
  const date = new Date(timestamp)
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export default function Header({ lastUpdated, productCount }: Props) {
  const timeAgo = getTimeAgo(lastUpdated)

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-3xl">🛍️</span>
              Weekly Product Discovery
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Fresh finds from Flipkart, analyzed by AI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-blue-500 text-base">🔄</span>
            <span>Last updated <strong className="text-gray-700">{timeAgo}</strong></span>
          </div>
          <span className="text-gray-300">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-green-500 text-base">📦</span>
            <span><strong className="text-gray-700">{productCount} products</strong> this week</span>
          </div>
          <span className="text-gray-300">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-purple-500 text-base">⏰</span>
            <span>Updates every <strong className="text-gray-700">Sunday</strong></span>
          </div>
        </div>

      </div>
    </header>
  )
}
