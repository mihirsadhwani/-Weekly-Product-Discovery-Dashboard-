import { Suspense } from 'react'
import { getProductsData } from '@/lib/products'
import PageHeader from '@/components/PageHeader'
import CustomerSentimentPanel from '@/components/CustomerSentimentPanel'
import DealsExplorer from '@/components/DealsExplorer'

export const metadata = { title: 'Product Performance & Sentiment — Flipkart Product Intelligence' }

export default async function DealsPage() {
  const { products } = await getProductsData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="05. Product Performance, Customer Sentiment & Catalog Explorer"
        description="Analyze rating tiers, LLM review sentiment, recurring buyer pain points, and filter or 1v1 compare every tracked SKU."
      />
      <CustomerSentimentPanel products={products} />
      <Suspense fallback={<div className="h-96 animate-pulse bg-card" />}>
        <DealsExplorer products={products} />
      </Suspense>
    </div>
  )
}
