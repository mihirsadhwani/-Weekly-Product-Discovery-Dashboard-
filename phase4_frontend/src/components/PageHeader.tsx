import { Clock } from 'lucide-react'
import { getProductsData, getFreshFindsData } from '@/lib/products'
import { formatRunTime, latestTimestamp } from '@/lib/format'

interface Props {
  title: string
  description: string
}

export default function PageHeader({ title, description }: Props) {
  const lastRun = latestTimestamp(getProductsData().last_updated, getFreshFindsData()?.date)

  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-md border bg-card px-3 py-1.5 text-sm font-medium shadow-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        Last run {formatRunTime(lastRun)}
      </div>
    </div>
  )
}
