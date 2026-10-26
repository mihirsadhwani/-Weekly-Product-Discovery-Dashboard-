import AppSidebar from '@/components/shell/AppSidebar'
import { getProductsData, getFreshFindsData } from '@/lib/products'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const products = getProductsData()
  const fresh = getFreshFindsData()

  return (
    <div className="min-h-screen bg-muted/30">
      <AppSidebar freshCount={fresh?.products.length ?? 0} dealCount={products.products.length} />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  )
}
