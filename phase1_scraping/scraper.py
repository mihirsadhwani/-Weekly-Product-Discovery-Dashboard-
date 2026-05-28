"""
Main Flipkart scraper using Playwright.

Flow:
  1. For each category in CATEGORY_URLS, scrape listing page to get product stubs.
  2. For each stub, visit the product page to collect reviews + rating + review_count.
  3. Skip products with fewer than MIN_REVIEWS_PER_PRODUCT actual reviews scraped.
  4. Return enriched product dicts ready to be saved as JSON.
"""

import asyncio
import logging
import os
import re
from datetime import datetime
from typing import Optional

from playwright.async_api import async_playwright, Page, Browser, BrowserContext

from config import (
    CATEGORY_URLS,
    TARGET_COUNTS,
    HEADLESS,
    MAX_RETRIES,
    MAX_REVIEWS_PER_PRODUCT,
    MIN_REVIEWS_PER_PRODUCT,
    PAGE_TIMEOUT,
    get_random_delay,
    get_random_user_agent,
)

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_price(text: str) -> Optional[int]:
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else None


def _parse_rating(text: str) -> Optional[float]:
    match = re.search(r"(\d+\.\d+|\d+)", text)
    val = float(match.group(1)) if match else None
    return val if val and val <= 5 else None


def _parse_review_count(text: str) -> Optional[int]:
    # "1,234 Ratings" / "342 reviews" / "1.2K Ratings"
    text = text.strip().lower()
    k_match = re.search(r"([\d.]+)\s*k", text)
    if k_match:
        return int(float(k_match.group(1)) * 1000)
    digits = re.sub(r"[^\d]", "", text.split()[0]) if text else ""
    return int(digits) if digits else None


async def _safe_load(page: Page, url: str, retries: int = MAX_RETRIES) -> bool:
    for attempt in range(1, retries + 1):
        try:
            await page.goto(url, timeout=PAGE_TIMEOUT, wait_until="domcontentloaded")
            await page.wait_for_timeout(1500)
            return True
        except Exception as exc:
            logger.warning(f"  Attempt {attempt}/{retries} failed: {exc}")
            if attempt < retries:
                await asyncio.sleep(get_random_delay())
    return False


# ---------------------------------------------------------------------------
# Listing page scraping
# ---------------------------------------------------------------------------

async def scrape_listing_page(page: Page, category: dict) -> list[dict]:
    """
    Scrape one Flipkart listing page and return product stubs.
    Does NOT filter by review count here — new products won't have reviews
    shown on listing pages. Filtering happens after visiting product pages.
    """
    url = category["url"]
    logger.info(f"Scraping listing: {category['name']}")

    ok = await _safe_load(page, url)
    if not ok:
        logger.error(f"Failed to load: {url}")
        return []

    # Find product cards
    cards = []
    for sel in ["div[data-id]", "div.tUxRFH", "div._1AtVbE", "div.yKfJKb"]:
        cards = await page.query_selector_all(sel)
        if len(cards) > 3:
            break

    logger.info(f"  Found {len(cards)} cards")
    products = []

    for card in cards:
        try:
            # ── Name ──────────────────────────────────────────────────────
            # Electronics:      div.RG5Slk
            # Fashion:          a.atJtCj
            # Home/Beauty:      a.pIpigb
            # Older fallbacks:  a.WKTcLC, div.KzDlHZ, etc.
            name_el = await card.query_selector(
                "div.RG5Slk, a.atJtCj, a.pIpigb, a.WKTcLC, div.KzDlHZ, ._4rR01T, .s1Q9rs, .IRpwTa"
            )
            if not name_el:
                continue
            name = (await name_el.inner_text()).strip()
            if not name or len(name) < 5:
                continue

            # ── Product URL ───────────────────────────────────────────────
            # Electronics: a.k7wcnx  |  Fashion: a.atJtCj  |  Home/Beauty: a.pIpigb
            link_el = await card.query_selector("a.k7wcnx, a.atJtCj, a.pIpigb, a")
            href = await link_el.get_attribute("href") if link_el else None
            if not href:
                continue
            product_url = (
                f"https://www.flipkart.com{href}" if href.startswith("/") else href
            )

            # ── Price ─────────────────────────────────────────────────────
            # Current class: div.hZ3P6w; fallbacks below
            price_el = await card.query_selector(
                "div.hZ3P6w, div.Nx9bqj, div._30jeq3, div.hl05eU, div._25b18c"
            )
            price_text = (await price_el.inner_text()).strip() if price_el else ""
            price = _parse_price(price_text)

            # ── Image ─────────────────────────────────────────────────────
            img_el = await card.query_selector("img.DByuf4, img._396cs4, img._2r_T1I, img")
            image_url = await img_el.get_attribute("src") if img_el else None
            if image_url:
                # Upgrade thumbnail to high-res
                image_url = image_url.replace("/128/128/", "/832/832/")
                image_url = image_url.replace("/224/224/", "/832/832/")
                image_url = image_url.replace("/416/416/", "/832/832/")

            products.append({
                "name": name,
                "price": price,
                "category": category["name"],
                "sub_category": category.get("sub_category", category["name"]),
                "rating": None,        # filled in from product page
                "review_count": None,  # filled in from product page
                "image_url": image_url,
                "flipkart_url": product_url,
                "reviews": [],
            })

        except Exception as exc:
            logger.debug(f"Card parse error: {exc}")
            continue

    logger.info(f"  → {len(products)} stubs collected")
    return products


# ---------------------------------------------------------------------------
# Product detail page — reviews + metadata
# ---------------------------------------------------------------------------

async def scrape_product_page(page: Page, product_url: str) -> dict:
    """
    Visit a product page and collect:
      - reviews (list of strings)
      - rating (float or None)
      - review_count (int or None)
    Returns a dict with those three keys.
    """
    ok = await _safe_load(page, product_url)
    if not ok:
        return {"reviews": [], "rating": None, "review_count": None}

    # ── Rating & review count ─────────────────────────────────────────────
    rating = None
    review_count = None

    for sel in ["div.XQDdHH", "div._3LWZlK", "span.Y1HWO0", "div.ipqd2A", "span._1lRcqv"]:
        el = await page.query_selector(sel)
        if el:
            txt = (await el.inner_text()).strip()
            parsed = _parse_rating(txt)
            if parsed:
                rating = parsed
                break

    for sel in ["span._2_R_DZ", "span.Wphh3N", "div._1WhN9y", "span._13vcmD", "div.UkUFwK"]:
        el = await page.query_selector(sel)
        if el:
            txt = (await el.inner_text()).strip()
            parsed = _parse_review_count(txt)
            if parsed:
                review_count = parsed
                break

    # JS fallback: scan full page text for rating / review count patterns
    if not rating or not review_count:
        try:
            page_text = await page.evaluate("() => document.body.innerText")
            if not rating:
                m = re.search(r'\b([1-4]\.\d|5\.0)\b', page_text)
                if m:
                    rating = _parse_rating(m.group(1))
            if not review_count:
                m = re.search(r'([\d,]+(?:\.\d+)?[Kk]?)\s+(?:Ratings?|Reviews?)', page_text)
                if m:
                    review_count = _parse_review_count(m.group(0))
        except Exception:
            pass

    # ── Navigate to All Reviews page ─────────────────────────────────────
    try:
        rev_link = await page.query_selector(
            "a._1KWZpX, span.b5NQAz, div._3UAT2v a, a[href*='reviews']"
        )
        if rev_link:
            href = await rev_link.get_attribute("href")
            if href:
                reviews_url = (
                    f"https://www.flipkart.com{href}" if href.startswith("/") else href
                )
                await _safe_load(page, reviews_url)
    except Exception:
        pass

    # ── Extract review text ───────────────────────────────────────────────
    reviews: list[str] = []

    # Try CSS selectors first
    css_selectors = [
        "div.ZmyHeo div",
        "div.t-ZTKy",
        "div._6K-7Co",
        "p.z9E0IG",
        "div.row.gFkBPR div",
        "div._11pzQk",
        "div.cPHDOP",
    ]
    for sel in css_selectors:
        els = await page.query_selector_all(sel)
        for el in els:
            try:
                text = (await el.inner_text()).strip()
                if len(text) > 40 and "READ MORE" not in text and text not in reviews:
                    reviews.append(text)
            except Exception:
                continue
        if len(reviews) >= MIN_REVIEWS_PER_PRODUCT:
            break

    # JS fallback: grab all <p> and <div> with 40–500 chars that look like reviews
    if len(reviews) < MIN_REVIEWS_PER_PRODUCT:
        js_reviews = await page.evaluate("""() => {
            const candidates = [];
            document.querySelectorAll('p, div').forEach(el => {
                const txt = (el.innerText || '').trim();
                if (txt.length > 40 && txt.length < 500 &&
                    el.children.length <= 2 &&
                    !txt.includes('READ MORE') &&
                    !txt.includes('Helpful')) {
                    candidates.push(txt);
                }
            });
            return [...new Set(candidates)].slice(0, 60);
        }""")
        for txt in js_reviews:
            if txt not in reviews:
                reviews.append(txt)

    # Paginate up to 4 more pages
    page_num = 1
    while len(reviews) < MAX_REVIEWS_PER_PRODUCT and page_num < 5:
        try:
            next_btn = await page.query_selector(
                "a._1LKTO3:last-child, nav a[href*='page=']"
            )
            if not next_btn:
                break
            href = await next_btn.get_attribute("href")
            if not href:
                break
            next_url = (
                f"https://www.flipkart.com{href}" if href.startswith("/") else href
            )
            ok = await _safe_load(page, next_url)
            if not ok:
                break

            for sel in css_selectors:
                els = await page.query_selector_all(sel)
                for el in els:
                    try:
                        text = (await el.inner_text()).strip()
                        if len(text) > 40 and "READ MORE" not in text and text not in reviews:
                            reviews.append(text)
                    except Exception:
                        continue
                if len(reviews) >= MAX_REVIEWS_PER_PRODUCT:
                    break

            page_num += 1
            await asyncio.sleep(get_random_delay())
        except Exception:
            break

    return {
        "reviews": reviews[:MAX_REVIEWS_PER_PRODUCT],
        "rating": rating,
        "review_count": review_count,
    }


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

async def run_scraper() -> list[dict]:
    """
    Full scraping run across all CATEGORY_URLS, respecting TARGET_COUNTS per category.
    Returns enriched product dicts (reviews stripped, metadata kept).
    """
    all_products: list[dict] = []
    seen_urls: set[str] = set()

    async with async_playwright() as pw:
        use_tor = os.environ.get('USE_TOR') == '1'
        proxy = {"server": "socks5://127.0.0.1:9050"} if use_tor else None
        if use_tor:
            logger.info("Using Tor proxy (socks5://127.0.0.1:9050)")

        browser: Browser = await pw.chromium.launch(
            headless=HEADLESS,
            proxy=proxy,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )

        for cat_name, cat_url in CATEGORY_URLS.items():
            target = TARGET_COUNTS.get(cat_name, 10)
            collected_this_category = 0

            logger.info(f"\n── Category: {cat_name} (target: {target}) ──")

            context: BrowserContext = await browser.new_context(
                user_agent=get_random_user_agent(),
                viewport={"width": 1280, "height": 900},
                locale="en-IN",
                timezone_id="Asia/Kolkata",
                extra_http_headers={
                    "Accept-Language": "en-IN,en;q=0.9",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
            )
            page: Page = await context.new_page()
            page.on("dialog", lambda d: asyncio.ensure_future(d.dismiss()))

            category = {"name": cat_name, "sub_category": cat_name, "url": cat_url}

            try:
                stubs = await scrape_listing_page(page, category)

                for stub in stubs:
                    if collected_this_category >= target:
                        logger.info(f"  Target {target} reached for {cat_name}.")
                        break

                    url = stub["flipkart_url"]
                    if url in seen_urls:
                        continue
                    seen_urls.add(url)

                    await asyncio.sleep(get_random_delay())

                    logger.info(f"  Visiting: {stub['name'][:55]}")
                    page_data = await scrape_product_page(page, url)

                    reviews = page_data["reviews"]
                    if len(reviews) < MIN_REVIEWS_PER_PRODUCT:
                        logger.info(f"  → {len(reviews)} reviews — skipping (min {MIN_REVIEWS_PER_PRODUCT})")
                        continue

                    # Merge product page data into stub
                    stub["reviews"] = reviews
                    stub["rating"] = page_data["rating"] or stub.get("rating")
                    stub["review_count"] = (
                        page_data["review_count"]
                        or stub.get("review_count")
                        or (len(reviews) if reviews else None)
                    )
                    stub["scraped_at"] = datetime.utcnow().isoformat() + "Z"

                    all_products.append(stub)
                    collected_this_category += 1
                    logger.info(
                        f"  ✓ {len(reviews)} reviews | rating={stub['rating']} | "
                        f"{cat_name}: {collected_this_category}/{target} | total: {len(all_products)}"
                    )

                    await asyncio.sleep(get_random_delay())

            except Exception as exc:
                logger.error(f"Error in category {cat_name}: {exc}")
            finally:
                await context.close()

        await browser.close()

    logger.info(f"\nScraping complete. {len(all_products)} products collected.")
    return all_products
