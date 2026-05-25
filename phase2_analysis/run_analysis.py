"""
Entry point for Phase 2.

Reads the latest Phase 1 scraped JSON, runs Claude analysis on every product,
and saves the enriched + ranked output.

Usage:
    python run_analysis.py
    python run_analysis.py --input path/to/scraped_2025-01-11.json
"""

import argparse
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from analyzer import run_analysis

logger = logging.getLogger(__name__)


def find_latest_scraped_file() -> Path:
    """Return the most recently created file in phase1_scraping/output/."""
    output_dir = Path(__file__).parent.parent / "phase1_scraping" / "output"
    if not output_dir.exists():
        raise FileNotFoundError(
            f"Phase 1 output directory not found: {output_dir}\n"
            "Run phase1_scraping/run_scraper.py first."
        )
    files = sorted(output_dir.glob("scraped_*.json"), reverse=True)
    if not files:
        raise FileNotFoundError(
            f"No scraped_*.json files found in {output_dir}\n"
            "Run phase1_scraping/run_scraper.py first."
        )
    return files[0]


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="Phase 2: Claude review analyzer")
    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help="Path to a specific scraped JSON file (defaults to latest in phase1_scraping/output/)",
    )
    args = parser.parse_args()

    # Resolve input file
    if args.input:
        input_path = Path(args.input)
    else:
        input_path = find_latest_scraped_file()

    logger.info(f"=== Phase 2: AI Analysis starting ===")
    logger.info(f"Input file: {input_path}")

    with open(input_path, encoding="utf-8") as f:
        scraped_data = json.load(f)

    products = scraped_data.get("products", [])
    run_date = scraped_data.get("run_date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))

    if not products:
        logger.warning("No products found in input file. Exiting.")
        return

    logger.info(f"Loaded {len(products)} products from {input_path.name}")

    start = datetime.now(timezone.utc)
    top_products = run_analysis(products)
    end = datetime.now(timezone.utc)

    duration_mins = round((end - start).total_seconds() / 60, 1)

    # Build output payload
    payload = {
        "run_date": run_date,
        "analyzed_at": end.isoformat(),
        "duration_minutes": duration_mins,
        "input_products": len(products),
        "output_products": len(top_products),
        "products": top_products,
    }

    # Save to output/
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / f"analyzed_{run_date}.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    logger.info(f"=== Done in {duration_mins} min. Saved to: {output_path} ===")
    logger.info(f"    Products analyzed: {len(top_products)}")

    # Print quick summary table
    print("\n-- Top 10 Products by Quality Score --")
    for i, p in enumerate(top_products[:10], 1):
        rec = p.get("analysis", {}).get("recommendation", "?")
        score = p.get("analysis", {}).get("quality_score", 0)
        name = p.get("name", "")[:45]
        print(f"  {i:2}. [{rec:4}] score={score:5.1f}  {name}")


if __name__ == "__main__":
    main()
