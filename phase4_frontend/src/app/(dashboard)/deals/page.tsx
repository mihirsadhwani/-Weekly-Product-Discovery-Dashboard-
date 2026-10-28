import { Suspense } from 'react'
import { getProductsData } from '@/lib/products'
import DealsExplorer from '@/components/DealsExplorer'

export const metadata = { title: 'Deals — Weekly Product Discovery' }

export default async function DealsPage() {
  const { products } = await getProductsData()

  return (
    // useSearchParams in DealsExplorer requires a Suspense boundary for static rendering
    <Suspense fallback={<div className="h-96 animate-pulse bg-card" />}>
      <DealsExplorer products={products} />
    </Suspense>
  )
}
