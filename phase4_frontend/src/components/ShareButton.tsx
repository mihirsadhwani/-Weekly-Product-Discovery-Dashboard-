'use client'

import { useState } from 'react'

interface Props {
  productName: string
}

export default function ShareButton({ productName }: Props) {
  const [toast, setToast] = useState(false)

  async function handleShare() {
    const url = window.location.href
    const text = `Check out this AI-analyzed product: ${productName}`

    if (navigator.share) {
      try {
        await navigator.share({ title: productName, text, url })
        return
      } catch {
        // User cancelled or API failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setToast(true)
      setTimeout(() => setToast(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </button>

      {/* Toast */}
      {toast && (
        <div className="absolute right-0 top-10 z-50 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-fade-in">
          🔗 Link copied!
        </div>
      )}
    </div>
  )
}
