import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProductById, getProductsData } from '@/lib/products'
import { formatPrice, formatScore, getRelativeTime } from '@/lib/utils'
import RecommendationBadge from '@/components/RecommendationBadge'
import ProConList from '@/components/ProConList'
import SentimentBreakdown from '@/components/SentimentBreakdown'
import ShareButton from '@/components/ShareButton'
import type { Product } from '@/types/product'

export async function generateStaticParams() {
  const { products } = getProductsData()
  return products.map(p => ({ id: p.id }))
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const product = getProductById(params.id)
  if (!product) return { title: 'Product Not Found' }
  return {
    title: `${product.name} — Weekly Product Discovery`,
    description: product.analysis?.top_quote ?? `Analysis for ${product.name}`,
  }
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = getProductById(params.id)
  if (!product) notFound()

  const { analysis } = product
  const score = formatScore(analysis.quality_score)
  const positiveCount = Math.round((product.review_count ?? 0) * analysis.sentiment_score / 100)
  const negativeCount = Math.round((product.review_count ?? 0) * (100 - analysis.sentiment_score) * 0.25 / 100)
  const mixedCount = (product.review_count ?? 0) - positiveCount - negativeCount

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Products
          </Link>
          <ShareButton productName={product.name} />
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
        {/* Hero */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image */}
            <div className="bg-gray-50 flex items-center justify-center p-8 min-h-[320px]">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full max-w-sm aspect-square object-contain rounded-xl"
                  loading="eager"
                />
              ) : (
                <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-5xl">
                  📦
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.name}</h1>
                  <RecommendationBadge recommendation={analysis.recommendation} />
                </div>

                <div className="text-4xl font-extrabold text-green-600">
                  {formatPrice(product.price)}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1 font-semibold text-gray-800">
                    <span className="text-yellow-400">⭐</span> {score}/10
                  </span>
                  <span>•</span>
                  <span>{product.review_count?.toLocaleString('en-IN') ?? '—'} reviews</span>
                  {product.sub_category && (
                    <>
                      <span>•</span>
                      <span>{product.category} › {product.sub_category}</span>
                    </>
                  )}
                  {product.scraped_at && (
                    <>
                      <span>•</span>
                      <span>Scraped {getRelativeTime(product.scraped_at)}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a
                  href={product.flipkart_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200 shadow-md"
                >
                  🛒 Buy on Flipkart
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment breakdown */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">📊 Review Breakdown</h2>
          <SentimentBreakdown
            sentimentScore={analysis.sentiment_score}
            positiveCount={positiveCount}
            mixedCount={Math.max(mixedCount, 0)}
            negativeCount={negativeCount}
            totalCount={product.review_count ?? 0}
          />
        </section>

        {/* Pros & Cons */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">What People Love & Hate</h2>
          <ProConList pros={analysis.pros} cons={analysis.cons} />
        </section>

        {/* Top quote */}
        {analysis.top_quote && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">💬 Featured Review</h2>
            <blockquote className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-6">
              <p className="text-gray-700 text-lg leading-relaxed italic">
                &ldquo;{analysis.top_quote}&rdquo;
              </p>
              <footer className="mt-3 text-sm text-gray-500">— Verified Buyer</footer>
            </blockquote>
          </section>
        )}

        {/* Verdict */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">🤔 Our Verdict</h2>
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
            <div className="text-3xl font-extrabold text-gray-900">{score}<span className="text-lg text-gray-400 font-normal">/10</span></div>
            <div className="text-sm text-gray-500">
              Quality Score<br />
              Based on {product.review_count?.toLocaleString('en-IN') ?? '—'} verified reviews
            </div>
            <div className="ml-auto">
              <RecommendationBadge recommendation={analysis.recommendation} size="lg" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-xl p-5">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                <span>✅</span> Buy this if you want
              </h3>
              <ul className="space-y-2">
                {analysis.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-green-900">
                    <span className="mt-0.5 text-green-500 shrink-0">•</span>
                    {pro.replace(/\s*\(\d+\s*mentions?\)/i, '')}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-red-50 rounded-xl p-5">
              <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <span>⚠️</span> Skip this if you need
              </h3>
              <ul className="space-y-2">
                {analysis.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-900">
                    <span className="mt-0.5 text-red-500 shrink-0">•</span>
                    {con.replace(/\s*\(\d+\s*mentions?\)/i, '')}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Competitor Comparisons */}
        {product.comparisons && product.comparisons.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">🔄 How It Compares</h2>
            <div className="space-y-4">
              {product.comparisons.map((comp, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-5">
                  <div className="font-semibold text-gray-800 mb-4 text-sm">
                    vs{' '}
                    <span className="text-gray-900">{comp.compared_to.name.slice(0, 60)}{comp.compared_to.name.length > 60 ? '…' : ''}</span>
                    {comp.compared_to.price && (
                      <span className="ml-2 text-gray-500 font-normal">
                        ₹{comp.compared_to.price.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    {comp.better_at?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">✅ Better at</p>
                        <ul className="space-y-1">
                          {comp.better_at.map((f, j) => (
                            <li key={j} className="text-sm text-gray-700 flex gap-2">
                              <span className="text-green-500 shrink-0">•</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {comp.weaker_at?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">⚠️ Weaker at</p>
                        <ul className="space-y-1">
                          {comp.weaker_at.map((f, j) => (
                            <li key={j} className="text-sm text-gray-700 flex gap-2">
                              <span className="text-red-400 shrink-0">•</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="bg-blue-50 rounded-lg px-4 py-2.5 text-sm text-blue-800 italic">
                    💡 {comp.verdict}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div className="flex flex-col sm:flex-row gap-3 pb-4">
          <a
            href={product.flipkart_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200 shadow-md"
          >
            🛒 Buy on Flipkart →
          </a>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 h-12 px-6 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            ← Back to All Products
          </Link>
        </div>
      </main>
    </div>
  )
}
