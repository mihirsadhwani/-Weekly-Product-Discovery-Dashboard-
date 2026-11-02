import json
import re
import os
from collections import Counter
from datetime import datetime

STOPWORDS = {
    'this', 'that', 'with', 'have', 'very', 'good', 'best', 'great', 'nice',
    'product', 'item', 'quality', 'price', 'value', 'money', 'worth', 'overall',
    'also', 'well', 'more', 'much', 'from', 'about', 'which', 'would', 'could',
    'like', 'just', 'even', 'than', 'only', 'been', 'some', 'will', 'does',
    'what', 'they', 'when', 'them', 'their', 'there', 'were', 'your', 'their',
    'make', 'made', 'look', 'feel', 'work', 'time', 'need', 'want', 'come',
    'high', 'easy', 'used', 'using', 'really', 'solid', 'strong', 'decent',
    'competitive', 'category', 'verified', 'listing', 'specs', 'discount',
    'friendly', 'budget', 'affordable', 'pricing', 'daily',
}


def _sentiment_of(p: dict) -> float:
    analysis = p.get('analysis') or {}
    qa = p.get('quick_analysis') or {}
    return float(
        analysis.get('sentiment_score')
        or qa.get('quick_score')
        or analysis.get('quality_score')
        or 0
    )


def analyze_trends(output_dir='output'):
    """Detect product trends from current and historical data."""
    current_file = os.path.join(output_dir, 'products.json')
    if not os.path.exists(current_file):
        return None

    with open(current_file, 'r', encoding='utf-8') as f:
        current_products = json.load(f).get('products', [])

    # Use full candidate pool (deals_finds.json) for category deal volume when available
    deals_pool_file = os.path.join(output_dir, 'deals_finds.json')
    pool_products = current_products
    if os.path.exists(deals_pool_file):
        try:
            with open(deals_pool_file, 'r', encoding='utf-8') as f:
                pool = json.load(f).get('products', [])
                if len(pool) >= len(current_products):
                    pool_products = pool
        except Exception:
            pass

    last_week_products = []
    for candidate_name in ('products_previous.json', 'deals_backup.json'):
        backup_file = os.path.join(output_dir, candidate_name)
        if os.path.exists(backup_file):
            try:
                with open(backup_file, 'r', encoding='utf-8') as f:
                    loaded = json.load(f).get('products', [])
                    if len(loaded) >= 20:
                        last_week_products = loaded
                        break
            except Exception:
                continue

    # Valid history = previous file has enough real data to compare against
    has_valid_history = bool(last_week_products) and len(last_week_products) >= 20

    # ── Hot Categories ─────────────────────────────────────────────────────────
    current_counts = Counter(p.get('category', 'Other') for p in pool_products)

    hot_categories = []
    if has_valid_history:
        last_counts = Counter(p.get('category', 'Other') for p in last_week_products)
        for cat, count in sorted(current_counts.items(), key=lambda x: -x[1]):
            entry = {'category': cat, 'count': count}
            last = last_counts.get(cat, 0)
            if last > 0:
                growth = ((count - last) / last) * 100
                entry['last_count'] = last
                if growth >= 5:
                    entry['growth_pct'] = round(growth, 1)
            hot_categories.append(entry)
        hot_categories.sort(key=lambda x: (x.get('growth_pct', -999), x['count']), reverse=True)
    else:
        hot_categories = [
            {'category': cat, 'count': count}
            for cat, count in sorted(current_counts.items(), key=lambda x: -x[1])
        ]

    # ── Quality / Sentiment by Category ───────────────────────────────────────
    current_cats = set(p.get('category') for p in current_products if p.get('category'))

    declining_categories = []
    if has_valid_history:
        for cat in sorted(current_cats):
            curr = [p for p in current_products if p.get('category') == cat]
            prev = [p for p in last_week_products if p.get('category') == cat]
            if not curr:
                continue
            curr_avg = sum(_sentiment_of(p) for p in curr) / len(curr)
            entry = {'category': cat, 'avg_sentiment': round(curr_avg, 1)}
            if prev:
                prev_avg = sum(_sentiment_of(p) for p in prev) / len(prev)
                drop = prev_avg - curr_avg
                entry['last_sentiment'] = round(prev_avg, 1)
                if drop >= 1.5:
                    entry['drop_points'] = round(drop, 1)
            declining_categories.append(entry)
        declining_categories.sort(key=lambda x: (x.get('drop_points', 0), -x['avg_sentiment']), reverse=True)
    else:
        for cat in sorted(current_cats):
            prods = [p for p in current_products if p.get('category') == cat]
            avg = sum(_sentiment_of(p) for p in prods) / len(prods)
            declining_categories.append({'category': cat, 'avg_sentiment': round(avg, 1)})
        declining_categories.sort(key=lambda x: -x['avg_sentiment'])

    # ── Trending Features ──────────────────────────────────────────────────────
    words = []
    for p in current_products:
        pros = (p.get('analysis') or {}).get('pros') or (p.get('quick_analysis') or {}).get('top_pros') or []
        for pro in pros:
            clean = re.sub(r'\s*\(\d+\s*mentions?\)', '', str(pro)).lower()
            words += [w for w in re.findall(r"[a-z]{4,}", clean) if w not in STOPWORDS]

    keyword_counts = Counter(words)
    emerging_keywords = [
        {'keyword': word, 'mentions': count}
        for word, count in keyword_counts.most_common(20)
        if count >= 2
    ][:8]

    # ── Price Movements ────────────────────────────────────────────────────────
    current_prices: dict = {}
    for p in current_products:
        cat = p.get('category', '')
        price = p.get('price')
        if cat and price:
            current_prices.setdefault(cat, []).append(price)

    price_movements = []
    if has_valid_history:
        last_prices: dict = {}
        for p in last_week_products:
            cat = p.get('category', '')
            price = p.get('price')
            if cat and price:
                last_prices.setdefault(cat, []).append(price)
        for cat, prices in current_prices.items():
            avg = sum(prices) / len(prices)
            entry = {'category': cat, 'avg_price': round(avg)}
            if cat in last_prices:
                last_avg = sum(last_prices[cat]) / len(last_prices[cat])
                entry['last_avg_price'] = round(last_avg)
                entry['delta'] = round(avg - last_avg)
            price_movements.append(entry)
    else:
        for cat, prices in current_prices.items():
            price_movements.append({'category': cat, 'avg_price': round(sum(prices) / len(prices))})
    price_movements.sort(key=lambda x: abs(x.get('delta', 0)), reverse=True)

    # ── Best Deal of the Week ──────────────────────────────────────────────────
    best_deal = None
    best_score = -1
    for p in current_products:
        discount = p.get('discount_percent') or 0
        ai_score = _sentiment_of(p)
        vfm = p.get('vfm_score') or 0
        combined = (discount * 0.35) + (ai_score * 0.45) + (vfm * 0.20)
        if combined > best_score and p.get('name') and p.get('flipkart_url'):
            best_score = combined
            best_deal = {
                'name': p['name'],
                'price': p.get('price'),
                'original_price': p.get('original_price'),
                'discount_percent': discount,
                'category': p.get('category', ''),
                'score': round(ai_score),
                'flipkart_url': p['flipkart_url'],
            }

    week_number = 2 if has_valid_history else 1

    result = {
        'hot_categories':       hot_categories,
        'declining_categories': declining_categories,
        'emerging_keywords':    emerging_keywords,
        'price_movements':      price_movements,
        'best_deal':            best_deal,
        'has_history':          has_valid_history,
        'week_number':          week_number,
        'generated_at':         datetime.now().isoformat(),
    }

    drops = sum(1 for c in declining_categories if c.get('drop_points'))
    print(f"Trends (week {week_number}): {len(hot_categories)} categories, "
          f"{drops} quality drops, {len(emerging_keywords)} keywords")
    return result


if __name__ == "__main__":
    result = analyze_trends()
    print(json.dumps(result, indent=2))
