"""
Scheduler - orchestrates the full pipeline or daily light scrape.

Usage:
    python scheduler.py --mode daily    # morning light scrape (fresh_finds.json)
    python scheduler.py --mode weekly   # full pipeline (products.json)
"""

import argparse
import subprocess
import sys
from datetime import datetime


def run_phase(phase_name: str, command: str) -> None:
    print(f"\n{'='*60}")
    print(f">> {phase_name}")
    print(f"{'='*60}\n")

    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    print(result.stdout)

    if result.returncode != 0:
        print(f"[FAILED] {phase_name}:")
        print(result.stderr)
        sys.exit(1)

    print(f"[OK] {phase_name}\n")


def run_daily_light() -> None:
    print(f"\n[RUN] Daily Light Scrape - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    run_phase("Daily Scrape + Quick Analysis", "cd phase1_scraping && python run_light_scrape.py")

    # Attempt deals scraping on same Tor window — non-fatal if it fails
    print(f"\n{'='*60}")
    print(">> Weekly Deals Scrape (alongside daily)")
    print(f"{'='*60}\n")
    result = subprocess.run("cd phase1_scraping && python run_deals_scrape.py", shell=True)
    if result.returncode == 0:
        print("[OK] Deals data updated\n")
    else:
        print("[WARN] Deals scrape failed — keeping existing products.json\n")

    print("[OK] Output: output/fresh_finds.json\n")


def run_weekly_full() -> None:
    print(f"\n[RUN] Weekly Deals Pipeline - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    run_phase("Weekly Deals Scrape", "cd phase1_scraping && python run_deals_scrape.py")
    print("[OK] Output: output/products.json\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run daily or weekly product pipeline")
    parser.add_argument("--mode", choices=["daily", "weekly"], required=True)
    args = parser.parse_args()

    if args.mode == "daily":
        run_daily_light()
    else:
        run_weekly_full()
