"""
SmartLoc — Dataset Scraper (proof-of-source)
============================================
This script demonstrates how the SmartLoc training dataset
(`smartloc_raw_data_VERIFIED.xlsx`, sheet: Businesses) was assembled.

For each of the 5 business types the model is trained on
(cafe, hotel, restaurant, retail_shop, wellness_center) it scrapes
the TripAdvisor "Things to Do / Restaurants / Hotels" search pages
for Nuwara Eliya, paginates through every result page, and extracts
the columns that later become model features in
`backend/ml/features.py::BUSINESS_MEDIANS`:

    name             -> identifier
    rating           -> `rating`
    review_count     -> `review_log = log1p(review_count)`
    category         -> `category_encoded`
    address          -> used for area assignment (12 NE locations)

The output `smartloc_businesses_scraped.json` is the raw scrape;
the notebook (smartloc_training.ipynb) then cleans, deduplicates,
computes the engineered features (rating_vs_type, review_popularity,
competition_density, etc.), and exports the verified Excel sheet
the XGBoost model trains on.

Run:
    python scraper_proof.py
"""

import requests
from bs4 import BeautifulSoup
import time
import json
import re

# ----------------------------- config -----------------------------

BASE_URL = "https://www.tripadvisor.com"

# Each SmartLoc business type maps to a TripAdvisor search path.
# These are the same 5 categories the trained XGBoost model accepts.
BUSINESS_TYPE_PATHS = {
    "cafe":            "/Restaurants-g304134-c8-Nuwara_Eliya.html",
    "hotel":           "/Hotels-g304134-Nuwara_Eliya.html",
    "restaurant":      "/Restaurants-g304134-Nuwara_Eliya.html",
    "retail_shop":     "/Attractions-g304134-Activities-c26-Nuwara_Eliya.html",
    "wellness_center": "/Attractions-g304134-Activities-c40-Nuwara_Eliya.html",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

MAX_RETRIES = 3
REQUEST_DELAY_SEC = 2          # be polite — no hammering
PAGE_SIZE = 30                 # TripAdvisor default

# ----------------------------- helpers -----------------------------

def fetch(url: str) -> str | None:
    """GET with retry. Returns HTML on success, None on permanent failure."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.get(url, headers=HEADERS, timeout=15)
            if response.status_code == 200:
                return response.text
            print(f"  ! HTTP {response.status_code} on attempt {attempt}/{MAX_RETRIES}")
        except requests.exceptions.RequestException as e:
            print(f"  ! {type(e).__name__} on attempt {attempt}/{MAX_RETRIES}: {e}")
        time.sleep(2 * attempt)  # exponential-ish backoff
    return None


def parse_review_count(text: str) -> int:
    """'1,234 reviews' -> 1234. Returns 0 if no digits."""
    digits = re.sub(r"[^\d]", "", text or "")
    return int(digits) if digits else 0


def parse_rating(rating_attr: str) -> float:
    """TripAdvisor encodes rating in a class like 'bubble_45' = 4.5 stars."""
    m = re.search(r"bubble_(\d{2})", rating_attr or "")
    return int(m.group(1)) / 10.0 if m else 0.0


def extract_listings(html: str, business_type: str) -> list[dict]:
    """Parse one TripAdvisor results page into a list of business dicts."""
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.find_all("div", class_=re.compile(r"listing_title|listItem"))
    results = []

    for card in cards:
        name_el = card.find("a", class_=re.compile(r"property_title|title"))
        if not name_el:
            continue

        rating_el = card.find("span", class_=re.compile(r"ui_bubble_rating"))
        reviews_el = card.find("a", class_=re.compile(r"review_count"))
        address_el = card.find("div", class_=re.compile(r"address|location"))

        results.append({
            "name": name_el.get_text(strip=True),
            "url": BASE_URL + name_el.get("href", ""),
            "rating": parse_rating(rating_el.get("class", [""])[1] if rating_el else ""),
            "review_count": parse_review_count(reviews_el.get_text() if reviews_el else ""),
            "category": business_type,                       # -> category_encoded
            "address": address_el.get_text(strip=True) if address_el else "Nuwara Eliya",
            "scraped_at": int(time.time()),
        })

    return results


def has_next_page(html: str) -> bool:
    """TripAdvisor shows a 'Next' link on the pagination strip while more pages exist."""
    soup = BeautifulSoup(html, "html.parser")
    next_link = soup.find("a", class_=re.compile(r"nav next|pagination"))
    return next_link is not None and "disabled" not in (next_link.get("class") or [])


# ----------------------------- main loop -----------------------------

def scrape_business_type(business_type: str, path: str) -> list[dict]:
    """Scrape every page of one TripAdvisor category for Nuwara Eliya."""
    print(f"\n=== {business_type.upper()} ===")
    page_offset = 0
    is_scraping = True
    bucket: list[dict] = []

    while is_scraping:
        # TripAdvisor paginates via -oa<offset> insertion in the path
        page_path = (
            path
            if page_offset == 0
            else path.replace(".html", f"-oa{page_offset}.html")
        )
        url = BASE_URL + page_path
        print(f"  -> Scraping {url}")

        html = fetch(url)
        if html is None:
            print(f"  ! Giving up on {business_type} at offset {page_offset}")
            break

        listings = extract_listings(html, business_type)
        if not listings:
            print(f"  - No more listings; finished {business_type}.")
            is_scraping = False
            break

        bucket.extend(listings)
        print(f"  + Page {page_offset // PAGE_SIZE + 1}: scraped {len(listings)} listings "
              f"(cumulative {len(bucket)})")

        if not has_next_page(html):
            print(f"  - No 'Next' link; finished {business_type}.")
            is_scraping = False
            break

        page_offset += PAGE_SIZE
        time.sleep(REQUEST_DELAY_SEC)

    return bucket


def main():
    print("SmartLoc dataset scraper started...")
    print(f"Targeting Nuwara Eliya across {len(BUSINESS_TYPE_PATHS)} business types.\n")

    dataset: list[dict] = []
    for business_type, path in BUSINESS_TYPE_PATHS.items():
        try:
            dataset.extend(scrape_business_type(business_type, path))
        except Exception as e:
            print(f"  ! Unexpected error on {business_type}: {e}")
        time.sleep(REQUEST_DELAY_SEC)

    # Final dataset for the notebook (becomes the Businesses sheet).
    out_path = "smartloc_businesses_scraped.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)

    # Per-type summary so we can sanity-check coverage vs. the
    # 5 categories the model expects.
    by_type: dict[str, int] = {}
    for row in dataset:
        by_type[row["category"]] = by_type.get(row["category"], 0) + 1

    print("\n========== DONE ==========")
    print(f"Total businesses scraped: {len(dataset)}")
    for t, n in by_type.items():
        print(f"  {t:<18s} {n}")
    print(f"\nSaved -> {out_path}")
    print("Next step: open smartloc_training.ipynb and re-run the feature-engineering cells.")


if __name__ == "__main__":
    main()
