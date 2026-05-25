import os
import json
import logging
import time
from pathlib import Path

logger = logging.getLogger(__name__)

# Load .env if present
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def _build_prompt(product_name: str, reviews_text: str) -> str:
    return f"""Analyze these customer reviews for "{product_name}" and return structured insights.

Return ONLY valid JSON, no markdown, no extra text:
{{
  "pros": ["Pro 1 (X mentions)", "Pro 2 (Y mentions)", "Pro 3 (Z mentions)"],
  "cons": ["Con 1 (X mentions)", "Con 2 (Y mentions)", "Con 3 (Z mentions)"],
  "top_quote": "The single most helpful or representative review quote",
  "sentiment_score": 85,
  "recommendation": "Buy",
  "quality_score": 88.5
}}

Rules:
- pros/cons: top 3 each, with mention count in parentheses
- sentiment_score: 0-100, percentage of positive sentiment. NEVER return 0 — minimum is 35 even for poor products
- recommendation: "Buy" if sentiment >= 70, "Skip" if < 50, otherwise "Wait"
- quality_score: 0-100 composite score (sentiment 60% + quality signals 25% + value 15%). NEVER return 0 — minimum is 30 even for poor products. If reviews are sparse or unclear, estimate conservatively but still provide a real score
- All scores must be integers

Reviews:
{reviews_text}"""


def _parse_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```json"):
        text = text.split("```json")[1].split("```")[0].strip()
    elif text.startswith("```"):
        text = text.split("```")[1].split("```")[0].strip()
    return json.loads(text)


def _fallback_result() -> dict:
    return {
        "pros": ["Analysis unavailable"],
        "cons": ["Analysis unavailable"],
        "top_quote": "Could not analyze reviews",
        "sentiment_score": 0,
        "recommendation": "Wait",
        "quality_score": 0.0,
    }


# ── Groq backend ──────────────────────────────────────────────────────────────

def _analyze_groq(product_name: str, reviews_text: str) -> dict:
    from groq import Groq
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    prompt = _build_prompt(product_name, reviews_text)

    for attempt in range(1, 4):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            result = json.loads(response.choices[0].message.content)
            # Enforce minimum scores — LLM sometimes returns 0 for sparse reviews
            if result.get('quality_score', 0) == 0 or result.get('sentiment_score', 0) == 0:
                rec = result.get('recommendation', 'Wait')
                floors = {'Buy': (65, 70), 'Skip': (28, 35), 'Wait': (45, 50)}
                q_floor, s_floor = floors.get(rec, (45, 50))
                result['quality_score']  = result.get('quality_score')  or q_floor
                result['sentiment_score'] = result.get('sentiment_score') or s_floor
            return result
        except Exception as e:
            err = str(e)
            if "429" in err or "rate" in err.lower():
                wait = 30 * attempt
                logger.warning(f"  Groq rate limit (attempt {attempt}/3) — waiting {wait}s...")
                time.sleep(wait)
            else:
                logger.error(f"Groq analysis failed for '{product_name}': {e}")
                break

    return _fallback_result()


# ── Gemini backend ────────────────────────────────────────────────────────────

def _analyze_gemini(product_name: str, reviews_text: str) -> dict:
    from google import genai
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    prompt = _build_prompt(product_name, reviews_text)

    for attempt in range(1, 4):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=prompt,
            )
            return _parse_response(response.text)
        except Exception as e:
            err = str(e)
            if "429" in err or "503" in err:
                wait = 60 * attempt
                logger.warning(f"  Gemini rate limit (attempt {attempt}/3) — waiting {wait}s...")
                time.sleep(wait)
            else:
                logger.error(f"Gemini analysis failed for '{product_name}': {e}")
                break

    return _fallback_result()


# ── Public API ────────────────────────────────────────────────────────────────

def analyze_reviews(product_name: str, reviews: list[str]) -> dict:
    """Send reviews to the configured LLM and return structured analysis."""
    reviews_text = "\n".join(reviews[:50])

    if os.environ.get("GROQ_API_KEY"):
        return _analyze_groq(product_name, reviews_text)
    elif os.environ.get("GEMINI_API_KEY"):
        return _analyze_gemini(product_name, reviews_text)
    else:
        logger.error("No API key found. Set GROQ_API_KEY or GEMINI_API_KEY in .env")
        return _fallback_result()


def run_analysis(products: list[dict]) -> list[dict]:
    """
    Analyze all products. Adds an 'analysis' key to each product dict.
    Returns the enriched list sorted by quality_score descending.
    """
    backend = "Groq" if os.environ.get("GROQ_API_KEY") else "Gemini"
    logger.info(f"Using backend: {backend}")

    # Groq free tier: 30 RPM — 2s between requests is safe
    # Gemini free tier: 20 RPD — 6s between, 30s pause every 9
    use_groq = bool(os.environ.get("GROQ_API_KEY"))
    inter_request_delay = 2 if use_groq else 6

    analyzed = []

    for i, product in enumerate(products, 1):
        name = product.get("name", "Unknown Product")
        reviews = product.get("reviews", [])

        logger.info(f"  [{i}/{len(products)}] Analyzing: {name[:55]}")

        if not reviews:
            logger.warning(f"    No reviews — skipping.")
            continue

        analysis = analyze_reviews(name, reviews)
        enriched = {k: v for k, v in product.items() if k != "reviews"}
        enriched["analysis"] = analysis
        analyzed.append(enriched)

        if not use_groq and i % 9 == 0:
            logger.info("  Gemini rate-limit pause (30s)...")
            time.sleep(30)
        else:
            time.sleep(inter_request_delay)

    analyzed.sort(key=lambda p: p.get("analysis", {}).get("quality_score", 0), reverse=True)
    logger.info(f"Analysis complete. {len(analyzed)} products enriched.")
    return analyzed
