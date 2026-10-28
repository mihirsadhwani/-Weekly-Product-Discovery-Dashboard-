'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { DATA_TAG } from '@/lib/products'

export type RefreshResult = { status: 'started' | 'running' | 'cooldown' | 'unavailable'; message: string }

const REPO = process.env.GITHUB_REPO ?? 'mihirsadhwani/-Weekly-Product-Discovery-Dashboard-'
const WORKFLOW = 'weekly_scrape.yml'
// A scrape takes minutes and costs scrape/AI quota, so a public button must not queue runs back to back.
const COOLDOWN_MS = 30 * 60 * 1000

/**
 * Starts the daily pipeline (Flipkart scrape + analysis) on GitHub Actions, since scraping needs
 * Tor and Playwright and cannot run on the host. Also purges the cached data so anything the
 * pipeline already committed shows immediately.
 */
export async function refreshData(): Promise<RefreshResult> {
  revalidateTag(DATA_TAG)
  revalidatePath('/', 'layout')

  const token = process.env.GITHUB_DISPATCH_TOKEN
  if (!token) {
    return { status: 'unavailable', message: 'Live scraping is not configured; showing the latest published data.' }
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const api = `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}`

  try {
    const runsRes = await fetch(`${api}/runs?per_page=1`, { headers, cache: 'no-store' })
    if (runsRes.ok) {
      const last = ((await runsRes.json()) as { workflow_runs: { status: string; created_at: string }[] }).workflow_runs[0]
      if (last && last.status !== 'completed') {
        return { status: 'running', message: 'A live price update is already running. Check back in a few minutes.' }
      }
      if (last && Date.now() - new Date(last.created_at).getTime() < COOLDOWN_MS) {
        return { status: 'cooldown', message: 'Prices were refreshed recently. Showing the latest data.' }
      }
    }

    const res = await fetch(`${api}/dispatches`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ref: 'main', inputs: { mode: 'daily' } }),
    })
    if (!res.ok) return { status: 'unavailable', message: 'Could not start the live price update.' }
    return { status: 'started', message: 'Fetching live prices from Flipkart. This takes a few minutes; click Refresh again to load them.' }
  } catch {
    return { status: 'unavailable', message: 'Could not reach GitHub to start the live price update.' }
  }
}
