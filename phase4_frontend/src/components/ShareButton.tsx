'use client'

import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ShareButton({ productName }: { productName: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, text: `Check out this AI-analyzed product: ${productName}`, url })
        return
      } catch {
        // Cancelled or unsupported — fall back to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      {copied ? <Check /> : <Share2 />}
      {copied ? 'Link copied' : 'Share'}
    </Button>
  )
}
