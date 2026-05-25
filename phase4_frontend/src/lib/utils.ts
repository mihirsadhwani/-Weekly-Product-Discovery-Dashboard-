// Pure utility functions — no Node.js imports, safe for client components

export function formatPrice(price: number | null): string {
  if (!price) return 'Price N/A'
  return `₹${price.toLocaleString('en-IN')}`
}

export function formatScore(qualityScore: number): string {
  return (qualityScore / 10).toFixed(1)
}

export function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  try {
    const date = new Date(dateStr)
    const diffMs = Date.now() - date.getTime()
    const diffH = Math.floor(diffMs / 3_600_000)
    const diffD = Math.floor(diffH / 24)
    if (diffH < 1)  return 'Just now'
    if (diffH < 24) return `${diffH}h ago`
    if (diffD === 1) return 'Yesterday'
    if (diffD < 7)  return `${diffD} days ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return 'Recently'
  }
}
