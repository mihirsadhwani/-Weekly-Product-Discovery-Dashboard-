"""
Merges newly scraped fresh_finds with today's existing data.
Called by GitHub Actions after each daily run so products accumulate across
the 3 daily attempts instead of overwriting each other.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

today = datetime.utcnow().strftime('%Y-%m-%d')
new_path = Path('output/fresh_finds.json')
existing_path = Path('phase4_frontend/public/data/fresh_finds.json')

try:
    new_data = json.loads(new_path.read_text(encoding='utf-8'))
except Exception:
    print('No output/fresh_finds.json found — skipping merge')
    sys.exit(0)

if new_data.get('total_products', 0) == 0:
    print('0 new products — nothing to merge')
    sys.exit(0)

try:
    existing = json.loads(existing_path.read_text(encoding='utf-8'))
    if existing.get('date') == today and existing.get('total_products', 0) > 0:
        seen = {p['flipkart_url'] for p in new_data['products']}
        added = 0
        for p in existing['products']:
            if p['flipkart_url'] not in seen:
                new_data['products'].append(p)
                seen.add(p['flipkart_url'])
                added += 1
        new_data['total_products'] = len(new_data['products'])
        print(f'Merged: {added} existing products added -> {new_data["total_products"]} total')
    else:
        print(f'Existing data is from a different day — using new data only ({new_data["total_products"]} products)')
except Exception:
    print(f'No existing data to merge — using new data only ({new_data["total_products"]} products)')

new_path.write_text(json.dumps(new_data, indent=2, ensure_ascii=False), encoding='utf-8')
