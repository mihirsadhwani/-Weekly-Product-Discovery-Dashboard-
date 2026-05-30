# Weekly Product Discovery Dashboard — Architecture

## What This Project Does

An automated pipeline that scrapes Flipkart's newly launched products, analyzes customer reviews with AI, and displays results in a clean, filterable web dashboard. Runs two pipelines: a **daily light scrape** (quick Groq AI) and a **weekly full scrape** (deep Gemini AI analysis).

---

## Dual Pipeline Overview

```
DAILY (3× per day — 9 AM, 1 PM, 5 PM IST)
──────────────────────────────────────────
[GitHub Actions + Tor proxy]
         │
         ▼
┌─────────────────────────┐
│  run_light_scrape.py    │  Playwright scrapes listing pages
│  (phase1_scraping/)     │  + visits product pages for reviews
│                         │  + quick Groq AI analysis per product
└────────────┬────────────┘
             │  output/fresh_finds.json
             ▼
    Merge with today's existing
    fresh_finds (accumulate unique
    products across 3 daily runs)
             │
             ▼
    phase4_frontend/public/data/
    fresh_finds.json  →  Vercel redeploys  →  "Fresh Finds" section


WEEKLY (Saturday 11 PM IST)
────────────────────────────
[GitHub Actions + Tor proxy]
         │
         ▼
┌─────────────────────┐
│  Phase 1: Scraper   │  Playwright paginates listing pages (up to 4 pages/category)
│  scraper.py         │  Targets 60 products total with full reviews
└────────┬────────────┘
         │  scraped_YYYY-MM-DD.json
         ▼
┌─────────────────────┐
│  Phase 2: Analyzer  │  Sends reviews to Google Gemini API
│  analyzer.py        │  Gets: pros, cons, score, recommendation, quote
└────────┬────────────┘
         │  analyzed_YYYY-MM-DD.json
         ▼
┌─────────────────────┐
│  Phase 3: Output    │  Sorts by quality score, writes products.json
│  prepare_final.py   │
└────────┬────────────┘
         │  output/products.json
         ▼
    phase4_frontend/public/data/
    products.json  →  Vercel redeploys  →  "This Week's Best" section
```

---

## Phase Details

### Phase 1 — Scraping
**Folder:** `phase1_scraping/`

| File | Purpose |
|------|---------|
| `config.py` | `CATEGORY_URLS`, `TARGET_COUNTS`, delays, `MAX_LISTING_PAGES=4`, user-agent pool |
| `scraper.py` | Weekly async Playwright scraper — paginates up to 4 listing pages per category to collect 2× target stubs, then visits product pages for full reviews |
| `run_scraper.py` | Entry point for weekly full scrape |
| `run_light_scrape.py` | Daily light scraper — sync Playwright, quick review fetch, inline Groq AI analysis, saves `fresh_finds.json` |

**Category targets (weekly, 60 products total):**
| Category | Target |
|----------|--------|
| Electronics | 25 |
| Fashion | 15 |
| Home_Kitchen | 10 |
| Beauty | 10 |

**Key behaviours:**
- Listing page pagination: scraper collects stubs across up to 4 pages per category until 2× target stubs are gathered — prevents stopping short of the target
- `MIN_REVIEWS_PER_PRODUCT = 10` — products with fewer reviews are skipped
- `MAX_REVIEWS_PER_PRODUCT = 50` — cap per product
- Tor proxy: `USE_TOR=1` env var routes Playwright through `socks5://127.0.0.1:9050` in CI to bypass Flipkart's datacenter IP block
- Random delays (2–5s), rotated user-agents, 3 retries per page

---

### Phase 2 — AI Analysis
**Folder:** `phase2_analysis/`

| File | Purpose |
|------|---------|
| `analyzer.py` | Weekly deep analysis — calls Gemini `gemini-1.5-flash`, returns pros/cons/score/recommendation |
| `quick_analyzer.py` | Daily quick analysis — calls Groq API (`llama3-8b-8192`), returns `quick_score`, `top_pros`, `top_con`, `quick_verdict` |
| `run_analysis.py` | Entry point for weekly analysis phase |

**Weekly analysis output per product:**
```json
{
  "analysis": {
    "pros": ["Great battery (18 mentions)", "Fast charging (12 mentions)"],
    "cons": ["Weak camera in low light (11 mentions)"],
    "top_quote": "Honestly the best phone under 15k.",
    "sentiment_score": 78,
    "recommendation": "Buy",
    "quality_score": 84.5
  }
}
```

**Daily quick analysis output per product:**
```json
{
  "quick_analysis": {
    "quick_score": 80,
    "top_pros": ["Good build quality", "Fast delivery"],
    "top_con": "Battery could be better",
    "quick_verdict": "Worth checking"
  }
}
```

---

### Phase 3 — Final Output
**Folder:** `phase3_final_output/`

Reads the latest weekly analyzed JSON, sorts by `quality_score`, and writes `output/products.json` for the frontend. No database — static JSON file read at build/request time by Next.js.

---

### Phase 4 — Frontend
**Folder:** `phase4_frontend/`
**Deployed at:** Vercel (auto-deploys on every push to `main`)

**Key files:**
```
src/
├── app/
│   ├── page.tsx                  ← Homepage: picks most recent lastUpdated
│   │                               from products.json vs fresh_finds.json
│   └── product/[id]/page.tsx     ← Product detail page
├── components/
│   ├── ProductCard.tsx           ← Full weekly analysis card
│   ├── FreshFindCard.tsx         ← Daily quick-analysis card
│   ├── SimpleProductCard.tsx     ← Fallback card (no analysis)
│   ├── FreshnessBanner.tsx       ← "Updated X hours ago"
│   ├── Header.tsx
│   ├── TrendsSection.tsx
│   ├── CategoryTabs.tsx
│   └── FilterBar.tsx
└── lib/
    ├── products.ts               ← Reads products.json + fresh_finds.json
    └── utils.ts                  ← getRelativeTime(), formatPrice(), etc.
```

**Dashboard sections:**
| Section | Data source | Card type |
|---------|------------|-----------|
| ⚡ Fresh Finds | `fresh_finds.json` (daily) | `FreshFindCard` — quick_score, top_pros |
| 💰 Best Value for Money | `products.json` (weekly) | `ProductCard` — computed VFM score |
| This Week's Best | `products.json` (weekly) | `ProductCard` — full analysis |

**"Last updated" banner** reads the most recent date between `products.json.last_updated` and `fresh_finds.json.date` so it always reflects the latest data source.

---

### Phase 5 — Automation
**Folder:** `phase5_automation/`
**File:** `.github/workflows/weekly_scrape.yml`

**Cron schedule:**
| Trigger | Time (IST) | Mode |
|---------|-----------|------|
| Daily attempt 1 | 9:00 AM | daily |
| Daily attempt 2 | 1:00 PM | daily (Tor retry) |
| Daily attempt 3 | 5:00 PM | daily (Tor retry) |
| Weekly | Saturday 11:00 PM | weekly |

**Workflow steps:**
1. Checkout repo
2. Setup Python 3.11
3. Install dependencies (`playwright`, `groq`, `google-genai`)
4. Install Chromium + Tor (`sudo apt-get install tor`)
5. Start Tor and verify circuit
6. Run pipeline (`scheduler.py --mode daily|weekly`)
7. **Merge step (daily only):** If new fresh_finds has today's date and > 0 products, merge with existing `phase4_frontend/public/data/fresh_finds.json` — adds unique products from earlier runs, accumulating throughout the day
8. **Guard:** Only copy `fresh_finds.json` if `total_products > 0` — prevents overwriting good data with empty results when Tor fails
9. Commit + push updated data files
10. Vercel auto-deploys on push

**Tor reliability:** ~50% per attempt. With 3 daily attempts, probability of all failing = ~12.5%. Guard ensures the last successful scrape is never overwritten.

**Environment variables (GitHub Secrets):**
| Variable | Used by |
|----------|---------|
| `GROQ_API_KEY` | Daily quick analyzer (Groq API) |
| `GITHUB_TOKEN` | Auto-provided — for committing data back to repo |

---

## Current Folder Structure

```
Weekly-Product-Discovery-Dashboard/
├── ARCHITECTURE.md
├── setup_oracle_vm.sh           ← Ubuntu ARM VM setup script (unused — Oracle needs credit card)
│
├── phase1_scraping/
│   ├── config.py                ← CATEGORY_URLS, TARGET_COUNTS, MAX_LISTING_PAGES=4
│   ├── scraper.py               ← Weekly async scraper with listing page pagination
│   ├── run_scraper.py           ← Weekly entry point
│   ├── run_light_scrape.py      ← Daily light scraper + quick Groq analysis
│   └── output/
│       └── scraped_YYYY-MM-DD.json
│
├── phase2_analysis/
│   ├── analyzer.py              ← Gemini deep analysis (weekly)
│   ├── quick_analyzer.py        ← Groq quick analysis (daily)
│   ├── run_analysis.py
│   ├── .env                     ← GROQ_API_KEY (gitignored)
│   └── output/
│       └── analyzed_YYYY-MM-DD.json
│
├── phase3_final_output/
│   ├── prepare_final.py
│   └── run_prepare.py
│
├── output/
│   ├── products.json            ← Weekly: consumed by frontend
│   └── fresh_finds.json         ← Daily: consumed by frontend
│
├── phase4_frontend/
│   ├── public/data/
│   │   ├── products.json        ← Copied here by GitHub Actions (weekly)
│   │   └── fresh_finds.json     ← Copied here by GitHub Actions (daily, accumulated)
│   └── src/
│       ├── app/page.tsx         ← lastUpdated = max(products.json, fresh_finds.json)
│       ├── components/
│       └── lib/
│
├── phase5_automation/
│   └── scheduler.py             ← Runs daily or weekly pipeline
│
└── .github/workflows/
    └── weekly_scrape.yml        ← 3× daily + 1× weekly cron, Tor proxy, merge + guard logic
```

---

## Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Scraping (weekly + daily) | ✅ Complete |
| 2 | AI Analysis (Gemini + Groq) | ✅ Complete |
| 3 | Final Output | ✅ Complete |
| 4 | Frontend (Next.js + Vercel) | ✅ Live |
| 5 | Automation (GitHub Actions) | ✅ Running |
