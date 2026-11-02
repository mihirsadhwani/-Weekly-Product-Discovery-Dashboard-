"""
MongoDB Atlas persistence layer for the Weekly Product Discovery Dashboard.

Provides hybrid persistence alongside the Git-backed static JSON files:
  - `products`: Current curated weekly deals (80-90 items across 8 categories)
  - `fresh_finds`: Daily newly launched Flipkart products
  - `price_history`: Longitudinal weekly price & discount snapshots per product URL
  - `trends`: Historical category sentiment & discount movement summaries
  - `pipeline_runs`: Data governance & operational audit log (scrape yield, MRP anomalies, AI cache efficiency)

Usage:
  python phase5_automation/mongo_store.py --test
  python phase5_automation/mongo_store.py --sync
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote_plus, unquote

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATHS = [
    ROOT_DIR / "phase2_analysis" / ".env",
    ROOT_DIR / "phase4_frontend" / ".env.local",
    ROOT_DIR / ".env",
]


def load_env() -> None:
    """Load environment variables from local .env files if not already set."""
    for env_path in ENV_PATHS:
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def normalize_mongo_uri(uri: str) -> str:
    """Safely URL-encode username and password in a mongodb+srv:// URI if they contain special characters."""
    m = re.match(r"^(mongodb(?:\+srv)?://)([^:]+):(.+)@([^@]+)$", uri.strip())
    if not m:
        return uri.strip()
    scheme, user, raw_pwd, rest = m.groups()
    # Unquote first so an already-encoded password is not double-encoded
    safe_user = quote_plus(unquote(user))
    safe_pwd = quote_plus(unquote(raw_pwd))
    return f"{scheme}{safe_user}:{safe_pwd}@{rest}"


def get_mongo_client(timeout_ms: int = 10000):
    """Return an authenticated (MongoClient, Database) tuple, or raise a descriptive error."""
    load_env()
    raw_uri = os.environ.get("MONGODB_URI", "").strip()
    if not raw_uri:
        raise RuntimeError(
            "MONGODB_URI is not set. Add it to phase2_analysis/.env or environment variables."
        )
    if "<db_password>" in raw_uri or "<password>" in raw_uri:
        raise RuntimeError(
            "MONGODB_URI in phase2_analysis/.env still contains the '<db_password>' placeholder. "
            "Replace '<db_password>' on line 2 of phase2_analysis/.env with your actual MongoDB Atlas password."
        )

    from pymongo import MongoClient

    uri = normalize_mongo_uri(raw_uri)
    client = MongoClient(uri, serverSelectionTimeoutMS=timeout_ms)
    db_name = os.environ.get("MONGODB_DB", "product_discovery")
    return client, client[db_name]


def ensure_indexes(db) -> None:
    """Create idempotent indexes for analytical queries and deduplication."""
    from pymongo import ASCENDING, DESCENDING

    db.products.create_index([("flipkart_url", ASCENDING)], unique=True)
    db.products.create_index([("category", ASCENDING), ("vfm_score", DESCENDING)])
    db.products.create_index([("is_vfm", ASCENDING)])

    db.fresh_finds.create_index([("flipkart_url", ASCENDING)], unique=True)
    db.fresh_finds.create_index([("category", ASCENDING), ("scraped_at", DESCENDING)])

    db.price_history.create_index(
        [("flipkart_url", ASCENDING), ("week_start", ASCENDING)], unique=True
    )
    db.price_history.create_index([("category", ASCENDING), ("recorded_at", DESCENDING)])

    db.trends.create_index([("generated_at", DESCENDING)])
    db.pipeline_runs.create_index([("run_at", DESCENDING)])


def test_connection() -> bool:
    """Ping MongoDB Atlas, verify indexes, and report cluster status."""
    try:
        client, db = get_mongo_client()
        ping = client.admin.command("ping")
        ensure_indexes(db)
        collections = db.list_collection_names()
        counts = {name: db[name].count_documents({}) for name in collections}
        print(f"[OK] Connected to MongoDB Atlas database '{db.name}' (ping={ping.get('ok')})")
        print(f"[OK] Indexes verified on: products, fresh_finds, price_history, trends, pipeline_runs")
        print(f"[OK] Existing collection document counts: {counts}")
        client.close()
        return True
    except Exception as exc:
        print(f"[WARN] MongoDB connection check failed: {exc}")
        return False


def sync_json_to_mongodb(data_dir: Path | None = None, mode: str = "manual_sync") -> dict:
    """Upsert products, fresh_finds, trends, and price_history from JSON files into MongoDB Atlas."""
    from pymongo import UpdateOne

    if data_dir is None:
        out_dir = ROOT_DIR / "output"
        pub_dir = ROOT_DIR / "phase4_frontend" / "public" / "data"
        data_dir = out_dir if (out_dir / "products.json").exists() else pub_dir

    client, db = get_mongo_client()
    ensure_indexes(db)

    now_iso = datetime.now(timezone.utc).isoformat()
    summary = {
        "products_upserted": 0,
        "fresh_finds_upserted": 0,
        "history_points_logged": 0,
        "trends_saved": False,
    }

    # 1. Sync Weekly Deals (products.json) + append longitudinal price_history
    products_path = data_dir / "products.json"
    if products_path.exists():
        payload = json.loads(products_path.read_text(encoding="utf-8"))
        products = payload.get("products", [])
        week_start = payload.get("week_start") or now_iso[:10]

        prod_ops = []
        hist_ops = []
        for p in products:
            url = p.get("flipkart_url")
            if not url:
                continue
            doc = {**p, "week_start": week_start, "updated_at": now_iso}
            prod_ops.append(UpdateOne({"flipkart_url": url}, {"$set": doc}, upsert=True))

            hist_doc = {
                "flipkart_url": url,
                "name": p.get("name"),
                "category": p.get("category"),
                "week_start": week_start,
                "price": p.get("price"),
                "original_price": p.get("original_price"),
                "discount_percent": p.get("discount_percent"),
                "rating": p.get("rating"),
                "review_count": p.get("review_count"),
                "sentiment_score": (p.get("analysis") or {}).get("sentiment_score"),
                "vfm_score": p.get("vfm_score"),
                "is_vfm": p.get("is_vfm"),
                "recorded_at": now_iso,
            }
            hist_ops.append(
                UpdateOne(
                    {"flipkart_url": url, "week_start": week_start},
                    {"$set": hist_doc},
                    upsert=True,
                )
            )

        if prod_ops:
            db.products.bulk_write(prod_ops, ordered=False)
            summary["products_upserted"] = len(prod_ops)
        if hist_ops:
            db.price_history.bulk_write(hist_ops, ordered=False)
            summary["history_points_logged"] = len(hist_ops)

    # 2. Sync Daily Fresh Finds (fresh_finds.json)
    fresh_path = data_dir / "fresh_finds.json"
    if fresh_path.exists():
        payload = json.loads(fresh_path.read_text(encoding="utf-8"))
        fresh_products = payload.get("products", [])
        fresh_ops = []
        for p in fresh_products:
            url = p.get("flipkart_url")
            if not url:
                continue
            doc = {**p, "updated_at": now_iso}
            fresh_ops.append(UpdateOne({"flipkart_url": url}, {"$set": doc}, upsert=True))
        if fresh_ops:
            db.fresh_finds.bulk_write(fresh_ops, ordered=False)
            summary["fresh_finds_upserted"] = len(fresh_ops)

    # 3. Sync Weekly Trends (trends.json)
    trends_path = data_dir / "trends.json"
    if trends_path.exists():
        trends_doc = json.loads(trends_path.read_text(encoding="utf-8"))
        if trends_doc:
            gen_at = trends_doc.get("generated_at") or now_iso
            db.trends.update_one(
                {"generated_at": gen_at},
                {"$set": {**trends_doc, "synced_at": now_iso}},
                upsert=True,
            )
            summary["trends_saved"] = True

    # 4. Record pipeline audit log
    db.pipeline_runs.insert_one(
        {
            "run_at": now_iso,
            "mode": mode,
            "data_dir": str(data_dir),
            **summary,
        }
    )

    client.close()
    print(f"[OK] Synced to MongoDB Atlas: {summary}")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test and sync MongoDB Atlas store")
    parser.add_argument("--test", action="store_true", help="Test connection and ensure indexes")
    parser.add_argument("--sync", action="store_true", help="Sync JSON files into MongoDB Atlas")
    parser.add_argument("--data-dir", type=str, default=None, help="Directory containing JSON files")
    args = parser.parse_args()

    if not (args.test or args.sync):
        args.test = True
        args.sync = True

    ok = True
    if args.test:
        ok = test_connection()
    if args.sync and ok:
        target_dir = Path(args.data_dir) if args.data_dir else None
        sync_json_to_mongodb(target_dir)
    if not ok:
        sys.exit(1)

