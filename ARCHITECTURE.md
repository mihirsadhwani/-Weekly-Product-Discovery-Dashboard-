# Weekly Product Discovery Dashboard — Architecture & Product Case Study

## 1. Product Vision & Business Problem (PM Framing)

### Problem Statement
Indian e-commerce shoppers and category analysts face two structural friction points on major marketplaces like Flipkart:
1. **Inflated MRP & Dark-Pattern Discounts:** Products frequently display artificial "80–90% OFF" badges created by inflating MRP or concatenating DOM strings (e.g., a ₹332 fitness accessory showing a ₹1,80,081 MRP), making raw discount percentages unreliable as a buying signal.
2. **Review Overload & Launch Blind Spots:** Shoppers must manually read dozens of mixed reviews to spot recurring product defects, while newly launched products ("Fresh Finds") suffer from cold-start discovery bias.

### Target Personas & Jobs-to-be-Done (JTBD)
| Persona | Core Pain Point | Job-to-be-Done (JTBD) | Dashboard Solution |
|---------|----------------|-----------------------|--------------------|
| **Value-Conscious Shopper** | Distrusts "80% OFF" banners and lacks time to read 50+ reviews per item | *"Help me quickly verify whether a discounted product is genuinely worth buying vs. category peers."* | **VFM Badge (`is_vfm`)**, **AI Quick Verdict**, **2-Week Price-Drop Prediction**, and **Live 1v1 AI Compare** |
| **D2C Brand / Category Analyst** | Manual spreadsheet tracking of competitor launch prices, discount depth, and sentiment drops | *"Show me week-over-week category price movements, emerging feature keywords, and quality drops across 8 verticals."* | **`/overview` Category Benchmarks**, **`/trends` Week-over-Week Delta**, and **MongoDB Longitudinal Price History** |

### North Star & Product Funnel Metrics
- **North Star Metric:** **Verified Deal Discovery Rate** — % of sessions where a user inspects an AI-scored VFM deal (`is_vfm = true`) or runs a head-to-head AI comparison before clicking through to Flipkart.
- **Pipeline Data Quality KPI:** **Anomaly Quarantine & Repair Rate** — % of raw scraped listings where inflated/glued MRPs, EMI installment prices, or trade-in ("Exchange up to ₹X") values are automatically stripped or repaired before publication (**85 of 87 weekly listings sanitized** in the latest dataset).
- **Unit Cost KPI:** **AI Cost per 1,000 Products Scored** — Kept near **$0.00** via 10-product prompt batching (`gemini-3.5-flash-lite`) and cross-run URL caching.

---

## 2. System Architecture (Vercel + GitHub Actions + MongoDB Atlas)

```
GitHub Actions (Ubuntu runner + Tor SOCKS5 + Headless Playwright)
  .github/workflows/weekly_scrape.yml
        │  python phase5_automation/scheduler.py --mode daily|weekly
        ▼
  Phase 1–3 Pipeline (Scrape ──► MRP Sanitizer ──► Batched Gemini AI ──► BA Metrics & Trends)
        │
        ├──► 1. Static JSON Store: output/*.json ──► phase4_frontend/public/data/*.json
        │         └──► git commit + push to main
        │                ├──► Vercel auto-deploys bundled snapshot
        │                └──► raw.githubusercontent.com (1h ISR cache, tag "data")
        │
        └──► 2. Time-Series & Audit DB: MongoDB Atlas (`product_discovery`, zlib compressed)
                  └──► phase5_automation/mongo_store.py
                         ├─ `products` & `fresh_finds` (indexed by flipkart_url, category, vfm_score)
                         ├─ `price_history` (weekly longitudinal price/discount snapshots)
                         └─ `pipeline_runs` (audit log of scrape yield, MRP repairs, AI cache hits)

 Browser ──► Vercel (Next.js 14 App Router)
              ├─ Pages read latest JSON via src/lib/products.ts (<50ms CDN cached)
              ├─ "Refresh data" button ──► Server Action (`refreshData`) ──► GitHub API
              │                             1. revalidateTag('data') purges CDN cache immediately
              │                             2. workflow_dispatch triggers live daily scrape (30m cooldown)
              └─ /api/compare          ──► Gemini API (`gemini-3.5-flash` live 1v1 buyer verdict)
```

### Why Scraping Runs on GitHub Actions Instead of Vercel
Flipkart blocks cloud datacenter IPs and requires a full headless Chromium browser plus rotating Tor circuits / ScraperAPI fallback. Vercel Serverless Functions have strict execution timeouts and cannot run Tor daemons, so compute-heavy extraction runs asynchronously on GitHub Actions while Vercel serves precomputed intelligence with sub-50ms latency.

---

## 3. Business Analyst Methodology & Scoring Formulas

All analytical enrichments live in [`phase3_final_output/enrich_metrics.py`](file:///D:/onepws/mihir/-Weekly-Product-Discovery-Dashboard-/phase3_final_output/enrich_metrics.py) and [`phase3_final_output/trend_analyzer.py`](file:///D:/onepws/mihir/-Weekly-Product-Discovery-Dashboard-/phase3_final_output/trend_analyzer.py).

### 3.1 Value-for-Money (`vfm_score` & `is_vfm`)
A raw discount badge does not equal value. Each product is benchmarked against its **category median price** ($\tilde{P}_c$) and **category mean quality** ($\bar{Q}_c$):

$$\text{Relative Price Advantage } (A_p) = \text{clamp}\left(\frac{\tilde{P}_c - P_i}{\tilde{P}_c} \times 50 + D_i \times 0.8,\; 0,\; 100\right)$$

$$\text{VFM Score} = 0.45 \cdot Q_i + 0.30 \cdot A_p + 0.25 \cdot (R_i \times 20)$$

Where $Q_i \in [0, 100]$ is the AI quality/sentiment score, $D_i$ is the verified discount percentage, and $R_i \in [1, 5]$ is the customer star rating.
A product receives the **`is_vfm = true`** badge only if it satisfies all four guardrails:
1. $Q_i \ge \max(72,\; \bar{Q}_c - 2)$
2. $\text{Sentiment Score} \ge 72$
3. $P_i \le 1.05 \times \bar{P}_c$ **or** $D_i \ge 35\%$
4. $\text{VFM Score} \ge 70.0$

### 3.2 Price-Drop Prediction Heuristic (`price_prediction`)
Implemented in [`compute_ba_metrics()`](file:///D:/onepws/mihir/-Weekly-Product-Discovery-Dashboard-/phase3_final_output/enrich_metrics.py#L105-L170), predicting whether a product is likely to drop in price over the next 2–3 weeks based on three micro-market signals:
- **Price-Band Saturation:** Counts competing SKUs in the same category priced within $\pm 22\%$ of $P_i$ ($+1$ point if $\ge 3$ rivals; $+2$ points if $\ge 5$ rivals).
- **Quality-Adjusted Overpricing:** Flags SKUs priced $>10\%$ above category average while scoring below category-average quality ($+1$ point).
- **Shallow Discount Headroom:** Flags SKUs priced above category median with $<25\%$ current discount ($+1$ point).
- Products scoring $\ge 3$ points are marked **High Confidence (`10–18%` expected drop in `2–3 weeks`)**; products scoring $2$ points are marked **Medium Confidence (`6–12%` drop)**.

### 3.3 Data Governance: MRP Glued-Digit & Dark-Pattern Sanitizer
Flipkart listing cards frequently concatenate DOM text nodes—for example, merging an MRP of `₹1,800` with an `81% off` badge into `180081`, or surfacing monthly EMI/Exchange values (`₹4,400/month`) as the product price.
Our two-stage sanitizer ([`_sane_original_price`](file:///D:/onepws/mihir/-Weekly-Product-Discovery-Dashboard-/phase1_scraping/run_deals_scrape.py) + [`sanitize_product_pricing`](file:///D:/onepws/mihir/-Weekly-Product-Discovery-Dashboard-/phase3_final_output/enrich_metrics.py#L22-L67)):
1. **Strips EMI & Trade-in Strings:** Removes `/month`, `EMI`, and `Up to ₹X` exchange bonuses before extracting minimum selling price.
2. **Un-glues Concatenated MRPs:** Detects when `str(original_price)` ends with `str(discount_percent)` and exceeds $1.35\times$ the implied MRP $\frac{P_i}{1 - D_i/100}$, restoring `180081` $\to$ `1800`.
3. **Cross-Checks Implied MRP:** Recomputes or nulls any MRP that deviates outside $[0.75\times, 1.35\times]$ of the badge-implied MRP.

---

## 4. Architecture Decision Records (ADRs) & Unit Economics

| Decision | Alternatives Considered | Why Chosen (PM / Engineering Tradeoff) |
|----------|------------------------|----------------------------------------|
| **ADR-01: Hybrid Git JSON + MongoDB Atlas Store** | Postgres-only on paid cloud vs. Git-only flat files | **Fast CDN Reads + Longitudinal History:** Next.js reads static JSON from GitHub/CDN with `<50ms` latency and zero DB cold-start on Vercel, while MongoDB Atlas (`zlib` network compression) stores longitudinal `price_history` and `pipeline_runs` on the free M0 tier. |
| **ADR-02: Batched Gemini Calls (`BATCH_SIZE=10`) + URL Cache** | 1 LLM request per product on every run | **~88% Token Cost Reduction:** System instructions are paid once per 10 products instead of per product, reviews are capped at `5 × 180 chars`, and [`load_cached_analyses()`](file:///D:/onepws/mihir/-Weekly-Product-Discovery-Dashboard-/phase2_analysis/quick_analyzer.py#L198-L212) reuses scores for unchanged product URLs across runs. |
| **ADR-03: Public Refresh Button with 30-Min Cooldown** | Unprotected webhook vs. admin-only login | **Frictionless Demo + Quota Protection:** Interviewers and users can click **Refresh data** without logging in; [`COOLDOWN_MS = 30 min`](file:///D:/onepws/mihir/-Weekly-Product-Discovery-Dashboard-/phase4_frontend/src/app/actions.ts) and active-run checks prevent API quota exhaustion. |
| **ADR-04: Category Reserve Pool (`deals_backup.json`)** | Allowing categories to show 0–3 items when Tor exit nodes fail | **10-Per-Category SLA:** Guaranteeing at least 10 products across all 8 categories ensures the dashboard never renders empty category tabs even during partial anti-bot blocks. |

---

## 5. Pipelines & Frontend Routes

### Two Data Pipelines
| Pipeline | Entry Point | Output Files | Categories Covered |
|----------|------------|--------------|--------------------|
| **Daily "Fresh Finds"** (new launches) | [`phase1_scraping/run_light_scrape.py`](file:///D:/onepws/mihir/-Weekly-Product-Discovery-Dashboard-/phase1_scraping/run_light_scrape.py) | `fresh_finds.json` (40 products) | Electronics · Fashion · Home_Kitchen · Beauty (`sort=recency_desc`) |
| **Weekly "Deals"** (discounted & VFM products) | [`phase1_scraping/run_deals_scrape.py`](file:///D:/onepws/mihir/-Weekly-Product-Discovery-Dashboard-/phase1_scraping/run_deals_scrape.py) | `products.json` (87 balanced), `deals_finds.json` (155 pool), `deals_backup.json`, `products_previous.json`, `trends.json` | Mobiles · Laptops · TVs · Men_Fashion · Women_Fashion · Home_Kitchen · Beauty · Sports |

### Frontend Intelligence Modules ([`phase4_frontend/`](file:///D:/onepws/mihir/-Weekly-Product-Discovery-Dashboard-/phase4_frontend) — Next.js 14, Tailwind, shadcn/ui, Recharts)
| Module | Route | Purpose | Data Source |
|--------|-------|---------|-------------|
| **01. Executive Overview** | `/overview` | Executive KPIs, Weekly Price Movement Snapshot, Management Decision Layer (*What · Why · What to do*), VFM Quadrant Matrix, Discount Bracket Distribution, and Management CSV Export | `products.json`, `deals_finds.json`, `fresh_finds.json` |
| **02. Fresh Finds** | `/` | Automated daily discovery of newly launched products across 4 verticals with early AI sentiment verdicts | `fresh_finds.json` |
| **03. Price Intelligence** | `/trends` | Observed week-over-week price reductions (*Pehle vs. Aaj*) separated from static MRP discount badges, first observed reduction date, category price/volume/sentiment shifts, and Price CSV Export | `trends.json`, `products.json` |
| **04. Category Intelligence** | `/categories` | Interactive category deep-dive (7 vertical KPIs, intra-category price distribution) and side-by-side Category Comparison Tool | `products.json`, `fresh_finds.json` |
| **05. Product & Sentiment** | `/deals` | Rating tier distribution (`4.5★+`, `4.0–4.4★`, `<4.0★`), LLM review sentiment split, recurring buyer pain-point summary by price segment, filterable catalog explorer, and live 1v1 AI Compare | `products.json` |
| **06. Market Opportunities** | `/opportunities` | Weighted Opportunity Scoring Model ($O = 0.25D + 0.25R + 0.25P + 0.25C$), Category Price-Band Gap Detector, and ranked candidate table with CSV Export | `products.json` |
| **07. Alerts & Actions** | `/alerts` | AI-Generated Weekly Management Summary, automated anomaly alerts (price drops, sentiment deterioration, new launches, category price shifts), and 3-part PM Decision Playbook | `products.json`, `fresh_finds.json`, `trends.json` |
| **08. Data & Scrape Health** | `/health` | Scraper run history, freshness SLA, MRP anomaly quarantine log (85 glued/inflated MRPs repaired), AI scoring coverage (100%), and defensible operational outcome metrics | All JSON stores + MongoDB audit log |
| **SKU Deep-Dive** | `/product/[id]` | 6-Week Historical Price Trajectory (*Pehle vs. Aaj*), AI 2–3 week price-drop forecast, Product vs. Category Benchmark chart, and 2 closest category peer comparisons | `products.json` |
| **Live AI Compare API** | `/api/compare` | Server route generating a 3-sentence buyer verdict via `gemini-3.5-flash` | Live Gemini API |

---

## 6. Environment Variables & MongoDB Setup

### Local (`phase2_analysis/.env` — gitignored)
```env
GEMINI_API_KEY=<your-gemini-api-key>
MONGODB_URI=mongodb+srv://sadhwanimihir518_db_user:<db_password>@cluster0.heywayl.mongodb.net/product_discovery?retryWrites=true&w=majority&compressors=zlib
```

### Testing & Syncing MongoDB Atlas
Run [`phase5_automation/mongo_store.py`](file:///D:/onepws/mihir/-Weekly-Product-Discovery-Dashboard-/phase5_automation/mongo_store.py) to verify connectivity, build indexes, and sync all JSON datasets into MongoDB Atlas:
```bash
python phase5_automation/mongo_store.py --test --sync
```

### Vercel & GitHub Actions Secrets
| Variable | Where Configured | Purpose |
|----------|------------------|---------|
| `GEMINI_API_KEY` | Vercel + GitHub Actions | Live `/api/compare` route and batched review analysis |
| `MONGODB_URI` | Local `.env` + GitHub Actions | MongoDB Atlas connection string (`zlib` compressed) for time-series history |
| `GITHUB_DISPATCH_TOKEN` | Vercel | Fine-grained token (`Actions: Read & Write`) powering the **Refresh data** button |
| `SCRAPERAPI_KEY` | GitHub Actions (optional) | Fallback proxy when direct + Tor circuits are blocked |

---

## 7. Folder Structure

```
├── ARCHITECTURE.md
├── .github/workflows/weekly_scrape.yml
├── phase1_scraping/
│   ├── config.py               ← Category URLs, delays, user-agents
│   ├── run_light_scrape.py     ← Daily Fresh Finds pipeline
│   └── run_deals_scrape.py     ← Weekly Deals pipeline + BA enrichment hook
├── phase2_analysis/
│   ├── quick_analyzer.py       ← Batched Gemini 3.5 Flash-Lite analyzer + URL cache
│   └── .env                    ← Local secrets (GEMINI_API_KEY, MONGODB_URI)
├── phase3_final_output/
│   ├── enrich_metrics.py       ← MRP sanitizer, VFM scorer, price predictor, peer comparisons
│   └── trend_analyzer.py       ← Week-over-week category trends, sentiment drops, feature keywords
├── phase4_frontend/            ← Next.js 14 dashboard deployed on Vercel
│   ├── public/data/            ← Enriched JSON datasets served to the app
│   └── src/ (app, components, lib, types)
└── phase5_automation/
    ├── scheduler.py            ← Pipeline orchestrator (--mode daily | weekly) + MongoDB sync
    └── mongo_store.py          ← MongoDB Atlas client, index manager, and longitudinal price logger
```

---

## 8. Current System Status (Verified 2 Nov 2026)

| Component | Status | Verification Details |
|-----------|--------|----------------------|
| **Vercel Frontend (`/`, `/deals`, `/overview`, `/trends`, `/product/[id]`)** | ✅ Working | Builds cleanly from `main`; all routes populated |
| **Live AI Product Compare (`/api/compare`)** | ✅ Working | Verified against `gemini-3.5-flash` (`200 OK`) |
| **Weekly Deals AI Analysis (`products.json`)** | ✅ **87 / 87 Scored (100%)** | Zero placeholder cards; all 87 products have AI scores, pros/cons, and recommendations |
| **Daily Fresh Finds AI Analysis (`fresh_finds.json`)** | ✅ **40 / 40 Scored (100%)** | All 40 newly launched products enriched via batched `gemini-3.5-flash-lite` |
| **BA Metrics (`vfm_score`, `is_vfm`, `price_prediction`, `comparisons`)** | ✅ **100% Populated** | **25 products** tagged as `is_vfm`; all 87 products have price-drop forecasts and 2 peer comparisons |
| **MRP Anomaly Sanitization** | ✅ **85 Anomalies Repaired** | Glued-digit MRPs (e.g., `₹1,80,081` $\to$ `₹1,800`) cleaned across all JSON datasets |
| **Week-over-Week Trends (`trends.json`)** | ✅ **`has_history: true`** | Historical baseline (`products_previous.json`) wired up; 8 categories, price deltas, and emerging feature keywords active |
| **MongoDB Atlas Integration (`mongo_store.py`)** | ⚠️ Ready for Password | SRV DNS (`cluster0.heywayl.mongodb.net`) and `pymongo` verified; replace `<db_password>` in `phase2_analysis/.env` and run `python phase5_automation/mongo_store.py` |
