import os
import json
import time
import logging
import re

logger = logging.getLogger(__name__)

_MENTION_RE = re.compile(r'\s*\(\d+\s*mentions?\)', re.IGNORECASE)


def _fmt_product(p):
    pros = '; '.join(_MENTION_RE.sub('', pro).strip() for pro in p['analysis'].get('pros', [])[:3])
    cons = '; '.join(_MENTION_RE.sub('', con).strip() for con in p['analysis'].get('cons', [])[:2])
    price_str = f"Rs.{p['price']}" if p.get('price') else 'price unknown'
    return f"  {p['name'][:60]} ({price_str})\n  Pros: {pros}\n  Cons: {cons}"


def _build_prompt(product_a, product_b):
    return (
        "Compare these two products. From Product A's perspective:\n\n"
        f"Product A:\n{_fmt_product(product_a)}\n\n"
        f"Product B:\n{_fmt_product(product_b)}\n\n"
        "Return ONLY valid JSON (no markdown):\n"
        '{"better_at": ["2 things A does better"], '
        '"weaker_at": ["2 things A is weaker at"], '
        '"verdict": "one sentence: which wins and why"}'
    )


def generate_comparisons(products, delay=2.5):
    """For each product find the 1–2 most similar and generate AI comparisons."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        logger.warning("No GROQ_API_KEY — skipping competitor comparisons")
        for p in products:
            p.setdefault('comparisons', [])
        return products

    from groq import Groq
    client = Groq(api_key=api_key)

    total_calls = 0

    for product in products:
        cat   = product.get('category')
        price = product.get('price') or 0

        if not price:
            product['comparisons'] = []
            continue

        # Find similar: same category, price within ±35%
        candidates = [
            p for p in products
            if p is not product
            and p.get('category') == cat
            and p.get('price')
            and abs(p['price'] - price) / price <= 0.35
        ]
        candidates.sort(key=lambda p: abs(p['price'] - price))
        rivals = candidates[:2]

        if not rivals:
            product['comparisons'] = []
            continue

        comparisons = []
        for rival in rivals:
            prompt = _build_prompt(product, rival)
            for attempt in range(1, 4):
                try:
                    resp = client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[{"role": "user", "content": prompt}],
                        response_format={"type": "json_object"},
                        temperature=0.3,
                    )
                    result = json.loads(resp.choices[0].message.content)
                    result['compared_to'] = {
                        'name':  rival['name'],
                        'price': rival.get('price'),
                    }
                    comparisons.append(result)
                    total_calls += 1
                    break
                except Exception as e:
                    err = str(e)
                    if "429" in err or "rate" in err.lower():
                        wait = 30 * attempt
                        logger.warning(f"Rate limit (attempt {attempt}/3) — waiting {wait}s...")
                        time.sleep(wait)
                    else:
                        logger.error(f"Comparison failed for '{product['name']}': {e}")
                        break

            time.sleep(delay)

        product['comparisons'] = comparisons
        logger.info(f"  {product['name'][:45]}: {len(comparisons)} comparisons")

    print(f"Comparisons done: {total_calls} API calls")
    return products
