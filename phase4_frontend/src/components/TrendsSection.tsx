import type { TrendsData } from '@/types/product'
import { formatPrice } from '@/lib/utils'

export default function TrendsSection({ trends }: { trends: TrendsData | null }) {
  if (!trends) return null
  if (trends.emerging_keywords === undefined) return null

  const isWeek1    = trends.week_number === 1
  const hasKeywords = trends.emerging_keywords.length > 0
  const hasDrops   = trends.declining_categories.some(c => c.drop_points !== undefined)
  const hasPriceMovements = (trends.price_movements ?? []).some(m => m.delta !== undefined)

  return (
    <section className="mb-12 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 sm:p-8 rounded-2xl border border-purple-200">
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-2xl font-bold text-gray-900">📈 Market Trends This Week</h2>
        <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">AI-DETECTED</span>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        {isWeek1
          ? 'Week 1: Baseline established · Price & growth comparisons unlock next week'
          : 'Updated weekly · Growth trends vs last week\'s data'}
      </p>

      {/* Best Deal of the Week */}
      {trends.best_deal && (
        <div className="mb-5 bg-gradient-to-r from-rose-50 to-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-4">
          <span className="text-3xl shrink-0">🔥</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-0.5">Best Deal This Week</div>
            <div className="font-bold text-slate-900 truncate">{trends.best_deal.name}</div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-emerald-700 font-bold">{formatPrice(trends.best_deal.price)}</span>
              {trends.best_deal.discount_percent ? (
                <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                  {trends.best_deal.discount_percent}% off
                </span>
              ) : null}
              {trends.best_deal.score > 0 && (
                <span className="text-xs text-slate-500">AI Score: {trends.best_deal.score}</span>
              )}
            </div>
          </div>
          <a
            href={trends.best_deal.flipkart_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors"
          >
            View →
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Hot Categories */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔥</span>
            <h3 className="font-bold text-lg text-gray-900">Hot Categories</h3>
          </div>
          {trends.hot_categories.length > 0 ? (
            <div className="space-y-3">
              {trends.hot_categories.slice(0, 4).map((cat, i) => (
                <div key={i} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="font-semibold text-gray-900">{cat.category.replace('_', ' ')}</div>
                  <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <span>{cat.count} products</span>
                    {cat.growth_pct !== undefined && (
                      <span className="text-green-600 font-semibold">↑ {cat.growth_pct}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No category data yet</p>
          )}
        </div>

        {/* Price Movements */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💰</span>
            <h3 className="font-bold text-lg text-gray-900">
              {hasPriceMovements ? 'Price Movements' : 'Avg Prices'}
            </h3>
          </div>
          {(trends.price_movements ?? []).length > 0 ? (
            <div className="space-y-3">
              {(trends.price_movements ?? []).slice(0, 4).map((m, i) => (
                <div key={i} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="font-semibold text-gray-900">{m.category.replace('_', ' ')}</div>
                  <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <span>{formatPrice(m.avg_price)}</span>
                    {m.delta !== undefined && m.delta !== 0 && (
                      <span className={m.delta < 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                        {m.delta < 0 ? `↓ ${formatPrice(Math.abs(m.delta))}` : `↑ ${formatPrice(m.delta)}`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              {isWeek1 ? 'Price comparison available next week' : 'No price data'}
            </p>
          )}
        </div>

        {/* Quality / Sentiment */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{hasDrops ? '📉' : '💬'}</span>
            <h3 className="font-bold text-lg text-gray-900">
              {hasDrops ? 'Quality Alerts' : 'Sentiment Today'}
            </h3>
          </div>
          {trends.declining_categories.length > 0 ? (
            <div className="space-y-3">
              {trends.declining_categories.slice(0, 4).map((cat, i) => (
                <div key={i} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="font-semibold text-gray-900">{cat.category.replace('_', ' ')}</div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {cat.drop_points !== undefined ? (
                      <>Sentiment <span className="text-red-600 font-semibold">↓ {cat.drop_points} pts</span></>
                    ) : (
                      <span className="text-emerald-600 font-semibold">{cat.avg_sentiment}% positive</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No sentiment data</p>
          )}
        </div>

        {/* Trending Features */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💡</span>
            <h3 className="font-bold text-lg text-gray-900">Trending Features</h3>
          </div>
          {hasKeywords ? (
            <div className="flex flex-wrap gap-2">
              {trends.emerging_keywords.map((kw, i) => (
                <span key={i} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                  {kw.keyword} <span className="opacity-60">×{kw.mentions}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No trending keywords this week</p>
          )}
        </div>

      </div>
    </section>
  )
}
