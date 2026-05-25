import type { TrendsData } from '@/types/product'

export default function TrendsSection({ trends }: { trends: TrendsData | null }) {
  if (!trends) return null
  if (trends.emerging_keywords === undefined) return null

  const isWeek1 = trends.week_number === 1
  const hasKeywords = trends.emerging_keywords.length > 0
  const hasDrops = trends.declining_categories.some(c => c.drop_points !== undefined)

  return (
    <section className="mb-12 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 sm:p-8 rounded-2xl border border-purple-200">
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-2xl font-bold text-gray-900">📈 Market Trends This Week</h2>
        <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
          AI-DETECTED
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        {isWeek1
          ? 'Week 1: Baseline established · Category growth comparisons unlock next week'
          : 'Updated weekly · Growth trends vs last week\'s data'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Hot Categories — always shows current counts, adds growth % in week 2+ */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔥</span>
            <h3 className="font-bold text-lg text-gray-900">Hot Categories</h3>
          </div>
          {trends.hot_categories.length > 0 ? (
            <div className="space-y-3">
              {trends.hot_categories.map((cat, i) => (
                <div key={i} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="font-semibold text-gray-900">
                    {cat.category.replace('_', ' ')}
                  </div>
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

        {/* Quality / Sentiment — drops in week 2+, current sentiment in week 1 */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{hasDrops ? '📉' : '💬'}</span>
            <h3 className="font-bold text-lg text-gray-900">
              {hasDrops ? 'Quality Alerts' : 'Sentiment Today'}
            </h3>
          </div>
          {trends.declining_categories.length > 0 ? (
            <div className="space-y-3">
              {trends.declining_categories.map((cat, i) => (
                <div key={i} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="font-semibold text-gray-900">
                    {cat.category.replace('_', ' ')}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {cat.drop_points !== undefined ? (
                      <>
                        Sentiment dropped{' '}
                        <span className="text-red-600 font-semibold">↓ {cat.drop_points} pts</span>
                      </>
                    ) : (
                      <span className="text-emerald-600 font-semibold">
                        {cat.avg_sentiment}% positive
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No sentiment data available</p>
          )}
        </div>

        {/* Trending Features — always shown */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💡</span>
            <h3 className="font-bold text-lg text-gray-900">Trending Features</h3>
          </div>
          {hasKeywords ? (
            <div className="flex flex-wrap gap-2">
              {trends.emerging_keywords.map((kw, i) => (
                <span
                  key={i}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold"
                >
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
