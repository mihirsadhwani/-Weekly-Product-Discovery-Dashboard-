# Weekly Product Discovery Dashboard — Master Architecture

## What This Project Does

An automated pipeline that scrapes Flipkart's newly launched products every week, analyzes customer reviews with Google Gemini AI, and displays the results in a clean, filterable web dashboard — no database required.

---

## End-to-End System Flow

```
[Every Saturday 11pm IST]
         │
         ▼
┌─────────────────────┐
│  Phase 1: Scraper   │  Playwright visits Flipkart
│  (Python)           │  Collects 50–60 new products
│                     │  + 20–50 reviews per product
└────────┬────────────┘
         │  scraped_YYYY-MM-DD.json
         ▼
┌─────────────────────┐
│  Phase 2: Analyzer  │  Sends reviews to Gemini API
│  (Python)           │  Gets: pros, cons, score,
│                     │  recommendation, quote
└────────┬────────────┘
         │  analyzed_YYYY-MM-DD.json
         ▼
┌─────────────────────┐
│  Phase 3: Final     │  Sorts by quality score
│  Output (Python)    │  Keeps top 30 products
│                     │  Writes products.json
└────────┬────────────┘
         │  output/products.json
         ▼
┌─────────────────────┐
│  Phase 4: Frontend  │  Next.js reads products.json
│  (Next.js + Tailwind│  Product grid, filters,
│   + Vercel)         │  detail pages
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Phase 5: Automation│  GitHub Actions cron job
│  (GitHub Actions)   │  Triggers Phase 1→2→3
│                     │  every Saturday 11pm IST
└─────────────────────┘
```

---

## Phase Details

---

### Phase 1 — Scraping
**Folder:** `phase1_scraping/`
**Goal:** Collect raw product + review data from Flipkart and save it as JSON.

**What it builds:**
| File | Purpose |
|------|---------|
| `README.md` | Plain-English explanation of this phase |
| `config.py` | Category URLs (`CATEGORY_URLS`), target counts (`TARGET_COUNTS`), delay settings, user-agent pool |
| `scraper.py` | Core Playwright scraper: listing pages → product pages → reviews |
| `run_scraper.py` | Entry point: `python run_scraper.py` |
| `requirements.txt` | `playwright` |
| `output/scraped_YYYY-MM-DD.json` | Generated output — one file per run |

**Category targets (60 products total per run):**
| Category | URL | Target |
|----------|-----|--------|
| Electronics | flipkart.com/mobiles-accessories | 25 |
| Fashion | flipkart.com/clothing | 15 |
| Home_Kitchen | flipkart.com/home-kitchen | 10 |
| Beauty | flipkart.com/beauty-grooming | 10 |

**Business logic:**
- Visit Flipkart recency-sorted pages for each category
- Filter: skip products with fewer than 20 reviews
- Stop each category once its `TARGET_COUNTS` is reached
- Collect 20–50 review texts per qualifying product
- Responsible scraping: 2–5s random delays, rotated user-agents, 3 retries on failure

---

### Phase 2 — AI Analysis
**Folder:** `phase2_analysis/`
**Goal:** Send each product's reviews to Google Gemini API (free tier) and extract structured insights.

**What it builds:**
| File | Purpose |
|------|---------|
| `README.md` | Plain-English explanation of this phase |
| `analyzer.py` | Calls Gemini API (`gemini-1.5-flash`), parses JSON response |
| `prompts.py` | Prompt templates (reference — prompt is inline in analyzer.py) |
| `run_analysis.py` | Entry point: reads Phase 1 JSON, writes enriched JSON |
| `requirements.txt` | `google-generativeai` |
| `.env.example` | `GEMINI_API_KEY=your_key_here` |
| `output/analyzed_YYYY-MM-DD.json` | Generated output |

**Business logic:**
- For each product, send up to 50 reviews to `gemini-1.5-flash`
- Gemini returns: top 3 pros (with mention counts), top 3 cons, best quote, sentiment score (0–100), recommendation (Buy/Wait/Skip)
- Recommendation rules: Buy if ≥70% positive, Skip if <50%, Wait otherwise
- Compute `quality_score` = blend of sentiment + star rating + review volume
- Save enriched JSON (all Phase 1 fields + `analysis` block per product)

**Cost:** Free tier — Gemini 1.5 Flash has a generous free quota (60 requests/min)

**Output format (analysis block):**
```json
{
  "...all Phase 1 fields...",
  "analysis": {
    "pros": ["Great battery (18 mentions)", "Fast charging (12 mentions)", "Sharp display (9 mentions)"],
    "cons": ["Weak camera in low light (11 mentions)", "Bloatware (8 mentions)", "No headphone jack (6 mentions)"],
    "top_quote": "Honestly the best phone under 15k. Battery easily lasts 2 days.",
    "sentiment_score": 78,
    "recommendation": "Buy",
    "quality_score": 84.5
  }
}
```

---

### Phase 3 — Final Output
**Folder:** `phase3_final_output/`
**Goal:** Sort Phase 2's results by quality score, keep the top 30 products, and write a single `products.json` that the frontend reads directly. No database needed.

**What it builds:**
| File | Purpose |
|------|---------|
| `README.md` | Plain-English explanation of this phase |
| `prepare_final.py` | Reads latest analyzed JSON, sorts, trims to top 30, saves `products.json` |
| `run_prepare.py` | Entry point: `python run_prepare.py` |

**Output:** `output/products.json` — a single flat file consumed directly by Next.js

**Why no database?**
- Zero setup — no Supabase account or SQL schema needed
- The JSON file can be committed to the repo or served as a static asset
- Next.js reads it at build time for instant, zero-latency page loads
- Re-deploying Vercel after each weekly run picks up the fresh data automatically

---

### Phase 4 — Frontend
**Folder:** `phase4_frontend/`
**Goal:** Build the user-facing Next.js website that reads `output/products.json` and shows the weekly product digest.

**What it builds:**
```
phase4_frontend/
├── README.md
├── package.json
├── tailwind.config.js
├── next.config.js
└── src/
    ├── app/
    │   ├── page.tsx                  ← Homepage (product grid)
    │   └── product/[id]/page.tsx     ← Product detail page
    ├── components/
    │   ├── ProductCard.tsx           ← Card: image, name, price, badge
    │   ├── CategoryTabs.tsx          ← Electronics / Fashion / Home_Kitchen / Beauty
    │   ├── SortBar.tsx               ← Top Rated / Most Reviews / Price
    │   ├── PriceSlider.tsx           ← Min–Max price range filter
    │   ├── FreshnessBanner.tsx       ← "Last updated: 2 hours ago"
    │   ├── ProConList.tsx            ← Visual pros/cons with icons
    │   └── RecommendationBadge.tsx   ← Buy (green) / Wait (yellow) / Skip (red)
    └── lib/
        └── products.ts               ← Reads and parses products.json
```

**Pages:**
- **Homepage `/`** — product grid, category tabs, sort bar, price slider, freshness banner
- **Detail `/product/[id]`** — full analysis, pros/cons, top quote, recommendation badge, Flipkart link

**Design principles:**
- Mobile-first, responsive grid (1 col → 2 col → 3–4 col)
- Product Hunt–inspired card layout
- Tailwind CSS only — no extra component library

---

### Phase 5 — Automation & Deployment
**Folder:** `phase5_deploy/`
**Goal:** Wire all phases into a fully automated weekly pipeline deployed to the internet.

**What it builds:**
| File | Purpose |
|------|---------|
| `README.md` | Plain-English explanation |
| `scheduler.py` | Runs Phase 1 → 2 → 3 in sequence |
| `.github/workflows/weekly_scrape.yml` | GitHub Actions cron (Saturday 11pm IST = Sunday 05:30 UTC) |
| `vercel.json` | Vercel deployment config |
| `DEPLOYMENT.md` | Step-by-step go-live guide |

**Automation flow:**
```
GitHub Actions cron (Sat 11pm IST)
        │
        └─► python scheduler.py
                 ├─► phase1: run_scraper.py    → scraped_YYYY-MM-DD.json
                 ├─► phase2: run_analysis.py   → analyzed_YYYY-MM-DD.json
                 └─► phase3: run_prepare.py    → output/products.json

products.json committed → Vercel auto-redeploys → live site updated
```

**Environment variables needed:**
```
GEMINI_API_KEY=AIza...
```
That's it — no database credentials required.

---

## Complete Folder Structure (Final State)

```
Weekly-Product-Discovery-Dashboard/
├── ARCHITECTURE.md
│
├── phase1_scraping/
│   ├── README.md
│   ├── config.py            ← CATEGORY_URLS + TARGET_COUNTS
│   ├── scraper.py
│   ├── run_scraper.py
│   ├── requirements.txt
│   └── output/
│       └── scraped_YYYY-MM-DD.json
│
├── phase2_analysis/
│   ├── README.md
│   ├── analyzer.py          ← Gemini API (gemini-1.5-flash)
│   ├── prompts.py
│   ├── run_analysis.py
│   ├── requirements.txt     ← google-generativeai
│   ├── .env.example         ← GEMINI_API_KEY
│   └── output/
│       └── analyzed_YYYY-MM-DD.json
│
├── phase3_final_output/
│   ├── README.md
│   ├── prepare_final.py     ← sorts top 30, writes products.json
│   └── run_prepare.py
│
├── output/
│   └── products.json        ← consumed directly by Next.js frontend
│
├── phase4_frontend/
│   ├── README.md
│   ├── package.json
│   ├── tailwind.config.js
│   ├── next.config.js
│   └── src/
│       ├── app/
│       │   ├── page.tsx
│       │   └── product/[id]/page.tsx
│       ├── components/
│       │   ├── ProductCard.tsx
│       │   ├── CategoryTabs.tsx
│       │   ├── SortBar.tsx
│       │   ├── PriceSlider.tsx
│       │   ├── FreshnessBanner.tsx
│       │   ├── ProConList.tsx
│       │   └── RecommendationBadge.tsx
│       └── lib/
│           └── products.ts
│
└── phase5_deploy/
    ├── README.md
    ├── scheduler.py
    ├── vercel.json
    ├── DEPLOYMENT.md
    └── .github/
        └── workflows/
            └── weekly_scrape.yml
```

---

## Implementation Order

| # | Phase | Depends On | Deliverable |
|---|-------|-----------|-------------|
| 1 | Scraping | Nothing | `scraped_YYYY-MM-DD.json` |
| 2 | AI Analysis | Phase 1 JSON + `GEMINI_API_KEY` | `analyzed_YYYY-MM-DD.json` |
| 3 | Final Output | Phase 2 JSON | `output/products.json` |
| 4 | Frontend | `output/products.json` | Working website locally |
| 5 | Automation | All phases + GitHub + Vercel | Fully deployed, self-updating site |

---

## Status

| Phase | Name          | Status   |
|-------|---------------|----------|
| 1     | Scraping      | Complete |
| 2     | AI Analysis   | Complete |
| 3     | Final Output  | Complete |
| 4     | Frontend      | Pending  |
| 5     | Automation    | Pending  |
