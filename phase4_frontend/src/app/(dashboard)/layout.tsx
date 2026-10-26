import StoreHeader from '@/components/shell/StoreHeader'
import { getProductsData } from '@/lib/products'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const categories = Array.from(new Set(getProductsData().products.map(p => p.category)))

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader categories={categories} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      <footer className="mt-8 border-t bg-card py-6 text-center text-xs text-muted-foreground">
        Prices and links from Flipkart. AI analysis powered by Google Gemini.
      </footer>
    </div>
  )
}
