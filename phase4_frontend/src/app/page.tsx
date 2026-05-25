import { Suspense } from 'react'
import { getProductsData, getNewTodayData, getTrendsData, getFreshFindsData } from '@/lib/products'
import ProductDashboard from '@/components/ProductDashboard'
import DashboardSkeleton from '@/components/DashboardSkeleton'

async function DashboardContent() {
  const data        = getProductsData()
  const newToday    = getNewTodayData()
  const trends      = getTrendsData()
  const freshFinds  = getFreshFindsData()
  return <ProductDashboard data={data} newToday={newToday} trends={trends} freshFinds={freshFinds} />
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
