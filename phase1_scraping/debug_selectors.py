"""Check name-element class names for each category URL."""
import asyncio
import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

URLS = {
    "Fashion":      "https://www.flipkart.com/clothing/pr?sid=clo&p%5B%5D=sort%3Drecency_desc",
    "Home_Kitchen": "https://www.flipkart.com/home-kitchen/pr?sid=j9e&p%5B%5D=sort%3Drecency_desc",
    "Beauty":       "https://www.flipkart.com/beauty-grooming/pr?sid=g9b,ffi&p%5B%5D=sort%3Drecency_desc",
}

async def check(page, label, url):
    await page.goto(url, timeout=30000, wait_until="domcontentloaded")
    await page.wait_for_timeout(2000)

    cards = []
    for sel in ["div[data-id]", "div.tUxRFH", "div._1AtVbE"]:
        cards = await page.query_selector_all(sel)
        if len(cards) > 3:
            break

    print(f"\n=== {label}: {len(cards)} cards ===")
    if not cards:
        return

    result = await cards[0].evaluate("""el => {
        const rows = [];
        el.querySelectorAll('*').forEach(node => {
            const cls = node.className;
            if (typeof cls !== 'string' || !cls.trim()) return;
            const txt = (node.innerText || '').replace(/\\n/g,' ').trim().slice(0,70);
            if (txt.length > 3 && txt.length < 200)
                rows.push(node.tagName + '.' + cls.split(' ')[0] + ' => ' + txt);
        });
        return rows.slice(0, 30);
    }""")
    for row in result:
        print(" ", row)

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
            locale="en-IN",
        )
        page = await ctx.new_page()
        for label, url in URLS.items():
            await check(page, label, url)
        await browser.close()

asyncio.run(main())
