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
}


def analyze_trends(output_dir='output'):
    """Detect product trends from current and historical data."""
    current_file = os.path.join(output_dir, 'products.json')
    if not os.path.exists(current_file):
        return None

    with open(current_file, 'r', encoding='utf-8') as f:
        current_products = json.load(f).get('products', [])

    last_week_products = []
    backup_file = os.path.join(output_dir, 'products_previous.json')
    if os.path.exists(backup_file):
        with open(backup_file, 'r', encoding='utf-8') as f:
            last_week_products = json.load(f).get('products', [])

    # Valid history = previous file has enough real data to compare against
    has_valid_history = bool(last_week_products) and len(last_week_products) >= 20

    # ── Hot Categories ─────────────────────────────────────────────────────────
    # Always show: current week counts. Add growth_pct when historical data exists.
    current_counts = Counter(p.get('category', 'Other') for p in current_products)

    hot_categories = []
    if has_valid_history:
        last_counts = Counter(p.get('category', 'Other') for p in last_week_products)
        for cat, count in sorted(current_counts.items(), key=lambda x: -x[1]):
            entry = {'category': cat, 'count': count}
            last = last_counts.get(cat, 0)
            if last > 0:
                growth = ((count - last) / last) * 100
                if growth >= 30:
                    entry['growth_pct'] = round(growth, 1)
                    entry['last_count'] = last
            hot_categories.append(entry)
        # If no category had significant growth, show all by count
        if not any(e.get('growth_pct') for e in hot_categories):
            hot_categories = sorted(hot_categories, key=lambda x: -x['count'])
    else:
        hot_categories = [
            {'category': cat, 'count': count}
            for cat, count in sorted(current_counts.items(), key=lambda x: -x[1])
        ]

    # ── Quality / Sentiment by Category ───────────────────────────────────────
    # Always show: current sentiment. Show drop_points when historical data exists.
    current_cats = set(p.get('category') for p in current_products)

    declining_categories = []
    if has_valid_history:
        for cat in sorted(current_cats):
            curr = [p for p in current_products  if p.get('category') == cat]
            prev = [p for p in last_week_products if p.get('category') == cat]
            if not curr:
                continue
            curr_avg = sum(p['analysis']['sentiment_score'] for p in curr) / len(curr)
            entry = {'category': cat, 'avg_sentiment': round(curr_avg, 1)}
            if prev:
                prev_avg = sum(p['analysis']['sentiment_score'] for p in prev) / len(prev)
                drop = prev_avg - curr_avg
                if drop >= 10:
                    entry['drop_points'] = round(drop, 1)
                    entry['last_sentiment'] = round(prev_avg, 1)
            declining_categories.append(entry)
        declining_categories.sort(key=lambda x: x.get('drop_points', 0), reverse=True)
    else:
        for cat in sorted(current_cats):
            prods = [p for p in current_products if p.get('category') == cat]
            avg = sum(p['analysis']['sentiment_score'] for p in prods) / len(prods)
            declining_categories.append({'category': cat, 'avg_sentiment': round(avg, 1)})
        declining_categories.sort(key=lambda x: -x['avg_sentiment'])

    # ── Trending Features ──────────────────────────────────────────────────────
    words = []
    for p in current_products:
        for pro in p.get('analysis', {}).get('pros', []):
            clean = re.sub(r'\s*\(\d+\s*mentions?\)', '', pro).lower()
            words += [w for w in re.findall(r"[a-z]{4,}", clean) if w not in STOPWORDS]

    keyword_counts = Counter(words)
    emerging_keywords = [
        {'keyword': word, 'mentions': count}
        for word, count in keyword_counts.most_common(20)
        if count >= 2
    ][:8]

    week_number = 2 if has_valid_history else 1

    result = {
        'hot_categories':       hot_categories,
        'declining_categories': declining_categories,
        'emerging_keywords':    emerging_keywords,
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
