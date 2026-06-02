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
    # Electronics: category pages with discount_dsc fills the page with discounted items.
    # popularity sort only shows popular items, many without visible discount badges.
    # Mobiles: smartphones subcategory SID gives standard listing cards (not comparison page).
    "Mobiles":       "https://www.flipkart.com/mobiles/smartphones/pr?sid=tyy,4io,7ck&p%5B%5D=sort%3Ddiscount_dsc",
    "Laptops":       "https://www.flipkart.com/computers/laptops/pr?sid=6bo,b5g&p%5B%5D=sort%3Dpopularity",
    "TVs":           "https://www.flipkart.com/televisions/pr?sid=ckf,czl&p%5B%5D=sort%3Dpopularity",
    # Fashion: kurta/kurti gives best product count; disc cap raised to 95% for ethnic wear.
    "Men_Fashion":   "https://www.flipkart.com/search?q=men+kurta&p%5B%5D=sort%3Ddiscount_dsc",
    "Women_Fashion": "https://www.flipkart.com/search?q=women+kurti&p%5B%5D=sort%3Ddiscount_dsc",
    "Home_Kitchen":  "https://www.flipkart.com/home-kitchen/pr?sid=j9e&p%5B%5D=sort%3Dpopularity",
    "Beauty":        "https://www.flipkart.com/beauty-grooming/pr?sid=g9b,ffi&p%5B%5D=sort%3Ddiscount_dsc",
    # Sports: sid=wr1 always redirects to Palanquins via Tor. Search URL avoids this.
    "Sports":        "https://www.flipkart.com/search?q=gym+fitness+equipment&p%5B%5D=sort%3Ddiscount_dsc",
}

# Alternate search URLs tried when primary URL gives < 10 products after all 6 circuits.
DEAL_CATEGORY_FALLBACK_URLS = {
    "Mobiles":       "https://www.flipkart.com/search?q=4g+smartphones+under+20000&p%5B%5D=sort%3Ddiscount_dsc",
    "Laptops":       "https://www.flipkart.com/search?q=laptop+computer&p%5B%5D=sort%3Ddiscount_dsc",
    "TVs":           "https://www.flipkart.com/search?q=smart+tv+television&p%5B%5D=sort%3Ddiscount_dsc",
    "Men_Fashion":   "https://www.flipkart.com/search?q=men+cotton+casual+shirt&p%5B%5D=sort%3Ddiscount_dsc",
    "Women_Fashion": "https://www.flipkart.com/search?q=women+ethnic+wear+saree&p%5B%5D=sort%3Ddiscount_dsc",
    "Home_Kitchen":  "https://www.flipkart.com/search?q=home+kitchen+appliances&p%5B%5D=sort%3Ddiscount_dsc",
    "Beauty":        "https://www.flipkart.com/search?q=skincare+beauty+products&p%5B%5D=sort%3Ddiscount_dsc",
    "Sports":        "https://www.flipkart.com/search?q=sports+fitness+equipment&p%5B%5D=sort%3Ddiscount_dsc",
}

CATEGORY_KEYWORDS = {
    'Mobiles': ['mobile', 'phone', 'smartphone'],
    'Laptops': ['laptop', 'notebook'],
    'TVs': ['tv', 'television'],
    'Men_Fashion': ['men', 'kurta', 'shirt', 'tshirt', 'clothing', 'fashion'],
    'Women_Fashion': ['women', 'kurti', 'western', 'dress', 'clothing', 'wear', 'fashion'],
    'Home_Kitchen': ['home', 'kitchen'],
    'Beauty': ['beauty', 'grooming'],
    'Sports': ['sport', 'fitness', 'gym', 'exercise', 'yoga', 'cricket', 'badminton'],
}

REVIEW_SELECTORS = [
    'div.ZmyHeo div',
    'div.t-ZTKy',
    'div._6K-7Co',
    'p.z9E0IG',
    'div.row.gFkBPR div',
    'div._11pzQk',
]


def _load_backup_pool() -> dict[str, list[dict]]:
    """Load last successful run's products as a per-category pool for guaranteed top-up."""
    backup = Path(__file__).parent.parent / 'output' / 'deals_backup.json'
    if not backup.exists():
        return {}
    try:
        data = json.load(open(backup, encoding='utf-8'))
        pool: dict[str, list[dict]] = {}
        for p in data.get('products', []):
            pool.setdefault(p.get('category', ''), []).append(p)
        return pool
    except Exception:
        return {}


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
        time.sleep(2)

        # Scroll in steps — fashion pages lazy-load prices only when cards enter the viewport.
        # Without stepping, cards near the bottom render links but prices stay blank,
        # causing the JS extractor to skip them (no ₹ in innerText).
        try:
            for pct in [0.2, 0.4, 0.6, 0.8, 1.0]:
                page.evaluate(f"window.scrollTo(0, document.body.scrollHeight * {pct})")
                time.sleep(1.2)
            # Scroll back to top so viewport-based rendering covers all cards
            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(1.5)
        except Exception:
            pass

        title = page.title()
        print(f'    title: {title!r}')

        # Geographic redirect detection — foreign Tor exits serve wrong regional content
        keywords = CATEGORY_KEYWORDS.get(category, [])
        if keywords and not any(kw in title.lower() for kw in keywords):
            print(f'    Geographic redirect — {category} keywords not in title')
            page.close()
            return None

        # Per-category discount cap: fashion/beauty have legitimately high badge discounts.
        _disc_cap = 95 if category in ('Men_Fashion', 'Women_Fashion') else 92 if category == 'Beauty' else 85

        # JavaScript extraction — works on Playwright-rendered DOM regardless of CSS classes.
        # Finds product links (/p/ paths), walks up to the price container, extracts all data.
        _js = """
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

        // Walk up DOM to find the product card (smallest container with a ₹ price).
        // 8000 char limit: generous enough for fashion cards with size/colour swatches,
        // tight enough to avoid spanning a full grid row with multiple products.
        let card = link.parentElement;
        for (let i = 0; i < 10 && card; i++) {
            const t = card.innerText || '';
            if (t.includes('\\u20b9') && t.length < 8000) break;
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

        // Filter EMI lines — installment amounts would be picked up as min price.
        const priceText = text.split('\\n').filter(l => {
            const ll = l.toLowerCase();
            return !ll.includes('/month') && !ll.includes('emi') && !ll.includes('per month');
        }).join(' ');

        // "Up to ₹X" values are exchange/trade-in bonuses, not selling prices.
        // Remove them before computing min so cur = actual selling price, not trade-in value.
        // e.g. text has "₹32,990  Exchange up to ₹4,400  ₹55,100":
        //   uptoValues = {4400}, prices filtered = [32990, 55100] → cur=32990 ✓
        const uptoValues = new Set(
            Array.from(text.matchAll(/up\\s*to\\s*\\u20b9\\s*([\\d,]+)/gi))
            .map(m => parseInt(m[1].replace(/,/g, '')))
        );

        const pms = Array.from(priceText.matchAll(/\\u20b9\\s*([\\d,]+)/g));
        if (!pms.length) continue;
        const prices = pms.map(m => parseInt(m[1].replace(/,/g, '')))
            .filter(p => !uptoValues.has(p));
        if (!prices.length) continue;
        const cur = Math.min(...prices);
        if (!cur || cur < 100) continue;
        const orig = prices.length > 1 ? Math.max(...prices) : null;

        // Badge text first (what user sees), price-based calc as fallback/correction.
        const dm = text.match(/(\\d{1,3})%\\s*off/i);
        let disc = dm ? parseInt(dm[1]) : null;
        if (!disc && orig && orig > cur)
            disc = Math.round((orig - cur) / orig * 100);
        // Per-category cap injected by Python (DISC_CAP placeholder).
        if (!disc || disc < 5 || disc > __DISC_CAP__) continue;

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
    return results.slice(0, 40);
}
"""
        _js_eval = _js.replace('__DISC_CAP__', str(_disc_cap))
        raw = page.evaluate(_js_eval)
        seen_hrefs_raw = {p['href'] for p in raw}
        seen_names_raw = {p['name'].lower()[:60] for p in raw}

        # Always scrape page 2 to widen the candidate pool.
        # Skip page 3 only if we already have 30+ raw products (enough for 10 after filtering).
        for pg in [2, 3]:
            if pg == 3 and len(raw) >= 30:
                break
            sep = '&' if '?' in url else '?'
            try:
                page.goto(url + sep + f'page={pg}',
                          wait_until='domcontentloaded', timeout=45000)
                try:
                    page.wait_for_selector('a[href*="/p/"]', timeout=15000)
                except Exception:
                    pass
                for pct in [0.2, 0.5, 0.8, 1.0]:
                    page.evaluate(f"window.scrollTo(0, document.body.scrollHeight * {pct})")
                    time.sleep(1.0)
                page.evaluate("window.scrollTo(0, 0)")
                time.sleep(1.0)
                raw2 = page.evaluate(_js_eval)
                if raw2:
                    # Deduplicate across pages by URL and name to prevent showing same product multiple times.
                    new_only = [
                        p for p in raw2
                        if p['href'] not in seen_hrefs_raw
                        and p['name'].lower()[:60] not in seen_names_raw
                    ]
                    seen_hrefs_raw.update(p['href'] for p in new_only)
                    seen_names_raw.update(p['name'].lower()[:60] for p in new_only)
                    raw.extend(new_only)
                    print(f'    page {pg}: +{len(new_only)} new products (deduped)')
            except Exception as pg_err:
                print(f'    page {pg}: {pg_err}')
                break

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
        err = str(e)
        print(f'    Playwright error ({category}): {e}')
        try:
            if page:
                page.close()
        except Exception:
            pass
        # Timeout/ERR_TIMED_OUT means page didn't load — retry on next Tor circuit.
        # Note: ERR_TIMED_OUT contains 'timed_out' not 'timeout', so check both.
        if 'timeout' in err.lower() or 'timed_out' in err.lower():
            return None
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

def _scrape_reviews(page, product_url: str, max_reviews: int = 5) -> tuple[list[str], int | None, int | None]:
    """Returns (reviews, selling_price, original_price)."""
    try:
        page.goto(product_url, wait_until='domcontentloaded', timeout=15000)
        time.sleep(0.3)
    except Exception:
        return [], None, None

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

    return reviews[:max_reviews], None, None


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

            # Smart retry: track per-category results, only retry categories that redirected.
            # A category is "done" once it returns products OR returns [] (correct page, 0 discounts).
            # A category stays in the retry queue only if it got a geographic redirect (None).
            category_results: dict[str, list[dict]] = {}
            pending = dict(DEAL_CATEGORY_URLS)  # categories still needing a valid response

            for circuit in range(6):
                if not pending:
                    break
                if circuit > 0:
                    print(f'\n  Rotating Tor circuit (retrying {len(pending)} categories)...')
                    rotated = _rotate_tor_circuit()
                    if not rotated:
                        print('  NEWNYM unavailable — waiting 30s...')
                        time.sleep(30)

                still_redirecting: dict[str, str] = {}
                for category, url in list(pending.items()):
                    print(f'  {category} (circuit {circuit + 1})...')
                    result = _fetch_deals_listing_playwright(url, category, tor_context)
                    if result is None:
                        still_redirecting[category] = url  # keep for next circuit
                    else:
                        category_results[category] = result  # done (even if empty)
                    time.sleep(random.uniform(2.0, 3.5))

                pending = still_redirecting
                done_count = len(category_results)
                total_found = sum(len(v) for v in category_results.values())
                print(f'  Circuit {circuit + 1}: {total_found} products across {done_count} categories, {len(pending)} still redirecting')

            # Fallback pass: for any category still under 10 products, try an alternate
            # search URL on the existing Tor context (no extra circuit rotation needed).
            MIN_PER_CAT = 10
            short_cats = {
                cat: DEAL_CATEGORY_FALLBACK_URLS[cat]
                for cat in DEAL_CATEGORY_FALLBACK_URLS
                if len(category_results.get(cat, [])) < MIN_PER_CAT
            }
            if short_cats:
                print(f'\n  Fallback pass: {len(short_cats)} categories under {MIN_PER_CAT} products...')
                for cat, fb_url in short_cats.items():
                    print(f'  {cat} fallback URL...')
                    fb_result = _fetch_deals_listing_playwright(fb_url, cat, tor_context)
                    if fb_result:
                        existing = category_results.get(cat, [])
                        seen_hrefs = {p['flipkart_url'] for p in existing}
                        new_prods = [p for p in fb_result if p['flipkart_url'] not in seen_hrefs]
                        category_results[cat] = existing + new_prods
                        print(f'    {cat}: {len(category_results[cat])} total after fallback')
                    elif fb_result is None:
                        print(f'    {cat} fallback: timeout/redirect — skipping')
                    time.sleep(random.uniform(2.0, 3.0))

            for prods in category_results.values():
                products.extend(prods)

            if products:
                print(f'Playwright+Tor succeeded: {len(products)} products from {len(category_results)} categories')
            elif category_results:
                print(f'Playwright+Tor reached all categories but found 0 discounted products')

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
        and (p.get('discount_percent') or 0) <= (95 if p.get('category') in ('Men_Fashion', 'Women_Fashion') else 92 if p.get('category') == 'Beauty' else 85)
    ]
    filtered = before - len(products)
    if filtered:
        print(f'Filtered {filtered} bogus products (wrong name / price too low / fake discount)')

    # Pre-balance before Phase B: only fetch reviews for top 15 per category (max 120 total).
    # Fetching reviews for 194 raw products took 4+ hours; this caps it at ~40 min.
    _pre_seen: dict[str, int] = {}
    _review_candidates: list[dict] = []
    for p in sorted(products, key=lambda x: ((x.get('discount_percent') or 0) * 0.5 + (x.get('rating') or 0) * 10), reverse=True):
        cat = p['category']
        if _pre_seen.get(cat, 0) < 15:
            _review_candidates.append(p)
            _pre_seen[cat] = _pre_seen.get(cat, 0) + 1
    products_no_review = [p for p in products if p not in _review_candidates]
    for p in products_no_review:
        p['_reviews'] = []

    print(f'\nTotal deal stubs: {len(products)} — fetching reviews for top {len(_review_candidates)}...')

    # Phase B: reviews via Playwright (15s page timeout prevents hangs)
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
        rev_page = context.new_page()
        rev_page.set_default_timeout(15000)  # 15s per page — skip hangers
        for i, product in enumerate(_review_candidates, 1):
            try:
                reviews, _, __ = _scrape_reviews(rev_page, product['flipkart_url'])
                product['_reviews'] = reviews

                price_str    = f"₹{product.get('price', '?')}"
                discount_str = f"{product.get('discount_percent', '?')}% off"
                print(f'  [{i}/{len(_review_candidates)}] {price_str} {discount_str} | {product["name"][:35]} -> {len(reviews)} reviews')
            except Exception as e:
                product['_reviews'] = []
                print(f'  [{i}/{len(_review_candidates)}] review error: {e}')
            time.sleep(0.2)
        browser.close()

    # Re-filter after Phase B — listing page prices are used as-is, so re-check bounds
    before_b = len(products)
    products = [
        p for p in products
        if (p.get('discount_percent') or 0) <= (95 if p.get('category') in ('Men_Fashion', 'Women_Fashion') else 92 if p.get('category') == 'Beauty' else 85)
        and (p.get('price') or 0) >= CATEGORY_MIN_PRICES.get(p.get('category', ''), 50)
    ]
    if before_b != len(products):
        print(f'Post-Phase-B filter removed {before_b - len(products)} products')

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

    # Per-category representation: up to 10 per category first, then fill to 80 overall.
    # Prevents Mobiles/Laptops (large category, many products) from crowding out Fashion/Sports.
    cat_seen: dict[str, int] = {}
    balanced: list[dict] = []
    for p in products:
        cat = p['category']
        if cat_seen.get(cat, 0) < 10:
            balanced.append(p)
            cat_seen[cat] = cat_seen.get(cat, 0) + 1
    included = {id(p) for p in balanced}
    for p in products:
        if len(balanced) >= 80:
            break
        if id(p) not in included:
            balanced.append(p)

    # Add frontend fields
    today = date.today()
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    for p in balanced:
        p.setdefault('is_vfm', False)
        p.setdefault('vfm_score', 0)
        p.setdefault('price_prediction', None)
        p.setdefault('comparisons', [])

    output_dir = Path(__file__).parent.parent / 'output'
    output_dir.mkdir(exist_ok=True)

    # Hard guarantee: any category with < 10 products gets topped up from last run's backup.
    # This makes 10-per-category unbreakable regardless of Tor reliability.
    backup_pool = _load_backup_pool()
    if backup_pool:
        by_cat: dict[str, list] = {}
        for p in balanced:
            by_cat.setdefault(p['category'], []).append(p)
        for cat in DEAL_CATEGORY_URLS:
            have = len(by_cat.get(cat, []))
            if have < 10 and cat in backup_pool:
                seen_hrefs = {p['flipkart_url'] for p in by_cat.get(cat, [])}
                added = 0
                for bp in backup_pool[cat]:
                    if have + added >= 10:
                        break
                    if bp.get('flipkart_url') not in seen_hrefs:
                        filled = dict(bp, from_backup=True)
                        balanced.append(filled)
                        seen_hrefs.add(bp['flipkart_url'])
                        added += 1
                if added:
                    print(f'  Backup top-up {cat}: +{added} (total: {have + added})')

    # Save raw deals data
    deals_out = {
        'date': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
        'total_products': len(products),
        'products': products,
    }
    with open(output_dir / 'deals_finds.json', 'w', encoding='utf-8') as f:
        json.dump(deals_out, f, indent=2, ensure_ascii=False)

    # Save this run as backup for next week (only when we got real products).
    # Backup uses original scraped products (before top-up) so it doesn't compound stale data.
    if len(products) >= 20:
        backup_out = {'date': datetime.utcnow().isoformat(), 'products': products}
        with open(output_dir / 'deals_backup.json', 'w', encoding='utf-8') as f:
            json.dump(backup_out, f, indent=2, ensure_ascii=False)

    # Save frontend-ready products.json (balanced top 80)
    products_out = {
        'last_updated': datetime.utcnow().isoformat(),
        'week_start': week_start,
        'total_products': len(balanced),
        'products': balanced,
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
    print(f'Top {len(balanced)} (balanced) saved to output/products.json')
    return balanced


if __name__ == '__main__':
    result = scrape_deals()
    if not result:
        print('ERROR: 0 deals scraped — exiting with code 1')
        sys.exit(1)
