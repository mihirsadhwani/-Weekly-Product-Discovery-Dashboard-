# Weekly Product Discovery Dashboard — Architecture

## What This Project Does

Scrapes Flipkart for new launches and discounted products, runs a quick AI review analysis on each product with Google Gemini, and shows the results in a Flipkart-style dashboard hosted on **Vercel**. There is no database: the pipeline writes JSON files, commits them to GitHub, and the website reads them.

Two pipelines feed the site:

| Pipeline | Entry point | Data it produces | Shown on |
|----------|------------|------------------|----------|
| **Daily "Fresh Finds"** (new launches) | `phase1_scraping/run_light_scrape.py` | `fresh_finds.json` | `/` (home), `/overview` |
| **Weekly "Deals"** (popular discounted products) | `phase1_scraping/run_deals_scrape.py` | `products.json`, `deals_finds.json`, `deals_backup.json`, `trends.json` | `/deals`, `/overview`, `/trends`, `/product/[id]` |

---

## System Overview (Vercel hosting)

```
GitHub Actions (ubuntu runner + Tor + Playwright)
  .github/workflows/weekly_scrape.yml
        │  python phase5_automation/scheduler.py --mode daily|weekly
        ▼
  output/*.json  ──copy──►  phase4_frontend/public/data/*.json
        │
        ▼  git commit + push to main ("data: daily|weekly update …")
   GitHub (main)
        │
        ├──► Vercel auto-deploys on every push (bundled copy of the data)
        │
        └──► raw.githubusercontent.com  ◄── site fetches latest JSON at runtime
                                              (cached 1 h, tag "data")

 Browser ──► Vercel (Next.js 14)
              ├─ pages read data via src/lib/products.ts
              ├─ "Refresh data" button  ──► server action ──► GitHub API
              │                              1. purges the data cache (new data shows at once)
              │                              2. starts the daily workflow (live Flipkart scrape)
              └─ /api/compare           ──► Gemini API (AI product comparison)
```

Scraping cannot run on Vercel. Flipkart blocks datacenter IPs, so the scrape needs Tor and a headless browser, which only the GitHub Actions runner has. Vercel only serves the site and triggers the runner.

---

## What Gets Scraped

### Daily — Fresh Finds (`run_light_scrape.py`)

Targets Flipkart's newest launches (recency-sorted) in 4 categories, about 10 products each (about 40 total):

| Category | Source URL (`config.py` → `CATEGORY_URLS`) |
|----------|-------------------------------------------|
| Electronics | mobiles, `sid=tyy,4io`, `sort=recency_desc` |
| Fashion | clothing, `sid=clo` |
| Home_Kitchen | home-kitchen, `sid=j9e` |
| Beauty | beauty-grooming, `sid=g9b,ffi` |

Per product it collects: name, price, category, image URL, Flipkart URL, scrape time, plus the AI `quick_analysis`.

Steps:
1. **Listings** — `requests` + BeautifulSoup. If blocked, retry through Tor (up to 5 exit nodes, rotating the circuit) and then ScraperAPI (`SCRAPERAPI_KEY`).
2. **Reviews** — Playwright opens each product page and reads about 10 reviews.
3. **AI** — one batched Gemini call per 10 products (`quick_analyzer.py`, model `gemini-3.5-flash-lite` by default, override with `GEMINI_MODEL`). Products that already have a real analysis are reused from the previous `fresh_finds.json`, so they are never paid for twice.
4. Writes `output/fresh_finds.json`.

### Weekly — Deals (`run_deals_scrape.py`)

Targets popular, genuinely discounted products in 8 categories, about 10 per category (87 in the latest run):

Mobiles · Laptops · TVs · Men_Fashion · Women_Fashion · Home_Kitchen · Beauty · Sports

- Listings are sorted by discount or popularity. Only products with a visible discount are kept (minimum 5%; Mobiles and the ethnic-wear search allow no badge). Fallback search URLs run for any category that ends up under 10 products.
- Reviews are fetched with Playwright (about 5 per product), then analysed with the same batched Gemini call.
- Outputs: `products.json` (weekly pool shown on the site), `deals_finds.json`, `deals_backup.json` (reserve pool used to top up short categories), `trends.json` (hot and declining categories, price movement, best deal).
- Computed per product: `discount_percent`, `is_vfm`, `vfm_score`, `price_prediction`, `comparisons`.

### Politeness and anti-blocking
Random 2–5 s delays, rotated user-agents, 3 retries per page, Tor proxy in CI (`USE_TOR=1`). Tor is unreliable (some exit nodes are geo-redirected or blocked), so a failed daily scrape exits 0 and the previous data stays in place.

---

## Frontend (`phase4_frontend/`) — Next.js 14, Tailwind, shadcn/ui

| Route | Page | Data |
|-------|------|------|
| `/` | Fresh Finds (home) | `fresh_finds.json` |
| `/deals` | Filterable deals explorer, compare two products | `products.json` |
| `/overview` | Category stats and charts | `products.json`, `fresh_finds.json` |
| `/trends` | Trends | `trends.json` |
| `/product/[id]` | Product detail | `products.json` |
| `/api/compare` | AI comparison of two products (server route) | Gemini |

Key code:
- `src/lib/products.ts` — reads each JSON from `raw.githubusercontent.com/.../main/phase4_frontend/public/data/` with a 1-hour cache and the tag `data`. Falls back to the copy bundled in the deployment when GitHub is unreachable. `DATA_BASE_URL` overrides the source.
- `src/app/actions.ts` — `refreshData()` server action behind the **Refresh data** button (see below).
- `src/components/RefreshButton.tsx`, `PageHeader.tsx` (shows "Last run" and the button).

### Refresh data button
1. Purges the cached data so anything the pipeline already committed shows immediately.
2. If `GITHUB_DISPATCH_TOKEN` is set, starts the **daily** workflow through the GitHub API (`workflow_dispatch`, `mode: daily`).
3. Does not start a run if one is already in progress or one started in the last 30 minutes (`COOLDOWN_MS`), because every run spends scrape and AI quota and the button is public.
4. A run takes a few minutes; click Refresh again afterwards to load the new prices.

---

## Automation (`.github/workflows/weekly_scrape.yml`)

| Trigger | When | Mode |
|---------|------|------|
| Weekly cron | Saturday 17:30 UTC (11:00 PM IST) | `weekly` |
| Manual (`workflow_dispatch`) | Actions tab, or the site's Refresh button | `daily` or `weekly` |

The daily schedule was removed on purpose: daily runs only start manually or from the button.

Steps: checkout → Python 3.11 → install `playwright`, `google-genai`, `beautifulsoup4`, `requests[socks]`, `groq` → install Tor and start it → copy existing `fresh_finds.json` and `deals_backup.json` into `output/` → `scheduler.py --mode …` → copy results into `phase4_frontend/public/data/` (a file is only copied if it is non-empty, so a failed scrape never overwrites good data) → commit and push to `main` → Vercel redeploys.

---

## Environment Variables

**Vercel** (Project → Settings → Environment Variables; Production and Preview)

| Name | Purpose |
|------|---------|
| `GEMINI_API_KEY` | `/api/compare` AI comparison |
| `GITHUB_DISPATCH_TOKEN` | Fine-grained GitHub token, this repo only, **Actions: Read and write**. Lets the Refresh button start the workflow. Without it the button only reloads published data |
| `GITHUB_REPO` | Optional, `owner/repo` (defaults to this repo) |
| `DATA_BASE_URL` | Optional, overrides where data JSON is fetched from |
| `GEMINI_MODEL` | Optional, overrides the compare model |

**GitHub Actions secrets** (Repo → Settings → Secrets and variables → Actions)

| Name | Purpose |
|------|---------|
| `GEMINI_API_KEY` | Quick review analysis in the daily and weekly pipelines |
| `SCRAPERAPI_KEY` | Optional last-resort listing fetch |
| `GROQ_API_KEY` | Only used by the old per-product Groq path, when no Gemini key is set |
| `GITHUB_TOKEN` | Provided automatically; used to push data back to `main` |

**Local** — `phase2_analysis/.env` (gitignored) holds `GEMINI_API_KEY`. Never commit keys.

---

## Folder Structure

```
├── ARCHITECTURE.md
├── .github/workflows/weekly_scrape.yml
├── phase1_scraping/
│   ├── config.py               ← CATEGORY_URLS (daily), delays, user-agents
│   ├── run_light_scrape.py     ← DAILY entry point (fresh_finds.json)
│   ├── run_deals_scrape.py     ← WEEKLY entry point (products.json, deals, trends)
│   ├── scraper.py, run_scraper.py   ← OLD weekly scraper, not used by the workflow
│   └── debug_selectors.py      ← dev helper
├── phase2_analysis/
│   ├── quick_analyzer.py       ← batched Gemini analysis + per-product cache (used)
│   ├── analyzer.py, run_analysis.py, prompts.py   ← OLD deep analysis, not used
│   └── .env                    ← local only
├── phase3_final_output/
│   ├── trend_analyzer.py       ← used by the weekly deals scrape
│   ├── comparison_generator.py
│   └── prepare_final.py, run_prepare.py   ← OLD flow, not used
├── phase4_frontend/            ← Next.js app deployed to Vercel
│   ├── public/data/            ← JSON the site reads (committed by the pipeline)
│   └── src/ (app, components, lib)
└── phase5_automation/
    ├── scheduler.py            ← --mode daily | weekly
    └── merge_fresh_finds.py, merge_weekly_pool.py   ← not called by the scheduler
```

---

## Current State (checked 29 Oct 2026)

| Area | Status |
|------|--------|
| Site on Vercel, builds and deploys from `main` | ✅ Working |
| Pages `/`, `/deals`, `/overview`, `/trends`, `/product/[id]` | ✅ Working |
| AI Compare (`/api/compare`) with the new Gemini key | ✅ Working (live test returned a verdict) |
| Refresh button → purge cache + start workflow | ✅ Working (token now has Actions write; a run was started from it) |
| Scheduled weekly run and earlier daily runs | ✅ Ran green up to 27 Oct |
| Latest data | Fresh Finds 27 Oct (40 products), weekly deals 24 Oct (87 products) |
| **AI review analysis** | ❌ Empty in the committed data: all 40 fresh finds and all 87 weekly products show score 0 / "Wait for more data" |
| Ratings and review counts | ❌ Fresh Finds have none; weekly has a rating on only 20 of 87 and no review count on any |
| Price sanity | ⚠️ At least one bad MRP (a ₹1,497 fan with original price ₹489,069) |
| Trends | ⚠️ `has_history: false`, so "declining" and price-movement views have no history yet |
| `new_today.json` | ⚠️ Stale (May 2026), not produced by the current pipeline |
| Old Phase 2/3 code and the two merge scripts | ⚠️ Not used by the workflow; candidates to delete |

### Likely causes and next steps
1. **Empty AI analysis.** The analyzer returns "Wait for more data" when a product has fewer than 2 scraped reviews or when Gemini returns nothing. The GitHub Actions secret `GEMINI_API_KEY` may be missing or an old key; update it with the working key, then check the Actions log of a run for "Gemini batch failed" lines. If the logs show no key errors, the review scraping selectors have stopped matching Flipkart's current pages (`REVIEW_SELECTORS` in both scrapers) and need updating.
2. **Missing ratings and review counts.** The listing parsers do not capture them reliably; fix in `_fetch_listing` and `_parse_listing_html`.
3. **Bad MRPs.** Add a sanity check (original price must be at most a few times the current price) before computing `discount_percent`.
4. Rotate every token and key that has been pasted into chat and set an expiry date on the GitHub token.
