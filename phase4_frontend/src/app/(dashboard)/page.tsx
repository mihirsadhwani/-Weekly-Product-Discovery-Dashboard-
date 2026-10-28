import { Inbox } from 'lucide-react'
import { getFreshFindsData } from '@/lib/products'
import PageHeader from '@/components/PageHeader'
import FreshGrid from '@/components/FreshGrid'

export const metadata = { title: 'Fresh Finds — Weekly Product Discovery' }

export default async function HomePage() {
  const fresh = await getFreshFindsData()

  return (
    <>
      <PageHeader title="Fresh Finds" description="Daily picks with quick AI insights. Deep analysis runs every Sunday." />
      {fresh && fresh.products.length > 0 ? (
        <FreshGrid products={fresh.products} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center text-muted-foreground">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">No fresh finds yet. They appear after the next daily run.</p>
        </div>
      )}
    </>
  )
}
