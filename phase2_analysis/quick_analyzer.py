"""
Quick AI analysis for daily fresh finds.
Uses Groq with 5-10 reviews to produce a fast actionable summary.
"""

import json
import os
import time
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Load .env from this directory
_env = Path(__file__).parent / ".env"
if _env.exists():
    for line in _env.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def quick_analysis(product_name: str, reviews_sample: list[str]) -> dict:
    """Quick Groq analysis for fresh products with few reviews."""
    if not reviews_sample:
        return _fallback()

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY not set")
        return _fallback()

    reviews_text = "\n".join(f"- {r[:200]}" for r in reviews_sample[:10])
    prompt = f"""Quick product assessment for "{product_name}".
Based on these early reviews:
{reviews_text}

Return ONLY JSON:
{{
  "quick_score": 75,
  "top_pros": ["Pro 1", "Pro 2"],
  "top_con": "Main concern",
  "quick_verdict": "Worth checking"
}}

Rules:
- quick_score: 0-100 based on early sentiment
- top_pros: 2 best points (brief, 3-5 words each)
- top_con: 1 main concern (brief, 3-5 words)
- quick_verdict: Either "Worth checking" or "Wait for more data"
"""

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
    except ImportError:
        logger.error("groq package not installed")
        return _fallback()

    for attempt in range(1, 3):
        try:
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            return json.loads(resp.choices[0].message.content)
        except Exception as e:
            err = str(e)
            if "429" in err or "rate" in err.lower():
                wait = 30 * attempt
                logger.warning(f"Rate limit (attempt {attempt}/2) - waiting {wait}s")
                time.sleep(wait)
            else:
                logger.error(f"Quick analysis failed for '{product_name}': {e}")
                break

    return _fallback()


def _fallback() -> dict:
    return {
        "quick_score": 0,
        "top_pros": [],
        "top_con": None,
        "quick_verdict": "Wait for more data",
    }


# ── Low-cost batched analysis (Gemini) ────────────────────────────────────────
#
# Cost levers: one request per BATCH_SIZE products (the instructions are paid for once,
# not once per product), few short reviews per product, a tiny JSON answer, the
# cheapest model, and no call at all for products without enough review text.

BATCH_SIZE = 10
MAX_REVIEWS = 5
MAX_REVIEW_CHARS = 180
MIN_REVIEWS = 2
DEFAULT_MODEL = "gemini-3.5-flash-lite"


def _clean_item(item) -> dict:
    """Keep only the fields the dashboard uses, with safe types."""
    try:
        score = int(round(float(item.get("quick_score", 0))))
    except (TypeError, ValueError):
        score = 0
    pros = [str(p)[:40] for p in (item.get("top_pros") or [])[:2]]
    con = item.get("top_con")
    verdict = "Worth checking" if item.get("quick_verdict") == "Worth checking" else "Wait for more data"
    return {
        "quick_score": max(0, min(100, score)),
        "top_pros": pros,
        "top_con": str(con)[:40] if con else None,
        "quick_verdict": verdict,
    }


def _gemini_batch(batch: list[tuple[str, list[str]]]) -> list[dict] | None:
    """One Gemini call for several products. Returns None on any failure."""
    import requests

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None

    blocks = []
    for idx, (name, reviews) in enumerate(batch):
        lines = "\n".join(f"- {r[:MAX_REVIEW_CHARS]}" for r in reviews[:MAX_REVIEWS])
        blocks.append(f"[{idx}] {name[:80]}\n{lines}")

    prompt = (
        "Quick assessment of each product from its reviews. Return ONLY a JSON array with one "
        'object per product, in order: {"quick_score":0-100,"top_pros":[2 items, 3-5 words],'
        '"top_con":"3-5 words","quick_verdict":"Worth checking" or "Wait for more data"}\n\n'
        + "\n\n".join(blocks)
    )

    model = os.environ.get("GEMINI_MODEL") or DEFAULT_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
            "maxOutputTokens": 90 * len(batch) + 100,
        },
    }

    for attempt in range(1, 4):
        try:
            res = requests.post(url, json=body, headers={"x-goog-api-key": api_key}, timeout=60)
            if res.status_code in (429, 503):
                time.sleep(20 * attempt)
                continue
            res.raise_for_status()
            text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
            data = json.loads(text)
            if isinstance(data, list) and len(data) == len(batch):
                return [_clean_item(d) for d in data]
            logger.error("Gemini batch returned unexpected shape (%s items for %s)", len(data), len(batch))
            return None
        except Exception as e:
            logger.error("Gemini batch failed (attempt %s/3): %s", attempt, e)
            time.sleep(5 * attempt)
    return None


def quick_analysis_batch(items: list[tuple[str, list[str]]]) -> list[dict]:
    """Analyse many products with as few API calls as possible.

    `items` is [(product_name, reviews), ...]; the result has the same length and order.
    Products with fewer than MIN_REVIEWS reviews get the fallback and cost nothing.
    Falls back to the per-product Groq path only when no Gemini key is configured.
    """
    results: list[dict] = [_fallback() for _ in items]
    eligible = [i for i, (_, reviews) in enumerate(items) if len(reviews) >= MIN_REVIEWS]
    if not eligible:
        return results

    if not os.environ.get("GEMINI_API_KEY"):
        for i in eligible:
            results[i] = quick_analysis(*items[i])
        return results

    for start in range(0, len(eligible), BATCH_SIZE):
        chunk = eligible[start:start + BATCH_SIZE]
        out = _gemini_batch([items[i] for i in chunk])
        if out:
            for i, r in zip(chunk, out):
                results[i] = r
        time.sleep(1)
    return results


def load_cached_analyses(*paths) -> dict[str, dict]:
    """Map product URL -> earlier real analysis, so unchanged products are never paid for twice."""
    cache: dict[str, dict] = {}
    for path in paths:
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue
        products = data.get("products", data) if isinstance(data, dict) else data
        for p in products if isinstance(products, list) else []:
            qa = p.get("quick_analysis") or {}
            if p.get("flipkart_url") and (qa.get("quick_score") or 0) > 0:
                cache[p["flipkart_url"]] = qa
    return cache


def analyze_products(products: list[dict], cache: dict[str, dict]) -> tuple[list[dict], int, int]:
    """Attach quick analysis to each product (pops `_reviews`).

    Returns (analyses aligned with products, cache hits, products sent to the model).
    """
    results: list[dict | None] = [None] * len(products)
    pending: list[tuple[int, tuple[str, list[str]]]] = []
    hits = 0

    for i, p in enumerate(products):
        reviews = p.pop("_reviews", [])
        cached = cache.get(p.get("flipkart_url", ""))
        if cached:
            results[i] = cached
            hits += 1
        else:
            pending.append((i, (p["name"], reviews)))

    fresh = quick_analysis_batch([item for _, item in pending])
    for (i, _), qa in zip(pending, fresh):
        results[i] = qa
    sent = sum(1 for _, (_, reviews) in pending if len(reviews) >= MIN_REVIEWS)
    return results, hits, sent  # type: ignore[return-value]
