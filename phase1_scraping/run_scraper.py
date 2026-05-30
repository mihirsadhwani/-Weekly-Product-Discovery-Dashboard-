"""
Entry point for Phase 1.

Usage:
    python run_scraper.py

Output:
    phase1_scraping/output/scraped_YYYY-MM-DD.json
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone

from scraper import run_scraper

logger = logging.getLogger(__name__)


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    logger.info("=== Phase 1: Flipkart Scraper starting ===")
    start = datetime.now(timezone.utc)

    # Run the async scraper
    products = asyncio.run(run_scraper())

    end = datetime.now(timezone.utc)
    duration_mins = round((end - start).total_seconds() / 60, 1)

    if not products:
        logger.error("No products were collected — Tor likely failed. Exiting with error so existing products.json is preserved.")
        sys.exit(1)

    # Build output payload
    run_date = start.strftime("%Y-%m-%d")
    payload = {
        "run_date": run_date,
        "started_at": start.isoformat(),
        "finished_at": end.isoformat(),
        "duration_minutes": duration_mins,
        "total_products": len(products),
        "products": products,
    }

    # Save to output/
    output_dir = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"scraped_{run_date}.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    logger.info(f"=== Done in {duration_mins} min. Saved to: {output_path} ===")
    logger.info(f"    Products collected: {len(products)}")
    total_reviews = sum(len(p["reviews"]) for p in products)
    logger.info(f"    Total reviews scraped: {total_reviews}")


if __name__ == "__main__":
    main()
