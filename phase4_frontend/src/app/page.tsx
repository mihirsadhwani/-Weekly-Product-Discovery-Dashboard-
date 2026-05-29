import { Suspense } from 'react'
import { getProductsData, getNewTodayData, getTrendsData, getFreshFindsData } from '@/lib/products'
import ProductDashboard from '@/components/ProductDashboard'
import DashboardSkeleton from '@/components/DashboardSkeleton'

async function DashboardContent() {
  const data        = getProductsData()
  const newToday    = getNewTodayData()
  const trends      = getTrendsData()
  const freshFinds  = getFreshFindsData()

  // Use the most recent date between weekly products.json and daily fresh_finds.json
  const candidates = [data.last_updated, freshFinds?.date ?? null].filter(Boolean) as string[]
  const latestUpdate = candidates.sort().pop() ?? null

  return <ProductDashboard data={{ ...data, last_updated: latestUpdate }} newToday={newToday} trends={trends} freshFinds={freshFinds} />
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
