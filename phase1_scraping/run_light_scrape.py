"""
Daily Light Scraper with Quick AI Analysis.

Phase A — listing pages: requests + BeautifulSoup (no browser, reliable).
Phase B — review pages:  Playwright (JS-rendered, browser required).
Phase C — AI analysis:   Groq quick_analysis per product.

Output: ../output/fresh_finds.json
"""

import json
import os
import sys
import random
import time
from datetime import datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

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


# ---------------------------------------------------------------------------
# Phase A — listing page via requests (no Playwright)
# ---------------------------------------------------------------------------

def _fetch_listing(url: str, category: str, via_tor: bool = False, scraperapi_key: str = '') -> list[dict]:
    """Fetch a Flipkart listing page and parse product stubs.

    Call order: direct → Tor (free) → ScraperAPI (if key provided).
    Tor routes through a residential exit node, bypassing GitHub Actions IP blocks.
    """
    headers = {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
    }

    if scraperapi_key:
        fetch_url = 'http://api.scraperapi.com'
        params = {'api_key': scraperapi_key, 'url': url, 'country_code': 'in'}
        req_headers = {}
        proxies = None
        timeout = 60
    elif via_tor:
        fetch_url = url
        params = {}
        req_headers = headers
        proxies = {'http': 'socks5h://127.0.0.1:9050', 'https': 'socks5h://127.0.0.1:9050'}
        timeout = 30
    else:
        fetch_url = url
        params = {}
        req_headers = headers
        proxies = None
        timeout = 15

    for attempt in range(1, 4):
        try:
            resp = requests.get(fetch_url, params=params, headers=req_headers,
                                proxies=proxies, timeout=timeout)
            resp.raise_for_status()
            break
        except Exception as e:
            print(f'  Listing attempt {attempt}/3 failed: {e}')
            if attempt < 3:
                time.sleep(5 * attempt)
    else:
        return []

    soup = BeautifulSoup(resp.text, 'html.parser')
    products = []

    # Find product cards — try selectors in priority order
    cards = []
    for sel, attrs in [
        ('div', {'data-id': True}),
        ('div', {'class': 'tUxRFH'}),
        ('div', {'class': '_1AtVbE'}),
        ('div', {'class': 'yKfJKb'}),
    ]:
        cards = soup.find_all(sel, attrs)
        if len(cards) > 3:
            break

    for card in cards[:10]:
        try:
            # Name
            name_el = (
                card.find('div', class_='RG5Slk') or
                card.find('a', class_='atJtCj') or
                card.find('a', class_='pIpigb') or
                card.find('a', class_='WKTcLC') or
                card.find('div', class_='KzDlHZ') or
                card.find(class_='_4rR01T') or
                card.find(class_='s1Q9rs') or
                card.find(class_='IRpwTa') or
                card.find('a', title=True)
            )
            if not name_el:
                continue
            name = name_el.get_text(strip=True)
            if not name or len(name) < 5:
                continue

            # URL
            link_el = (
                card.find('a', class_='k7wcnx') or
                card.find('a', class_='atJtCj') or
                card.find('a', class_='pIpigb') or
                card.find('a', class_='CGtC98') or
                card.find('a', href=True)
            )
            href = link_el.get('href') if link_el else None
            if not href:
                continue
            flipkart_url = f'https://www.flipkart.com{href}' if href.startswith('/') else href

            # Price
            price_el = (
                card.find('div', class_='hZ3P6w') or
                card.find('div', class_='Nx9bqj') or
                card.find('div', class_='_30jeq3') or
                card.find('div', class_='hl05eU')
            )
            price_text = price_el.get_text(strip=True) if price_el else ''
            price = int(''.join(filter(str.isdigit, price_text))) if price_text else None

            # Image
            img_el = card.find('img')
            image_url = img_el.get('src') if img_el else None
            if image_url:
                image_url = image_url.replace('/128/128/', '/832/832/')
                image_url = image_url.replace('/224/224/', '/832/832/')
                image_url = image_url.replace('/416/416/', '/832/832/')

            products.append({
                'name': name,
                'price': price,
                'category': category,
                'image_url': image_url,
                'flipkart_url': flipkart_url,
                'scraped_at': datetime.now().isoformat(),
                '_reviews': [],
            })

        except Exception:
            continue

    return products


# ---------------------------------------------------------------------------
# Phase B — review pages via Playwright
# ---------------------------------------------------------------------------

def _scrape_reviews(page, product_url: str, max_reviews: int = 10) -> list[str]:
    """Visit a product page with Playwright and return review strings."""
    try:
        page.goto(product_url, wait_until='domcontentloaded', timeout=60000)
        time.sleep(2.0)
    except Exception:
        return []

    reviews = []

    for sel in REVIEW_SELECTORS:
        try:
            for el in page.query_selector_all(sel):
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

    if len(reviews) < 3:
        try:
            rev_link = page.query_selector("a._1KWZpX, span.b5NQAz, div._3UAT2v a, a[href*='reviews']")
            if rev_link:
                href = rev_link.get_attribute('href')
                if href:
                    rev_url = f'https://www.flipkart.com{href}' if href.startswith('/') else href
                    page.goto(rev_url, wait_until='domcontentloaded', timeout=60000)
                    time.sleep(2)
                    for sel in REVIEW_SELECTORS:
                        try:
                            for el in page.query_selector_all(sel):
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


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def scrape_light() -> list[dict]:
    """Full daily scrape: listings → reviews → AI analysis → fresh_finds.json."""

    scraperapi_key = os.environ.get('SCRAPERAPI_KEY', '')

    # Phase A: fetch listing pages with plain HTTP (no browser)
    products: list[dict] = []
    for category, url in CATEGORY_URLS.items():
        print(f'Scraping {category}...')
        stubs = _fetch_listing(url, category)
        products.extend(stubs)
        print(f'  {category}: {len(stubs)} products')
        time.sleep(random.uniform(1.0, 2.0))

    # Fallback 1: Tor — free, routes through residential exit node
    if not products:
        print('\nDirect requests blocked — retrying via Tor...')
        for category, url in CATEGORY_URLS.items():
            print(f'Scraping {category} (Tor)...')
            stubs = _fetch_listing(url, category, via_tor=True)
            products.extend(stubs)
            print(f'  {category}: {len(stubs)} products')
            time.sleep(random.uniform(1.0, 2.0))

    # Fallback 2: ScraperAPI — if key is configured
    if not products and scraperapi_key:
        print('\nTor also blocked — retrying via ScraperAPI...')
        for category, url in CATEGORY_URLS.items():
            print(f'Scraping {category} (ScraperAPI)...')
            stubs = _fetch_listing(url, category, scraperapi_key=scraperapi_key)
            products.extend(stubs)
            print(f'  {category}: {len(stubs)} products')
            time.sleep(random.uniform(1.0, 2.0))

    if not products:
        print('No products found from listing pages.')
        return []

    print(f'\nTotal stubs: {len(products)} — fetching reviews...')

    # Phase B: visit each product page for reviews (needs Playwright)
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-dev-shm-usage',
            ],
        )
        context = browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            locale='en-IN',
            timezone_id='Asia/Kolkata',
            viewport={'width': 1280, 'height': 900},
            extra_http_headers={
                'Accept-Language': 'en-IN,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        )
        page = context.new_page()

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
                print(f'  [{i}/{len(products)}] score={qa.get("quick_score", 0)} | {product["name"][:35]}')
                analyzed += 1
            except Exception as e:
                print(f'  [{i}/{len(products)}] analysis error: {e}')
                product['quick_analysis'] = None
            time.sleep(2)
        else:
            product['quick_analysis'] = None

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

    print(f'\nDone: {len(products)} products, {analyzed} with AI analysis')
    print(f'Saved: {output_path}')
    return products


if __name__ == '__main__':
    result = scrape_light()
    if not result:
        print('ERROR: 0 products scraped — exiting with code 1')
        sys.exit(1)
