'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { refreshData } from '@/app/actions'
import { cn } from '@/lib/cn'

export default function RefreshButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [message, setMessage] = useState('')

  function refresh() {
    setMessage('')
    start(async () => {
      const result = await refreshData()
      setMessage(result.message)
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
      >
        <RefreshCw className={cn('h-4 w-4', pending && 'animate-spin')} />
        {pending ? 'Refreshing…' : 'Refresh data'}
      </button>
      {message && (
        <p role="status" className="absolute right-0 top-full z-10 mt-2 w-64 rounded-md border bg-card p-3 text-xs text-muted-foreground shadow-md">
          {message}
        </p>
      )}
    </div>
  )
}
