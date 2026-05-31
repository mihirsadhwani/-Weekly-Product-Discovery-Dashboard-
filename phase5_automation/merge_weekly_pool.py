"""
Merges today's fresh_finds.json into the weekly product pool.

- Pool accumulates all week (Mon–Sun), deduped by Flipkart URL.
- Auto-resets every Monday so each week starts fresh.
- Generates output/products.json from the top pool products (sorted by quick_score).
- Pool file persists at phase4_frontend/public/data/weekly_pool.json so it
  survives across GitHub Actions runs (committed to git each day).
"""

import json
from pathlib import Path
from datetime import datetime, date, timedelta

ROOT = Path(__file__).parent.parent


def _week_start() -> str:
    today = date.today()
    return (today - timedelta(days=today.weekday())).isoformat()  # Monday


def _map_analysis(qa: dict | None) -> dict:
    """Map quick_analysis → analysis shape expected by the frontend Product type."""
    if not qa:
        return {
            "pros": [], "cons": [], "top_quote": "",
            "sentiment_score": 0, "quality_score": 0, "recommendation": "Wait",
        }
    score = qa.get("quick_score") or 0
    verdict = qa.get("quick_verdict") or ""
    rec = "Buy" if verdict == "Worth checking" else "Wait"
    top_con = qa.get("top_con")
    return {
        "pros": qa.get("top_pros") or [],
        "cons": [top_con] if top_con else [],
        "top_quote": "",
        "sentiment_score": score,
        "quality_score": score,
        "recommendation": rec,
    }


def merge_weekly_pool() -> None:
    pool_path = ROOT / "phase4_frontend" / "public" / "data" / "weekly_pool.json"
    fresh_path = ROOT / "output" / "fresh_finds.json"
    out_path   = ROOT / "output" / "products.json"

    # Load today's scrape
    with open(fresh_path, encoding="utf-8") as f:
        fresh = json.load(f)
    new_products = fresh.get("products", [])

    # Load or init pool; reset if a new week has started
    week_start = _week_start()
    pool: dict = {"week_start": week_start, "products": []}
    if pool_path.exists():
        with open(pool_path, encoding="utf-8") as f:
            pool = json.load(f)
        if pool.get("week_start") != week_start:
            print(f"New week ({week_start}) — resetting pool")
            pool = {"week_start": week_start, "products": []}

    # Merge — deduplicate by Flipkart URL
    existing_urls: set[str] = {
        p["flipkart_url"] for p in pool["products"] if p.get("flipkart_url")
    }
    added = 0
    for p in new_products:
        url = p.get("flipkart_url")
        if url and url not in existing_urls:
            pool["products"].append(p)
            existing_urls.add(url)
            added += 1

    pool["last_updated"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    pool["total_products"] = len(pool["products"])
    print(f"Pool: +{added} new → {len(pool['products'])} total (week of {week_start})")

    # Persist pool so next run can pick it up
    pool_path.parent.mkdir(parents=True, exist_ok=True)
    with open(pool_path, "w", encoding="utf-8") as f:
        json.dump(pool, f, indent=2, ensure_ascii=False)

    # Build products.json: top 60 by quick_score, analysis fields mapped for frontend
    all_prods = pool["products"]
    sorted_prods = sorted(
        all_prods,
        key=lambda p: (p.get("quick_analysis") or {}).get("quick_score") or 0,
        reverse=True,
    )
    top = sorted_prods[:60]

    for p in top:
        if not p.get("analysis"):
            p["analysis"] = _map_analysis(p.get("quick_analysis"))
        p.setdefault("sub_category", p.get("category"))
        p.setdefault("rating", None)
        p.setdefault("review_count", None)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    products_out = {
        "last_updated": datetime.utcnow().isoformat(),
        "week_start": week_start,
        "total_products": len(top),
        "products": top,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(products_out, f, indent=2, ensure_ascii=False)

    print(f"Generated output/products.json: {len(top)} products")


if __name__ == "__main__":
    merge_weekly_pool()
