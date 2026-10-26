import { getProductsData } from '@/lib/products'
import PageHeader from '@/components/PageHeader'
import DealsExplorer from '@/components/DealsExplorer'

export const metadata = { title: 'Deals — Weekly Product Discovery' }

export default function DealsPage() {
  const { products } = getProductsData()

  return (
    <>
      <PageHeader title="Deals" description="Discounted picks across categories. Filter, sort and compare any two products." />
      <DealsExplorer products={products} />
    </>
  )
}
