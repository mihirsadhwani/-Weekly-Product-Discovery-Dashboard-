# Phase 1 — Scraping

## Phase Goal

Automatically visit Flipkart's website and collect information about newly launched products, along with customer reviews for each product. Save all of this raw data into JSON files so Phase 2 can analyze it.

---

## Business Logic (Plain English)

1. **Open a real browser** (using Playwright) so Flipkart's JavaScript-heavy pages load correctly — basic HTTP requests won't work here.

2. **Go to each category's "New Launches" page** on Flipkart:
   - Electronics → Mobiles, Laptops, Audio
   - Fashion → Men's, Women's, Footwear
   - Home → Furniture, Kitchen, Decor
   - Beauty → Skincare, Haircare, Makeup

3. **For each product found:**
   - Grab: name, price, rating, number of reviews, image, product URL, category
   - Only keep it if it has at least 20 reviews (less than that is not enough data to analyze)
   - Only keep it if it was launched within the last 7 days

4. **Visit each product's page** and scrape 20–50 customer reviews (the text content, not just star ratings).

5. **Be polite to Flipkart's servers:**
   - Wait 2–5 seconds randomly between each page visit
   - Rotate through different browser user-agent strings so we don't look like a bot
   - If a request fails, retry up to 3 times before skipping

6. **Save the output** as a JSON file named `scraped_YYYY-MM-DD.json` in the `output/` folder.

---

## Files in This Folder

| File | Purpose |
|------|---------|
| `config.py` | Settings: category URLs, delay ranges, user-agent list, filters |
| `scraper.py` | Main scraper — launches browser, visits pages, extracts data |
| `run_scraper.py` | Entry point — just run `python run_scraper.py` to start |
| `sample_output.json` | Example of what the output JSON looks like |
| `requirements.txt` | Python packages needed for this phase |

---

## How to Run

```bash
# 1. Install dependencies
pip install -r requirements.txt
playwright install chromium

# 2. Run the scraper
python run_scraper.py

# 3. Output saved to:
# phase1_scraping/output/scraped_YYYY-MM-DD.json
```

---

## Output Format

```json
{
  "run_date": "2025-01-11",
  "total_products": 24,
  "products": [
    {
      "name": "Samsung Galaxy M15 5G",
      "price": 12999,
      "category": "Electronics",
      "sub_category": "Mobiles",
      "rating": 4.2,
      "review_count": 342,
      "image_url": "https://...",
      "flipkart_url": "https://www.flipkart.com/...",
      "launch_date": "2025-01-08",
      "reviews": [
        "Great battery life, lasts 2 full days easily.",
        "Camera is decent for the price.",
        "Build quality feels a bit plasticky.",
        "..."
      ]
    }
  ]
}
```

---

## Important Notes

- Flipkart blocks scrapers aggressively — Playwright mimics a real browser to get around this
- The scraper runs in **headless mode** (no visible browser window) by default; change `HEADLESS = True` to `False` in `config.py` to watch it work
- If you get blocked, increase `DELAY_MIN` and `DELAY_MAX` in `config.py`
- The scraper will skip any product page that throws an error (logged to console) and continue with the rest
