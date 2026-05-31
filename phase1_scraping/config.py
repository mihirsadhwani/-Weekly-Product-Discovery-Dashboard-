"""
Scraper configuration — categories, delays, filters, user-agents.
Adjust DELAY_MIN / DELAY_MAX if Flipkart starts blocking requests.
"""

import random

# ---------------------------------------------------------------------------
# Scraping behaviour
# ---------------------------------------------------------------------------

HEADLESS = True          # Set to False to watch the browser work
DELAY_MIN = 2.0          # Minimum seconds to wait between page loads
DELAY_MAX = 5.0          # Maximum seconds to wait between page loads
MAX_RETRIES = 3          # How many times to retry a failed page load
PAGE_TIMEOUT = 60_000    # Milliseconds before a page load is considered failed

# ---------------------------------------------------------------------------
# Product filters
# ---------------------------------------------------------------------------

MIN_REVIEWS = 10             # Skip products with fewer reviews than this
MAX_PRODUCTS_PER_RUN = 60    # Hard cap on total products collected per run (sum of TARGET_COUNTS)
MAX_REVIEWS_PER_PRODUCT = 50 # Max reviews to scrape per product
MIN_REVIEWS_PER_PRODUCT = 0  # Include all products regardless of review count
MAX_DAYS_OLD = 14            # Only include products launched within this many days
TARGET_PRODUCTS = 60         # Try to get 60 products total
MAX_LISTING_PAGES = 4        # Max listing pages to paginate per category to collect enough stubs

# ---------------------------------------------------------------------------
# Primary category URLs (your verified Flipkart recency-sorted URLs)
# ---------------------------------------------------------------------------
# These are the top-level entry points used by the scraper.
# TARGET_COUNTS controls how many products to collect per category.

CATEGORY_URLS = {
    "Electronics": "https://www.flipkart.com/mobiles-accessories/pr?sid=tyy,4io&p%5B%5D=sort%3Drecency_desc",
    "Fashion": "https://www.flipkart.com/clothing/pr?sid=clo&p%5B%5D=sort%3Drecency_desc",
    "Home_Kitchen": "https://www.flipkart.com/home-kitchen/pr?sid=j9e&p%5B%5D=sort%3Drecency_desc",
    "Beauty": "https://www.flipkart.com/beauty-grooming/pr?sid=g9b,ffi&p%5B%5D=sort%3Drecency_desc",
}

TARGET_COUNTS = {
    "Electronics": 25,
    "Fashion": 15,
    "Home_Kitchen": 10,
    "Beauty": 10,
}

# ---------------------------------------------------------------------------
# Sub-category fallback URLs (used if a category URL yields too few results)
# ---------------------------------------------------------------------------
# The sort=recency param returns newest-first listings.

CATEGORIES = [
    {
        "name": "Electronics",
        "sub_category": "Mobiles",
        "url": "https://www.flipkart.com/mobiles/~cs=9pj5m9/pr?sid=tyy%2C4io&sort=recency&p%5B%5D=facets.availability%255B%255D%3DExclude%2BOut%2Bof%2BStock",
    },
    {
        "name": "Electronics",
        "sub_category": "Laptops",
        "url": "https://www.flipkart.com/computers/laptops/~cs=9pj5m9/pr?sid=6bo%2Cb5g&sort=recency&p%5B%5D=facets.availability%255B%255D%3DExclude%2BOut%2Bof%2BStock",
    },
    {
        "name": "Electronics",
        "sub_category": "Headphones",
        "url": "https://www.flipkart.com/audio/headphones/~cs=9pj5m9/pr?sid=0pm%2Ccbi&sort=recency&p%5B%5D=facets.availability%255B%255D%3DExclude%2BOut%2Bof%2BStock",
    },
    {
        "name": "Fashion",
        "sub_category": "Men's Clothing",
        "url": "https://www.flipkart.com/clothing-and-accessories/topwear/~cs=9pj5m9/pr?sid=clo%2Cash&sort=recency&otracker=categorytree",
    },
    {
        "name": "Fashion",
        "sub_category": "Women's Clothing",
        "url": "https://www.flipkart.com/clothing-and-accessories/western-wear/~cs=9pj5m9/pr?sid=clo%2Caps&sort=recency&otracker=categorytree",
    },
    {
        "name": "Fashion",
        "sub_category": "Footwear",
        "url": "https://www.flipkart.com/footwear/~cs=9pj5m9/pr?sid=osp&sort=recency&p%5B%5D=facets.availability%255B%255D%3DExclude%2BOut%2Bof%2BStock",
    },
    {
        "name": "Home",
        "sub_category": "Kitchen",
        "url": "https://www.flipkart.com/kitchen-dining/~cs=9pj5m9/pr?sid=pys&sort=recency&p%5B%5D=facets.availability%255B%255D%3DExclude%2BOut%2Bof%2BStock",
    },
    {
        "name": "Home",
        "sub_category": "Decor",
        "url": "https://www.flipkart.com/home-furnishing/~cs=9pj5m9/pr?sid=wwe&sort=recency&p%5B%5D=facets.availability%255B%255D%3DExclude%2BOut%2Bof%2BStock",
    },
    {
        "name": "Beauty",
        "sub_category": "Skincare",
        "url": "https://www.flipkart.com/beauty-and-personal-care/skincare/~cs=9pj5m9/pr?sid=nos%2Cbt5&sort=recency&p%5B%5D=facets.availability%255B%255D%3DExclude%2BOut%2Bof%2BStock",
    },
    {
        "name": "Beauty",
        "sub_category": "Haircare",
        "url": "https://www.flipkart.com/beauty-and-personal-care/haircare/~cs=9pj5m9/pr?sid=nos%2Cbxm&sort=recency&p%5B%5D=facets.availability%255B%255D%3DExclude%2BOut%2Bof%2BStock",
    },
]

# ---------------------------------------------------------------------------
# User-agent rotation pool
# ---------------------------------------------------------------------------
# Mimics real browsers to avoid being detected as a bot.

USER_AGENTS = [
    # Chrome on Windows (current as of 2026)
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    # Chrome on Mac
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    # Firefox on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0",
    # Edge on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0",
    # Safari on Mac
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15",
]


def get_random_user_agent() -> str:
    return random.choice(USER_AGENTS)


def get_random_delay() -> float:
    return random.uniform(DELAY_MIN, DELAY_MAX)
