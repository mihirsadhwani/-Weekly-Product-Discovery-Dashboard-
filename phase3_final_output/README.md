# Phase 3 — Final Output

## Phase Goal

Read Phase 2's analyzed product data, sort it by quality score, keep the top 30 products, and save a clean `products.json` file that the Next.js frontend reads directly. No database needed.

---

## Business Logic (Plain English)

1. **Find the latest analyzed file** from `phase2_analysis/output/` (e.g. `analyzed_2025-01-11.json`).

2. **Sort all products** by their `quality_score` (highest first). This score was calculated by Gemini in Phase 2 — it blends sentiment, star rating, and review volume.

3. **Keep only the top 30** products. These are the ones that will appear on the dashboard.

4. **Save to `output/products.json`** — a single, clean JSON file with a timestamp. The Next.js frontend reads this file directly at build time or via an API route.

---

## Why No Database?

Using a flat JSON file keeps the setup simple and free:
- No Supabase account needed
- No SQL schema to manage
- `products.json` can be committed to the repo or served as a static file
- Next.js can read it at build time (`getStaticProps`) for instant page loads

When the weekly pipeline runs, it overwrites `products.json` with fresh data, and re-deploying the Next.js site picks up the new content automatically.

---

## Files in This Folder

| File | Purpose |
|------|---------|
| `README.md` | This file |
| `prepare_final.py` | Core logic: reads Phase 2 output, sorts, trims to top 30, saves JSON |
| `run_prepare.py` | Entry point: `python run_prepare.py` |

---

## How to Run

```bash
# Make sure Phase 2 has already run and output exists:
# phase2_analysis/output/analyzed_YYYY-MM-DD.json

python run_prepare.py

# Output saved to:
# output/products.json
```

---

## Output Format

```json
{
  "last_updated": "2025-01-11T18:15:00",
  "total_products": 30,
  "products": [
    {
      "name": "Samsung Galaxy M15 5G",
      "price": 12999,
      "category": "Electronics",
      "rating": 4.2,
      "review_count": 342,
      "image_url": "https://...",
      "flipkart_url": "https://www.flipkart.com/...",
      "analysis": {
        "pros": ["Great battery (18 mentions)", "..."],
        "cons": ["Weak camera (9 mentions)", "..."],
        "top_quote": "Best phone under 15k...",
        "sentiment_score": 78,
        "recommendation": "Buy",
        "quality_score": 84.5
      }
    }
  ]
}
```
