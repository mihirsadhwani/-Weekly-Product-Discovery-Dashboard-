// Pure helpers — safe for server and client components.

/** Timestamps from the Python pipeline have no zone suffix; they are UTC. */
function parseUtc(ts: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(ts) ? ts : `${ts}Z`)
}

export function latestTimestamp(...stamps: (string | null | undefined)[]): string | null {
  const valid = stamps.filter((s): s is string => !!s && !isNaN(parseUtc(s).getTime()))
  if (valid.length === 0) return null
  return valid.sort((a, b) => parseUtc(a).getTime() - parseUtc(b).getTime()).pop() ?? null
}

/** e.g. "26 Oct, 16:28 IST" — fixed zone so server and client render identically. */
export function formatRunTime(ts: string | null): string {
  if (!ts) return 'Never'
  const d = parseUtc(ts)
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })
  return `${date}, ${time} IST`
}

export function formatINR(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

/** Compact axis labels: 56540 -> ₹56.5K */
export function formatINRCompact(value: number): string {
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`
  return `₹${Math.round(value)}`
}

/**
 * The scraper occasionally captures a bogus original price (e.g. ₹1.8L for a ₹332 item).
 * Only trust the strikethrough price when it agrees with the stated discount.
 */
export function trustedOriginalPrice(
  price: number | null,
  original: number | null | undefined,
  discountPct: number | null | undefined,
): number | null {
  if (!price || !original || !discountPct || original <= price) return null
  const implied = (1 - price / original) * 100
  return Math.abs(implied - discountPct) <= 5 ? original : null
}
