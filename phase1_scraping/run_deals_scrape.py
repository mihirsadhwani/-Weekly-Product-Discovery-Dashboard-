"""
Weekly Deals Scraper.

Scrapes best deals & offers across 8 Flipkart categories (sorted by popularity).
Extracts discount %, rating, review count — products must have a real discount.

Phase A — listing pages: requests + BeautifulSoup + Tor fallback
Phase B — review pages:  Playwright (JS-rendered)
Phase C — AI analysis:   Groq quick_analysis per product
Phase D — output:        output/deals_finds.json + output/products.json

Unlike the daily scraper (new launches), this targets popular discounted products.
"""

import json
import os
import re
import sys
import random
import time
from datetime import datetime, date, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent.parent / 'phase2_analysis'))
from quick_analyzer import quick_analysis

sys.path.insert(0, str(Path(__file__).parent.parent / 'phase3_final_output'))
from trend_analyzer import analyze_trends

from config import DELAY_MIN, DELAY_MAX, USER_AGENTS

# ---------------------------------------------------------------------------
# 8 deal categories — sorted by popularity (high reviews + high ratings)
# ---------------------------------------------------------------------------

DEAL_CATEGORY_URLS = {
    "Mobiles":       "https://www.flipkart.com/mobiles/pr?sid=tyy,4io&p%5B%5D=sort%3Dpopularity",
    "Laptops":       "https://www.flipkart.com/computers/laptops/pr?sid=6bo,b5g&p%5B%5D=sort%3Dpopularity",
    "TVs":           "https://www.flipkart.com/televisions/pr?sid=ckf,czl&p%5B%5D=sort%3Dpopularity",
    "Men_Fashion":   "https://www.flipkart.com/clothing-and-accessories/topwear/pr?sid=clo,ash&p%5B%5D=sort%3Dpopularity",
    "Women_Fashion": "https://www.flipkart.com/clothing-and-accessories/western-wear/pr?sid=clo,aps&p%5B%5D=sort%3Dpopularity",
    "Home_Kitchen":  "https://www.flipkart.com/home-kitchen/pr?sid=j9e&p%5B%5D=sort%3Dpopularity",
    "Beauty":        "https://www.flipkart.com/beauty-grooming/pr?sid=g9b,ffi&p%5B%5D=sort%3Dpopularity",
    "Sports":        "https://www.flipkart.com/sports-fitness/pr?sid=wr1&p%5B%5D=sort%3Dpopularity",
}

CATEGORY_KEYWORDS = {
    'Mobiles': ['mobile', 'phone', 'smartphone'],
    'Laptops': ['laptop', 'notebook'],
    'TVs': ['tv', 'television'],
    'Men_Fashion': ['men', 'shirt', 'topwear'],
    'Women_Fashion': ['women', 'western', 'dress'],
    'Home_Kitchen': ['home', 'kitchen'],
    'Beauty': ['beauty', 'grooming'],
    'Sports': ['sport', 'fitness'],
}

REVIEW_SELECTORS = [
    'div.ZmyHeo div',
    'div.t-ZTKy',
    'div._6K-7Co',
    'p.z9E0IG',
    'div.row.gFkBPR div',
    'div._11pzQk',
]


def _rotate_tor_circuit() -> bool:
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect(('127.0.0.1', 9051))
        s.sendall(b'AUTHENTICATE ""\r\nNEWNYM\r\nQUIT\r\n')
        s.close()
        print('  Tor: new circuit requested — waiting 30s...')
        time.sleep(30)
        return True
    except Exception as e:
        print(f'  Tor circuit rotation unavailable: {e}')
        return False


# ---------------------------------------------------------------------------
# Phase A — listing page
# ---------------------------------------------------------------------------

def _parse_listing_html(html: str, category: str) -> list[dict]:
    """Parse Flipkart listing HTML and return product stubs with discount info."""
    soup = BeautifulSoup(html, 'html.parser')
    products = []

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

    for card in cards[:12]:
        try:
            name_el = (
                card.find('div', class_='RG5Slk') or card.find('a', class_='atJtCj') or
                card.find('a', class_='pIpigb') or card.find('a', class_='WKTcLC') or
                card.find('div', class_='KzDlHZ') or card.find(class_='_4rR01T') or
                card.find(class_='s1Q9rs') or card.find(class_='IRpwTa') or
                card.find('a', title=True)
            )
            if not name_el:
                continue
            name = name_el.get_text(strip=True)
            if not name or len(name) < 5:
                continue

            link_el = (
                card.find('a', class_='k7wcnx') or card.find('a', class_='atJtCj') or
                card.find('a', class_='pIpigb') or card.find('a', class_='CGtC98') or
                card.find('a', href=True)
            )
            href = link_el.get('href') if link_el else None
            if not href:
                continue
            flipkart_url = f'https://www.flipkart.com{href}' if href.startswith('/') else href

            price_el = (
                card.find('div', class_='hZ3P6w') or card.find('div', class_='Nx9bqj') or
                card.find('div', class_='_30jeq3') or card.find('div', class_='hl05eU')
            )
            price_text = price_el.get_text(strip=True) if price_el else ''
            price = int(''.join(filter(str.isdigit, price_text))) if price_text else None

            original_el = (
                card.find('div', class_='yRaY8j') or card.find('div', class_='_3I9_wc') or
                card.find('div', class_='_2p6los') or card.find('div', class_='_30jeq3 _1_WHN1')
            )
            original_text = original_el.get_text(strip=True) if original_el else ''
            original_price = int(''.join(filter(str.isdigit, original_text))) if original_text else None

            discount_el = (
                card.find('div', class_='UkUFwK') or card.find('div', class_='_3Ay6Sb') or
                card.find('div', class_='VGWI6F') or card.find('div', class_='_3xFhiH')
            )
            discount_percent = None
            if discount_el:
                d_text = discount_el.get_text(strip=True)
                digits = ''.join(filter(str.isdigit, d_text.split('%')[0]))
                if digits:
                    discount_percent = int(digits)
            if discount_percent is None and price and original_price and original_price > price:
                discount_percent = round((original_price - price) / original_price * 100)

            if not discount_percent or discount_percent < 5:
                continue

            rating_el = (
                card.find('div', class_='XQDdHH') or card.find('span', class_='Y1HWO0') or
                card.find('div', class_='_3LWZlK') or card.find('span', class_='_1lRcqv')
            )
            rating = None
            if rating_el:
                try:
                    rating = float(rating_el.get_text(strip=True))
                except ValueError:
                    pass

            review_el = (
                card.find('span', class_='Wphh3N') or card.find('span', class_='_2_R_DZ') or
                card.find('span', class_='_13vcmD')
            )
            review_count = None
            if review_el:
                r_text = review_el.get_text(strip=True).replace(',', '').replace('(', '').replace(')', '')
                digits = ''.join(filter(str.isdigit, r_text))
                review_count = int(digits) if digits else None

            img_el = card.find('img')
            image_url = img_el.get('src') if img_el else None
            if image_url:
                image_url = image_url.replace('/128/128/', '/832/832/')
                image_url = image_url.replace('/224/224/', '/832/832/')
                image_url = image_url.replace('/416/416/', '/832/832/')

            products.append({
                'name': name, 'price': price, 'original_price': original_price,
                'discount_percent': discount_percent, 'rating': rating,
                'review_count': review_count, 'category': category,
                'sub_category': category, 'image_url': image_url,
                'flipkart_url': flipkart_url, 'scraped_at': datetime.now().isoformat(),
                '_reviews': [],
            })
        except Exception:
            continue

    return products


def _fetch_deals_listing_playwright(url: str, category: str, context) -> list[dict] | None:
    """Playwright-based listing fetch.

    Uses JavaScript evaluation to extract products — immune to CSS class name changes
    that break BeautifulSoup selectors on JS-rendered Flipkart pages.

    Returns None when a geographic redirect is detected (caller should rotate circuit).
    Returns [] when page loads correctly but no discounted products found.
    """
    page = None
    try:
        page = context.new_page()
        page.goto(url, wait_until='domcontentloaded', timeout=60000)
        # Wait for product links to appear in the rendered DOM
        try:
            page.wait_for_selector('a[href*="/p/"]', timeout=25000)
        except Exception:
            pass
        time.sleep(4)

        title = page.title()
        print(f'    title: {title!r}')

        # Geographic redirect detection — foreign Tor exits serve wrong regional content
        keywords = CATEGORY_KEYWORDS.get(category, [])
        if keywords and not any(kw in title.lower() for kw in keywords):
            print(f'    Geographic redirect — {category} keywords not in title')
            page.close()
            return None

        # JavaScript extraction — works on Playwright-rendered DOM regardless of CSS classes.
        # Finds product links (/p/ paths), walks up to the price container, extracts all data.
        raw = page.evaluate("""
() => {
    const results = [];
    const seen = new Set();

    for (const link of document.querySelectorAll('a[href]')) {
        const href = link.href || '';
        if ((!href.includes('/p/') && !href.includes('/dl/')) ||
            href.includes('/reviews') || href.includes('/questions') ||
            href.includes('/seller')) continue;
        if (seen.has(href)) continue;

        // Skip UI action links — "Add to Compare" / "Add to Cart" buttons also use /p/ hrefs
        const lt = (link.innerText || '').trim().toLowerCase();
        if (lt === 'add to compare' || lt === 'add to cart' || lt === 'buy now' ||
            lt === 'wishlist' || lt === 'compare') continue;

        // Walk up DOM to find the product card (smallest container with a ₹ price)
        let card = link.parentElement;
        for (let i = 0; i < 10 && card; i++) {
            const t = card.innerText || '';
            if (t.includes('\\u20b9') && t.length < 2500) break;
            card = card.parentElement;
        }
        if (!card || !(card.innerText || '').includes('\\u20b9')) continue;

        const text = card.innerText || '';

        // Product name — use link text if it looks like a real product name
        const UI_NAMES = ['add to compare', 'add to cart', 'buy now', 'wishlist', 'compare', 'view details'];
        let name = (link.innerText || link.title || '').trim();
        if (!name || name.length < 5 || name.includes('\\u20b9') || UI_NAMES.includes(name.toLowerCase())) {
            name = '';
            for (const el of card.querySelectorAll('*')) {
                const t = (el.innerText || '').trim();
                if (t.length > 10 && t.length < 200 &&
                    !t.includes('\\u20b9') && !t.includes('%') &&
                    !UI_NAMES.includes(t.toLowerCase()) &&
                    el.children.length <= 3) {
                    name = t;
                    break;
                }
            }
        }
        if (!name || name.length < 5 || UI_NAMES.includes(name.toLowerCase())) continue;

        // Filter EMI / monthly installment lines before extracting prices.
        // Flipkart shows "EMI from ₹2,090/month" on cards — this would be picked as min price.
        const priceText = text.split('\\n').filter(l => {
            const ll = l.toLowerCase();
            return !ll.includes('/month') && !ll.includes('emi') && !ll.includes('per month');
        }).join(' ');

        const pms = Array.from(priceText.matchAll(/\\u20b9\\s*([\\d,]+)/g));
        if (!pms.length) continue;
        const prices = pms.map(m => parseInt(m[1].replace(/,/g, '')));
        const cur = Math.min(...prices);
        if (!cur || cur < 100) continue;
        const orig = prices.length > 1 ? Math.max(...prices) : null;

        // Discount percentage — from badge text or calculated from prices
        const dm = text.match(/(\\d{1,3})%\\s*off/i);
        let disc = dm ? parseInt(dm[1]) : null;
        if (!disc && orig && orig > cur)
            disc = Math.round((orig - cur) / orig * 100);
        if (!disc || disc < 5 || disc > 88) continue;

        // Rating (look for X.X between 3.0 and 5.0)
        const rm = text.match(/\\b([3-5]\\.[0-9])\\b/);

        // First non-data: image
        const img = card.querySelector('img[src]');
        const imgSrc = (img && img.src && !img.src.startsWith('data:')) ? img.src : null;

        seen.add(href);
        results.push({
            name: name.slice(0, 150), href,
            price: cur, orig_price: orig, disc_pct: disc,
            rating: rm ? parseFloat(rm[1]) : null, img_src: imgSrc,
        });
    }
    return results.slice(0, 20);
}
""")

        page.close()

        if not raw:
            print(f'    0 products extracted')
            return []

        now = datetime.now().isoformat()
        products = []
        for p in raw:
            img_url = p.get('img_src')
            if img_url:
                img_url = re.sub(r'/\d+/\d+/', '/416/416/', img_url)
            products.append({
                'name': p['name'],
                'price': p['price'],
                'original_price': p.get('orig_price'),
                'discount_percent': p.get('disc_pct'),
                'rating': p.get('rating'),
                'review_count': None,
                'category': category,
                'sub_category': category,
                'image_url': img_url,
                'flipkart_url': p['href'],
                'scraped_at': now,
                '_reviews': [],
            })

        print(f'    {len(products)} products with ≥5% discount')
        return products

    except Exception as e:
        print(f'    Playwright error ({category}): {e}')
        try:
            if page:
                page.close()
        except Exception:
            pass
        return []


def _fetch_deals_listing(url: str, category: str, via_tor: bool = False, scraperapi_key: str = '') -> list[dict]:
    """Fetch a Flipkart listing page via HTTP and return product stubs with discount info."""
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
        timeout = 5

    for attempt in range(1, 4):
        try:
            resp = requests.get(fetch_url, params=params, headers=req_headers,
                                proxies=proxies, timeout=timeout)
            if resp.status_code in (403, 429, 529):
                print(f'  Listing blocked ({resp.status_code}) — skipping retries')
                return []
            resp.raise_for_status()
            break
        except Exception as e:
            print(f'  Listing attempt {attempt}/3 failed: {e}')
            if attempt < 3:
                time.sleep(5 * attempt)
    else:
        return []

    return _parse_listing_html(resp.text, category)


# ---------------------------------------------------------------------------
# Phase B — reviews via Playwright
# ---------------------------------------------------------------------------

def _scrape_reviews(page, product_url: str, max_reviews: int = 10) -> list[str]:
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
# Analysis mapping (quick_analysis → frontend analysis shape)
# ---------------------------------------------------------------------------

def _map_analysis(qa: dict | None) -> dict:
    if not qa:
        return {
            'pros': [], 'cons': [], 'top_quote': '',
            'sentiment_score': 0, 'quality_score': 0, 'recommendation': 'Wait',
        }
    score = qa.get('quick_score') or 0
    verdict = qa.get('quick_verdict') or ''
    rec = 'Buy' if verdict == 'Worth checking' else 'Wait'
    top_con = qa.get('top_con')
    return {
        'pros': qa.get('top_pros') or [],
        'cons': [top_con] if top_con else [],
        'top_quote': '',
        'sentiment_score': score,
        'quality_score': score,
        'recommendation': rec,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def scrape_deals() -> list[dict]:
    """Weekly deals scrape: listings → reviews → AI analysis → products.json."""

    scraperapi_key = os.environ.get('SCRAPERAPI_KEY', '')

    # Phase A: fetch listing pages
    products: list[dict] = []
    for category, url in DEAL_CATEGORY_URLS.items():
        print(f'Scraping deals: {category}...')
        stubs = _fetch_deals_listing(url, category)
        products.extend(stubs)
        print(f'  {category}: {len(stubs)} products with discounts')
        time.sleep(random.uniform(1.0, 2.0))

    # Fallback 1: Playwright+Tor — Chromium TLS fingerprint bypasses CDN bot detection.
    # Python requests has a static non-browser JA3 hash → Cloudflare always 529s it.
    # Playwright/Chromium presents an identical TLS fingerprint to real Chrome → passes through.
    if not products:
        print('\nHTTP blocked — retrying via Playwright+Tor (browser TLS fingerprint)...')
        with sync_playwright() as pw:
            tor_browser = pw.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--proxy-server=socks5://127.0.0.1:9050',
                ],
            )
            tor_context = tor_browser.new_context(
                user_agent=random.choice(USER_AGENTS),
                locale='en-IN',
                timezone_id='Asia/Kolkata',
                viewport={'width': 1280, 'height': 900},
                extra_http_headers={
                    'Accept-Language': 'en-IN,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            )

            for circuit in range(5):
                if circuit > 0:
                    print(f'\n  Rotating Tor circuit ({circuit}/4)...')
                    rotated = _rotate_tor_circuit()
                    if not rotated:
                        print('  NEWNYM unavailable — waiting 30s...')
                        time.sleep(30)

                circuit_products: list[dict] = []
                redirect_count = 0
                for category, url in DEAL_CATEGORY_URLS.items():
                    print(f'  {category} (Playwright+Tor circuit {circuit + 1})...')
                    result = _fetch_deals_listing_playwright(url, category, tor_context)
                    if result is None:
                        redirect_count += 1
                    elif result:
                        circuit_products.extend(result)
                    time.sleep(random.uniform(2.0, 3.5))

                print(f'  Circuit {circuit + 1}: {len(circuit_products)} products, {redirect_count}/8 geographic redirects')
                if circuit_products:
                    products.extend(circuit_products)
                    print(f'Playwright+Tor circuit {circuit + 1} succeeded!')
                    break

            tor_browser.close()

    # Fallback 2: ScraperAPI
    if not products and scraperapi_key:
        print('\nTor blocked — retrying via ScraperAPI...')
        for category, url in DEAL_CATEGORY_URLS.items():
            stubs = _fetch_deals_listing(url, category, scraperapi_key=scraperapi_key)
            products.extend(stubs)
            time.sleep(random.uniform(1.0, 2.0))

    if not products:
        print('No deals found.')
        return []

    # Python-level sanity filters — catch anything the JS extractor missed
    CATEGORY_MIN_PRICES = {
        'Mobiles': 1500, 'Laptops': 8000, 'TVs': 5000,
        'Home_Kitchen': 300, 'Beauty': 30, 'Sports': 100,
        'Men_Fashion': 100, 'Women_Fashion': 100,
    }
    BAD_NAMES = {'add to compare', 'add to cart', 'buy now', 'wishlist', 'compare', 'view details'}
    before = len(products)
    products = [
        p for p in products
        if p.get('name', '').lower() not in BAD_NAMES
        and (p.get('price') or 0) >= CATEGORY_MIN_PRICES.get(p.get('category', ''), 50)
        and (p.get('discount_percent') or 0) <= 88
    ]
    filtered = before - len(products)
    if filtered:
        print(f'Filtered {filtered} bogus products (wrong name / price too low / fake discount)')

    print(f'\nTotal deal stubs: {len(products)} — fetching reviews...')

    # Phase B: reviews via Playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
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
                discount_str = f"{product.get('discount_percent', '?')}% off"
                print(f'  [{i}/{len(products)}] {discount_str} | {product["name"][:40]} -> {len(reviews)} reviews')
            except Exception as e:
                print(f'  [{i}/{len(products)}] review error: {e}')
            time.sleep(random.uniform(1.5, 2.5))
        browser.close()

    # Phase C: AI analysis
    print('\nRunning AI analysis...')
    analyzed = 0
    for i, product in enumerate(products, 1):
        reviews = product.pop('_reviews', [])
        if reviews:
            try:
                qa = quick_analysis(product['name'], reviews)
                product['quick_analysis'] = qa
                product['analysis'] = _map_analysis(qa)
                print(f'  [{i}/{len(products)}] score={qa.get("quick_score", 0)} | {product["name"][:35]}')
                analyzed += 1
            except Exception as e:
                print(f'  [{i}/{len(products)}] analysis error: {e}')
                product['quick_analysis'] = None
                product['analysis'] = _map_analysis(None)
            time.sleep(2)
        else:
            product['quick_analysis'] = None
            product['analysis'] = _map_analysis(None)

    # Phase D: sort by deal quality (discount × score), output files
    def deal_score(p: dict) -> float:
        discount = p.get('discount_percent') or 0
        ai_score = (p.get('quick_analysis') or {}).get('quick_score') or 0
        rating = p.get('rating') or 0
        return (discount * 0.4) + (ai_score * 0.4) + (rating * 5)

    products.sort(key=deal_score, reverse=True)
    top60 = products[:60]

    # Add frontend fields
    today = date.today()
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    for p in top60:
        p.setdefault('is_vfm', False)
        p.setdefault('vfm_score', 0)
        p.setdefault('price_prediction', None)
        p.setdefault('comparisons', [])

    output_dir = Path(__file__).parent.parent / 'output'
    output_dir.mkdir(exist_ok=True)

    # Save raw deals data
    deals_out = {
        'date': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
        'total_products': len(products),
        'products': products,
    }
    with open(output_dir / 'deals_finds.json', 'w', encoding='utf-8') as f:
        json.dump(deals_out, f, indent=2, ensure_ascii=False)

    # Save frontend-ready products.json (top 60 deals)
    products_out = {
        'last_updated': datetime.utcnow().isoformat(),
        'week_start': week_start,
        'total_products': len(top60),
        'products': top60,
    }
    with open(output_dir / 'products.json', 'w', encoding='utf-8') as f:
        json.dump(products_out, f, indent=2, ensure_ascii=False)

    # Generate and save trends.json
    try:
        trends = analyze_trends(str(output_dir))
        if trends:
            with open(output_dir / 'trends.json', 'w', encoding='utf-8') as f:
                json.dump(trends, f, indent=2, ensure_ascii=False)
            print('Trends saved to output/trends.json')
    except Exception as e:
        print(f'Trend analysis failed (non-fatal): {e}')

    print(f'\nDone: {len(products)} deals scraped, {analyzed} with AI analysis')
    print(f'Top 60 saved to output/products.json')
    return top60


if __name__ == '__main__':
    result = scrape_deals()
    if not result:
        print('ERROR: 0 deals scraped — exiting with code 1')
        sys.exit(1)
