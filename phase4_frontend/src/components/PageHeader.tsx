import { Clock } from 'lucide-react'
import { getProductsData, getFreshFindsData } from '@/lib/products'
import RefreshButton from '@/components/RefreshButton'
import { formatRunTime, latestTimestamp } from '@/lib/format'

interface Props {
  title: string
  description: string
}

export default async function PageHeader({ title, description }: Props) {
  const lastRun = latestTimestamp((await getProductsData()).last_updated, (await getFreshFindsData())?.date)

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-start">
        <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Last run {formatRunTime(lastRun)}
        </div>
        <RefreshButton />
      </div>
    </div>
  )
}
