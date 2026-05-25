"""
Prompt templates for Claude review analysis.
Keeping prompts in a separate file makes them easy to tune without touching analyzer logic.
"""

SYSTEM_PROMPT = """You are a product review analyst. You read customer reviews and extract clear, \
actionable insights in structured JSON format. Be concise and objective. \
Base everything strictly on what the reviews actually say — do not invent or assume."""


def build_analysis_prompt(product_name: str, price: int, category: str, reviews: list[str]) -> str:
    """
    Build the user-turn prompt for a single product's review analysis.
    Returns a string ready to send to Claude.
    """
    reviews_block = "\n".join(f"- {r}" for r in reviews)
    price_str = f"₹{price:,}" if price else "Price unknown"

    return f"""Analyze these customer reviews for the following product and return a JSON object.

Product: {product_name}
Price: {price_str}
Category: {category}

Customer Reviews:
{reviews_block}

Return ONLY valid JSON with exactly this structure (no markdown, no explanation):
{{
  "pros": [
    "First most-mentioned positive (one clear sentence)",
    "Second most-mentioned positive (one clear sentence)",
    "Third most-mentioned positive (one clear sentence)"
  ],
  "cons": [
    "First most-mentioned negative (one clear sentence)",
    "Second most-mentioned negative (one clear sentence)",
    "Third most-mentioned negative (one clear sentence)"
  ],
  "top_quote": "The single most helpful or representative review, copied verbatim from the list above",
  "sentiment_score": <integer 0-100 representing % of reviews that are positive>,
  "recommendation": "<Buy|Wait|Skip>",
  "recommendation_reason": "One sentence explaining the recommendation"
}}

Recommendation rules:
- Buy: sentiment >= 70 AND the positives clearly outweigh negatives for the price
- Wait: sentiment 50-69 OR mixed signals OR early product that needs iteration
- Skip: sentiment < 50 OR consistent quality/defect complaints OR not worth the price"""
