import { Suspense } from 'react'
import { getFreshFindsData, getProductsData } from '@/lib/products'
import { computeOpportunityScores } from '@/lib/intelligence'
import PageHeader from '@/components/PageHeader'
import CategoryIntelligenceView from '@/components/CategoryIntelligenceView'

export const metadata = { title: 'Category Intelligence — Flipkart Product Intelligence' }

export default async function CategoriesPage() {
  const [{ products }, fresh] = await Promise.all([getProductsData(), getFreshFindsData()])
  const scored = computeOpportunityScores(products)

  return (
    <div className="space-y-6">
      <PageHeader
        title="04. Category Intelligence — Vertical Performance & Comparison"
        description="Analyze category pricing, rating health, price-drop velocity, and compare verticals side-by-side to prioritize product discovery."
      />
      <Suspense>
        <CategoryIntelligenceView products={scored} freshFinds={fresh?.products ?? []} />
      </Suspense>
    </div>
  )
}

