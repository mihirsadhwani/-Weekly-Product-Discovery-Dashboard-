# Phase 2 — AI Analysis

## Phase Goal

Take the raw product + review data from Phase 1 and send it to Claude AI. Get back structured, human-readable insights for each product: what customers love, what they hate, a quality score, and a final Buy/Wait/Skip recommendation.

---

## Business Logic (Plain English)

1. **Read Phase 1's output file** (`phase1_scraping/output/scraped_YYYY-MM-DD.json`).

2. **For each product**, bundle all its customer reviews into a single prompt and send it to Claude API (using the Sonnet model — fast and cost-effective).

3. **Claude returns structured JSON** with:
   - **Top 3 Pros** — the positives mentioned most often across reviews
   - **Top 3 Cons** — the negatives mentioned most often across reviews
   - **Top Quote** — the single most helpful or representative review
   - **Sentiment Score** — what percentage of reviews are positive (0–100)
   - **Recommendation** — one of: `Buy`, `Wait`, or `Skip`

4. **Compute a Quality Score** (our own formula, not Claude's):
   ```
   quality_score = (sentiment_score × 0.4) + (rating × 10 × 0.4) + (log(review_count) × 5 × 0.2)
   ```
   This blends AI sentiment, actual star rating, and review volume into one number for ranking.

5. **Rank all products** by quality_score (highest first).

6. **Keep only the top 30** products — these are the ones that will show on the dashboard.

7. **Save the enriched output** as `phase2_analysis/output/analyzed_YYYY-MM-DD.json`.

---

## Recommendation Rules (given to Claude)

| Recommendation | When to use |
|----------------|-------------|
| **Buy** | Sentiment ≥ 70% AND rating ≥ 4.0 AND no critical safety/defect cons |
| **Wait** | Sentiment 50–69% OR rating 3.5–3.9 OR mixed signals in reviews |
| **Skip** | Sentiment < 50% OR rating < 3.5 OR consistent complaints about quality/defects |

---

## Files in This Folder

| File | Purpose |
|------|---------|
| `README.md` | This file |
| `prompts.py` | The Claude prompts used for review analysis |
| `analyzer.py` | Calls Claude API, parses the response, computes quality score |
| `run_analysis.py` | Entry point — just run `python run_analysis.py` |
| `requirements.txt` | Python packages needed (anthropic SDK) |
| `sample_analysis.json` | Example of what the enriched output looks like |

---

## How to Run

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...   # Mac/Linux
set ANTHROPIC_API_KEY=sk-ant-...      # Windows

# 3. Make sure Phase 1 output exists:
# phase1_scraping/output/scraped_YYYY-MM-DD.json

# 4. Run the analyzer
python run_analysis.py

# 5. Output saved to:
# phase2_analysis/output/analyzed_YYYY-MM-DD.json
```

---

## Cost Estimate

Each product sends ~2,000 tokens of reviews and receives ~300 tokens of analysis.

- Claude Sonnet: ~$0.003 per product
- 30 products per run = ~$0.09 per weekly run
- Monthly cost: ~$0.36

Well within free/low-cost usage for a personal project.

---

## Output Format (what gets added to each product)

```json
{
  "...all Phase 1 fields...",
  "analysis": {
    "pros": [
      "Exceptional battery life lasting 2 full days",
      "Smooth display with 90Hz refresh rate",
      "Fast 25W charging included in the box"
    ],
    "cons": [
      "Camera underperforms in low-light conditions",
      "Pre-installed bloatware cannot be removed",
      "No headphone jack"
    ],
    "top_quote": "Honestly the best phone under 15k. Battery easily lasts 2 days with moderate usage.",
    "sentiment_score": 78,
    "recommendation": "Buy",
    "quality_score": 84.5
  }
}
```
