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
