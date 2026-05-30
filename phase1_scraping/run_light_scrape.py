"""
Daily Light Scraper with Quick AI Analysis.
Scrapes product listings, fetches reviews per product, runs quick Groq analysis.
Output: ../output/fresh_finds.json
"""

import json
import os
import sys
import random
import time
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

# Import quick_analyzer from phase2_analysis (sibling directory)
sys.path.insert(0, str(Path(__file__).parent.parent / 'phase2_analysis'))
from quick_analyzer import quick_analysis

from config import CATEGORY_URLS, DELAY_MIN, DELAY_MAX, USER_AGENTS


REVIEW_SELECTORS = [
    'div.ZmyHeo div',
    'div.t-ZTKy',
    'div._6K-7Co',
    'p.z9E0IG',
    'div.row.gFkBPR div',
    'div._11pzQk',
]


def _scrape_reviews(page, product_url, max_reviews=10):
    """Visit a product page and return up to max_reviews review strings."""
    try:
        page.goto(product_url, wait_until='domcontentloaded', timeout=30000)
        time.sleep(2.0)
    except Exception:
        return []

    reviews = []

    # Try CSS selectors first
    for sel in REVIEW_SELECTORS:
        try:
            els = page.query_selector_all(sel)
            for el in els:
                try:
                    text = el.inner_text().strip()
                    if len(text) > 40 and 'READ MORE' not in text and text not in reviews:
                        reviews.append(text)
                except Exception:
                    continue
        except Exception:
            continue
        if len(reviews) >= max_reviews:
            break

    # JS fallback — same approach as the weekly scraper
    if len(reviews) < 3:
        try:
            js_reviews = page.evaluate("""() => {
                const found = [];
                document.querySelectorAll('p, div').forEach(el => {
                    const txt = (el.innerText || '').trim();
                    if (txt.length > 40 && txt.length < 500 &&
                        el.children.length <= 2 &&
                        !txt.includes('READ MORE') &&
                        !txt.includes('Helpful') &&
                        !txt.includes('Add to cart')) {
                        found.push(txt);
                    }
                });
                return [...new Set(found)].slice(0, 20);
            }""")
            for txt in js_reviews:
                if txt not in reviews:
                    reviews.append(txt)
        except Exception:
            pass

    # If still no reviews, try navigating to the reviews sub-page
    if len(reviews) < 3:
        try:
            rev_link = page.query_selector(
                "a._1KWZpX, span.b5NQAz, div._3UAT2v a, a[href*='reviews']"
            )
            if rev_link:
                href = rev_link.get_attribute('href')
                if href:
                    rev_url = f'https://www.flipkart.com{href}' if href.startswith('/') else href
                    page.goto(rev_url, wait_until='domcontentloaded', timeout=25000)
                    time.sleep(2)
                    for sel in REVIEW_SELECTORS:
                        try:
                            els = page.query_selector_all(sel)
                            for el in els:
                                try:
                                    text = el.inner_text().strip()
                                    if len(text) > 40 and 'READ MORE' not in text and text not in reviews:
                                        reviews.append(text)
                                except Exception:
                                    continue
                        except Exception:
                            continue
                        if len(reviews) >= max_reviews:
                            break
        except Exception:
            pass

    return reviews[:max_reviews]


def scrape_light():
    """Scrape listings, fetch reviews, run quick AI analysis, save fresh_finds.json."""
    products = []

    proxy = None

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            proxy=proxy,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        context = browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            locale="en-IN",
            timezone_id="Asia/Kolkata",
            viewport={"width": 1280, "height": 900},
            extra_http_headers={
                "Accept-Language": "en-IN,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        )
        page = context.new_page()

        # Phase A: scrape listing pages
        for category, url in CATEGORY_URLS.items():
            print(f'Scraping {category}...')
            try:
                page.goto(url, wait_until='domcontentloaded', timeout=30000)
                time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))

                product_cards = []
                for card_sel in ['div[data-id]', 'div.tUxRFH', 'div._1AtVbE', 'div.yKfJKb']:
                    product_cards = page.query_selector_all(card_sel)
                    if len(product_cards) > 3:
                        break
                product_cards = product_cards[:10]

                for card in product_cards:
                    try:
                        name_el = card.query_selector(
                            'div.RG5Slk, a.atJtCj, a.pIpigb, a.WKTcLC, div.KzDlHZ, ._4rR01T, .s1Q9rs, .IRpwTa, a[title]'
                        )
                        if not name_el:
                            continue
                        name = name_el.inner_text().strip()

                        price_el = card.query_selector('div.hZ3P6w, div.Nx9bqj, div._30jeq3, div.hl05eU')
                        price_text = price_el.inner_text().strip() if price_el else ''
                        price = int(''.join(filter(str.isdigit, price_text))) if price_text else None

                        image_el = card.query_selector('img')
                        image_url = image_el.get_attribute('src') if image_el else None
                        if image_url:
                            image_url = image_url.replace('/128/128/', '/832/832/')
                            image_url = image_url.replace('/224/224/', '/832/832/')
                            image_url = image_url.replace('/416/416/', '/832/832/')

                        link_el = card.query_selector('a.k7wcnx, a.atJtCj, a.pIpigb, a.CGtC98, a')
                        href = link_el.get_attribute('href') if link_el else None
                        if not href:
                            continue
                        flipkart_url = (
                            f'https://www.flipkart.com{href}'
                            if href.startswith('/')
                            else href
                        )

                        products.append({
                            'name': name,
                            'price': price,
                            'category': category,
                            'image_url': image_url,
                            'flipkart_url': flipkart_url,
                            'scraped_at': datetime.now().isoformat(),
                            '_reviews': [],
                        })

                    except Exception as e:
                        print(f'  Skipped product: {e}')
                        continue

                cat_count = len([p for p in products if p['category'] == category])
                print(f'  {category}: {cat_count} products')

            except Exception as e:
                print(f'  Error scraping {category}: {e}')
                continue

        # Phase B: visit product pages to get reviews
        print(f'\nFetching reviews for {len(products)} products...')
        for i, product in enumerate(products, 1):
            try:
                reviews = _scrape_reviews(page, product['flipkart_url'])
                product['_reviews'] = reviews
                print(f'  [{i}/{len(products)}] {product["name"][:45]} -> {len(reviews)} reviews')
            except Exception as e:
                print(f'  [{i}/{len(products)}] review error: {e}')
            time.sleep(random.uniform(1.5, 2.5))

        browser.close()

    # Phase C: quick AI analysis
    print(f'\nRunning quick AI analysis...')
    analyzed = 0
    for i, product in enumerate(products, 1):
        reviews = product.pop('_reviews', [])
        if reviews:
            try:
                qa = quick_analysis(product['name'], reviews)
                product['quick_analysis'] = qa
                score = qa.get('quick_score', 0)
                verdict = qa.get('quick_verdict', '')[:20]
                print(f'  [{i}/{len(products)}] score={score} | {product["name"][:35]}')
                analyzed += 1
            except Exception as e:
                print(f'  [{i}/{len(products)}] analysis error: {e}')
                product['quick_analysis'] = None
            time.sleep(2)
        else:
            product['quick_analysis'] = None
            print(f'  [{i}/{len(products)}] no reviews -> skipped | {product["name"][:35]}')

    output = {
        'date': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
        'total_products': len(products),
        'products': products,
    }

    output_dir = Path(__file__).parent.parent / 'output'
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / 'fresh_finds.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f'\nDone: {len(products)} products scraped, {analyzed} with quick analysis')
    print(f'Saved: {output_path}')
    return products


if __name__ == '__main__':
    scrape_light()
