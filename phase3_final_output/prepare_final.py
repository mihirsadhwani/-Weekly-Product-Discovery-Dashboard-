import json
import os
import logging
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(message)s")


def _load_env():
    """Find and load .env (looks in phase2_analysis, then cwd)."""
    candidates = [
        Path(__file__).parent.parent / "phase2_analysis" / ".env",
        Path(__file__).parent / ".env",
        Path(".env"),
    ]
    for path in candidates:
        if path.exists():
            for line in path.read_text().splitlines():
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())
            return


# ── Category statistics ───────────────────────────────────────────────────────

def compute_category_stats(products):
    groups = {}
    for p in products:
        cat = p.get('category', 'Other')
        groups.setdefault(cat, []).append(p)

    stats = {}
    for cat, prods in groups.items():
        priced = [p for p in prods if p.get('price')]
        stats[cat] = {
            'avg_price':   sum(p['price'] for p in priced) / len(priced) if priced else 0,
            'avg_quality': sum(p['analysis'].get('quality_score', 0) for p in prods) / len(prods),
            'count':       len(prods),
        }
    return stats


# ── VFM tagging ───────────────────────────────────────────────────────────────

def calculate_vfm_tags(products, cat_stats):
    """Tag VFM: below-avg price + above-avg quality + sentiment >= 70."""
    for p in products:
        cat       = p.get('category', 'Other')
        stats     = cat_stats.get(cat, {'avg_price': 0, 'avg_quality': 0})
        price     = p.get('price') or 0
        quality   = p.get('analysis', {}).get('quality_score', 0)
        sentiment = p.get('analysis', {}).get('sentiment_score', 0)

        is_vfm = (
            price > 0
            and price   < stats['avg_price']
            and quality > stats['avg_quality']
            and sentiment >= 70
        )
        p['is_vfm']    = is_vfm
        p['vfm_score'] = round((quality / price) * 1000, 4) if (is_vfm and price > 0) else 0

    vfm_by_cat = {}
    for p in products:
        if p.get('is_vfm'):
            cat = p.get('category', 'Other')
            vfm_by_cat[cat] = vfm_by_cat.get(cat, 0) + 1

    print("VFM products by category:")
    for cat, count in vfm_by_cat.items():
        total = sum(1 for p in products if p.get('category') == cat)
        print(f"  {cat}: {count}/{total}")
    return products


# ── Price drop prediction ─────────────────────────────────────────────────────

def predict_price_drops(products, cat_stats):
    """Flag products likely to drop in price based on category dynamics."""
    for p in products:
        cat   = p.get('category', 'Other')
        price = p.get('price') or 0
        stats = cat_stats.get(cat, {})

        if not price or not stats.get('avg_price'):
            p['price_prediction'] = None
            continue

        quality     = p['analysis'].get('quality_score', 0)
        avg_quality = stats['avg_quality']
        avg_price   = stats['avg_price']

        # How many in same category fall within ±20% of this price?
        priced_in_cat = [q for q in products if q.get('category') == cat and q.get('price')]
        saturation    = sum(1 for q in priced_in_cat if abs(q['price'] - price) / price <= 0.20)

        # Overpriced = above avg price but below avg quality
        is_overpriced = price > avg_price * 1.1 and quality < avg_quality

        score = 0
        if saturation >= 4: score += 1
        if saturation >= 6: score += 1
        if is_overpriced:   score += 1

        if score >= 2:
            p['price_prediction'] = {
                'likely':             True,
                'confidence':         'high' if score >= 3 else 'medium',
                'estimated_drop_pct': '10-20%',
                'timeframe':          '2-3 weeks',
            }
        elif score == 1:
            p['price_prediction'] = {
                'likely':             True,
                'confidence':         'low',
                'estimated_drop_pct': '5-10%',
                'timeframe':          '3-4 weeks',
            }
        else:
            p['price_prediction'] = None

    flagged = sum(1 for p in products if p.get('price_prediction'))
    print(f"Price drop flags: {flagged}/{len(products)}")
    return products


# ── Score recalibration ───────────────────────────────────────────────────────

def recalibrate_zero_scores(products):
    """Fix products where the LLM returned 0 for both quality and sentiment."""
    rec_floors = {'Buy': (65, 70), 'Skip': (28, 35), 'Wait': (45, 50)}
    fixed = 0
    for p in products:
        analysis  = p.get('analysis', {})
        quality   = analysis.get('quality_score', 0)
        sentiment = analysis.get('sentiment_score', 0)
        if quality == 0 and sentiment == 0:
            rec = analysis.get('recommendation', 'Wait')
            q_floor, s_floor = rec_floors.get(rec, (45, 50))
            analysis['quality_score']   = q_floor
            analysis['sentiment_score'] = s_floor
            fixed += 1
    if fixed:
        print(f"Recalibrated {fixed} products with zero scores")
    return products


# ── Main ──────────────────────────────────────────────────────────────────────

def prepare_final_output():
    """Read Phase 2 output and create final products.json for frontend."""

    phase2_output = "phase2_analysis/output/"
    files = [f for f in os.listdir(phase2_output) if f.startswith("analyzed_")]
    latest_file = sorted(files)[-1]

    with open(f"{phase2_output}{latest_file}", 'r', encoding='utf-8') as f:
        data = json.load(f)

    products = data.get('products', [])

    # Fix zero scores before sorting so rankings are correct
    products = recalibrate_zero_scores(products)

    # Remove products with no price AND low quality (genuinely useless entries)
    before = len(products)
    products = [
        p for p in products
        if not (p.get('price') is None and p.get('analysis', {}).get('quality_score', 0) < 50)
    ]
    if len(products) < before:
        print(f"Filtered {before - len(products)} no-price low-quality products")

    # Sort by quality_score, keep top 30
    products_sorted = sorted(
        products,
        key=lambda x: x.get('analysis', {}).get('quality_score', 0),
        reverse=True,
    )
    top_products = products_sorted[:30]

    # Remove products without a valid price
    before_price = len(top_products)
    top_products = [p for p in top_products if p.get('price') and p['price'] > 0]
    if len(top_products) < before_price:
        print(f"Filtered {before_price - len(top_products)} products without valid prices")

    # Compute category stats (reused by VFM + price prediction)
    cat_stats = compute_category_stats(top_products)

    top_products = calculate_vfm_tags(top_products, cat_stats)
    top_products = predict_price_drops(top_products, cat_stats)

    # Generate competitor comparisons (Groq API)
    _load_env()
    from comparison_generator import generate_comparisons
    print("Generating competitor comparisons (this takes ~2-3 min)...")
    top_products = generate_comparisons(top_products)

    final_output = {
        "last_updated":   datetime.now().isoformat(),
        "total_products": len(top_products),
        "products":       top_products,
    }

    os.makedirs("output", exist_ok=True)
    with open("output/products.json", 'w', encoding='utf-8') as f:
        json.dump(final_output, f, indent=2, ensure_ascii=False)

    print(f"Saved: output/products.json ({len(top_products)} products)")


if __name__ == "__main__":
    prepare_final_output()
