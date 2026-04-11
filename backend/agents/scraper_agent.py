"""
UrbanNest AI — Web Scraping Agent
Scrapes property listings from 99acres (India) and Rightmove/Zoopla (UK).
Uses BeautifulSoup for parsing. Playwright available for JS-heavy pages.
LangChain wraps tools for agent-driven orchestration.
"""
import os as _os, sys as _sys
_backend_dir = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
if _backend_dir not in _sys.path:
    _sys.path.insert(0, _backend_dir)

import os
import asyncio
import logging
import hashlib
import re
from datetime import datetime
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from services.country_config import parse_price_to_paise_or_pence, fmt_price

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

RATE_LIMIT_DELAY = float(os.environ.get("SCRAPER_DELAY_SECS", "2.0"))


def make_external_id(source: str, url: str, extra: str = "") -> str:
    """Generate a stable dedup ID from source + URL."""
    raw = f"{source}:{url}:{extra}"
    return hashlib.md5(raw.encode()).hexdigest()[:20]


# ══════════════════════════════════════════════════════════════
# INDIA — 99acres
# ══════════════════════════════════════════════════════════════

async def scrape_99acres(
    city: str,
    property_type: str = "2BHK",
    page: int = 1,
    for_rent: bool = False,
) -> list[dict]:
    """Scrape 99acres.com for India property listings."""
    listing_type = "rent" if for_rent else "buy"
    city_slug = city.lower().replace(" ", "-")
    url = f"https://www.99acres.com/search/property/{listing_type}/{city_slug}"
    params = {"bedroom": property_type[0] if property_type[0].isdigit() else "",
              "page": page}

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=20, follow_redirects=True) as client:
            await asyncio.sleep(RATE_LIMIT_DELAY)
            r = await client.get(url, params={k: v for k, v in params.items() if v})

        if r.status_code != 200:
            logger.warning(f"99acres returned {r.status_code} for {city}")
            return []

        soup = BeautifulSoup(r.text, "html.parser")
        listings = []

        # 99acres card selectors (update if site changes structure)
        for card in soup.select(".projectTuple, .srpTuple"):
            try:
                title_el  = card.select_one(".project_name, .tupleName, h2.propType")
                price_el  = card.select_one(".priceLabel, .price, .possessionYear")
                area_el   = card.select_one(".localitiesDetails, .localityName, .locality")
                detail_el = card.select_one(".typeLabel, .bedbath")
                link_el   = card.select_one("a[href]")

                if not title_el or not price_el:
                    continue

                title      = title_el.get_text(strip=True)
                price_raw  = price_el.get_text(strip=True)
                area_name  = area_el.get_text(strip=True) if area_el else ""
                detail_txt = detail_el.get_text(strip=True) if detail_el else ""
                source_url = "https://www.99acres.com" + link_el["href"] if link_el else ""

                price_paise = parse_price_to_paise_or_pence(price_raw, "india")

                # Extract bedrooms from detail text (e.g. "2 BHK")
                bed_match = re.search(r"(\d)\s*BHK", detail_txt or title, re.I)
                bedrooms = int(bed_match.group(1)) if bed_match else None

                ext_id = make_external_id("99acres", source_url or title)

                listings.append({
                    "country":       "india",
                    "city":          city,
                    "area":          area_name or city,
                    "title":         title,
                    "property_type": property_type,
                    "price":         price_paise,
                    "currency":      "INR",
                    "price_display": fmt_price(price_paise, "india"),
                    "bedrooms":      bedrooms,
                    "furnishing":    None,
                    "source_url":    source_url,
                    "data_source":   "99acres",
                    "external_id":   ext_id,
                    "for_rent":      for_rent,
                    "listed_at":     datetime.utcnow().isoformat(),
                    "raw_data":      {"price_raw": price_raw, "detail": detail_txt},
                })
            except Exception as e:
                logger.debug(f"Card parse error (99acres): {e}")
                continue

        logger.info(f"99acres scraped {len(listings)} listings for {city}")
        return listings

    except Exception as e:
        logger.error(f"99acres scrape failed ({city}): {e}")
        return []


async def scrape_magicbricks(city: str, bedrooms: int = 2) -> list[dict]:
    """Scrape MagicBricks for India listings."""
    city_slug = city.lower()
    url = f"https://www.magicbricks.com/property-for-sale/residential-real-estate?proptype=Multistorey-Apartment&cityName={city_slug}"

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=20, follow_redirects=True) as client:
            await asyncio.sleep(RATE_LIMIT_DELAY)
            r = await client.get(url)

        soup = BeautifulSoup(r.text, "html.parser")
        listings = []

        for card in soup.select(".mb-srp__card"):
            try:
                title    = card.select_one(".mb-srp__card--title").get_text(strip=True)
                price_el = card.select_one(".mb-srp__card--price")
                area_el  = card.select_one(".mb-srp__card--locality")
                link_el  = card.select_one("a.mb-srp__card--thumbnail")

                price_raw  = price_el.get_text(strip=True) if price_el else ""
                area_name  = area_el.get_text(strip=True) if area_el else city
                source_url = link_el["href"] if link_el else ""
                if source_url and not source_url.startswith("http"):
                    source_url = "https://www.magicbricks.com" + source_url

                price_paise = parse_price_to_paise_or_pence(price_raw, "india")
                ext_id = make_external_id("magicbricks", source_url or title)

                listings.append({
                    "country":       "india",
                    "city":          city,
                    "area":          area_name,
                    "title":         title,
                    "property_type": f"{bedrooms}BHK",
                    "price":         price_paise,
                    "currency":      "INR",
                    "price_display": fmt_price(price_paise, "india"),
                    "bedrooms":      bedrooms,
                    "source_url":    source_url,
                    "data_source":   "magicbricks",
                    "external_id":   ext_id,
                    "listed_at":     datetime.utcnow().isoformat(),
                })
            except Exception as e:
                logger.debug(f"MagicBricks card error: {e}")
                continue

        logger.info(f"MagicBricks scraped {len(listings)} listings for {city}")
        return listings
    except Exception as e:
        logger.error(f"MagicBricks scrape failed ({city}): {e}")
        return []


# ══════════════════════════════════════════════════════════════
# UK — Rightmove + Zoopla
# ══════════════════════════════════════════════════════════════

RIGHTMOVE_LOCATION_IDS = {
    "London":     "REGION^87490",
    "Manchester": "REGION^904",
    "Birmingham": "REGION^162",
    "Leeds":      "REGION^787",
    "Edinburgh":  "REGION^475",
    "Bristol":    "REGION^219",
    "Liverpool":  "REGION^813",
    "Oxford":     "REGION^1006",
    "Cambridge":  "REGION^254",
    "Brighton":   "REGION^212",
}


async def scrape_rightmove(
    city: str,
    max_price: Optional[int] = None,
    min_beds: Optional[int] = None,
    for_rent: bool = False,
) -> list[dict]:
    """Scrape Rightmove for UK property listings."""
    location_id = RIGHTMOVE_LOCATION_IDS.get(city, f"REGION^{city[:6].upper()}")
    listing_type = "rent" if for_rent else "sale"
    base_url = f"https://www.rightmove.co.uk/property-for-{listing_type}/find.html"

    params = {
        "locationIdentifier": location_id,
        "sortType": "6",            # most recent
        "propertyTypes": "",
        "includeSSTC": "false",
    }
    if max_price:
        params["maxPrice"] = max_price
    if min_beds:
        params["minBedrooms"] = min_beds

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=20, follow_redirects=True) as client:
            await asyncio.sleep(RATE_LIMIT_DELAY)
            r = await client.get(base_url, params=params)

        soup = BeautifulSoup(r.text, "html.parser")
        listings = []

        for card in soup.select("div[data-test='propertyCard'], .l-searchResult"):
            try:
                price_el  = card.select_one("[data-test='propertyCard-priceValue'], .propertyCard-priceValue")
                title_el  = card.select_one(".propertyCard-title, h2.propertyCard-title")
                address_el = card.select_one("address.propertyCard-address")
                link_el   = card.select_one("a.propertyCard-link, a[href*='/properties/']")
                beds_el   = card.select_one("h2.propertyCard-title")

                if not price_el:
                    continue

                price_raw  = price_el.get_text(strip=True).replace(",", "").replace("£", "")
                title_txt  = title_el.get_text(strip=True) if title_el else ""
                address    = address_el.get_text(strip=True) if address_el else city
                source_url = "https://www.rightmove.co.uk" + link_el["href"] if link_el else ""

                # Parse bedrooms from title (e.g. "3 bedroom flat")
                bed_match = re.search(r"(\d+)\s*bed", title_txt, re.I)
                bedrooms = int(bed_match.group(1)) if bed_match else None

                # Parse property type from title
                type_match = re.search(
                    r"(flat|studio|terraced|semi-detached|detached|bungalow|maisonette|penthouse)",
                    title_txt, re.I
                )
                prop_type = type_match.group(1).title() if type_match else "Property"
                if prop_type == "Semi-Detached":
                    prop_type = "Semi-Detached"

                price_clean = re.sub(r"[^\d]", "", price_raw)
                price_int = int(price_clean) if price_clean else 0
                price_pence = price_int * 100   # GBP → pence

                ext_id = make_external_id("rightmove", source_url or title_txt)

                listings.append({
                    "country":       "uk",
                    "city":          city,
                    "area":          address.split(",")[0].strip() if "," in address else city,
                    "address":       address,
                    "title":         title_txt or f"{bedrooms or ''}bed {prop_type} in {city}",
                    "property_type": prop_type,
                    "price":         price_pence,
                    "currency":      "GBP",
                    "price_display": fmt_price(price_pence, "uk"),
                    "bedrooms":      bedrooms,
                    "source_url":    source_url,
                    "data_source":   "rightmove",
                    "external_id":   ext_id,
                    "for_rent":      for_rent,
                    "listed_at":     datetime.utcnow().isoformat(),
                    "raw_data":      {"price_raw": price_raw, "title_raw": title_txt},
                })
            except Exception as e:
                logger.debug(f"Rightmove card error: {e}")
                continue

        logger.info(f"Rightmove scraped {len(listings)} listings for {city}")
        return listings

    except Exception as e:
        logger.error(f"Rightmove scrape failed ({city}): {e}")
        return []


# ══════════════════════════════════════════════════════════════
# RapidAPI — Zoopla (UK, requires RAPIDAPI_KEY)
# ══════════════════════════════════════════════════════════════

async def fetch_zoopla_api(
    city: str,
    max_price: Optional[int] = None,
    bedrooms: Optional[int] = None,
    page: int = 1,
) -> list[dict]:
    """Fetch UK listings via Zoopla RapidAPI (requires RAPIDAPI_KEY env var)."""
    rapidapi_key = os.environ.get("RAPIDAPI_KEY", "")
    if not rapidapi_key:
        logger.debug("RAPIDAPI_KEY not set — skipping Zoopla API")
        return []

    url = "https://zoopla.p.rapidapi.com/properties/list"
    params = {
        "area": city,
        "listing_status": "sale",
        "page_size": "20",
        "page_number": str(page),
        "order_by": "age",
    }
    if max_price:
        params["maximum_price"] = str(max_price)
    if bedrooms:
        params["minimum_beds"] = str(bedrooms)

    headers = {
        "X-RapidAPI-Key": rapidapi_key,
        "X-RapidAPI-Host": "zoopla.p.rapidapi.com",
    }

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.get(url, params=params, headers=headers)

        if not r.is_success:
            logger.warning(f"Zoopla API error {r.status_code}")
            return []

        data = r.json()
        raw_listings = data.get("listing", []) or data.get("listings", [])
        listings = []

        for raw in raw_listings:
            price_int = int(raw.get("price", 0) or 0)
            price_pence = price_int * 100
            ext_id = make_external_id("zoopla", str(raw.get("listing_id", "")))

            listings.append({
                "country":       "uk",
                "city":          city,
                "area":          raw.get("displayable_address", city).split(",")[0].strip(),
                "address":       raw.get("displayable_address", ""),
                "postcode":      raw.get("outcode", ""),
                "title":         raw.get("title", f"Property in {city}"),
                "description":   raw.get("description", ""),
                "property_type": raw.get("property_type", "Property").title(),
                "price":         price_pence,
                "currency":      "GBP",
                "price_display": fmt_price(price_pence, "uk"),
                "bedrooms":      int(raw.get("num_bedrooms", 0) or 0),
                "bathrooms":     int(raw.get("num_bathrooms", 0) or 0),
                "area_sqft":     int(raw.get("floor_area", 0) or 0),
                "lat":           float(raw.get("latitude", 0) or 0) or None,
                "lng":           float(raw.get("longitude", 0) or 0) or None,
                "images":        [{"url": img, "source": "zoopla"}
                                  for img in (raw.get("image_url", []) or [])[:5]],
                "source_url":    raw.get("details_url", ""),
                "data_source":   "zoopla",
                "external_id":   ext_id,
                "listed_at":     raw.get("listing_date", datetime.utcnow().isoformat()),
                "raw_data":      raw,
            })

        logger.info(f"Zoopla API returned {len(listings)} listings for {city}")
        return listings

    except Exception as e:
        logger.error(f"Zoopla API failed ({city}): {e}")
        return []


# ══════════════════════════════════════════════════════════════
# ORCHESTRATOR — run all scrapers for a country
# ══════════════════════════════════════════════════════════════

async def scrape_all_india(cities: list[str] = None) -> list[dict]:
    """Run all India scrapers concurrently across cities."""
    from services.country_config import COUNTRY_CONFIG
    cities = cities or COUNTRY_CONFIG["india"]["cities"][:5]
    prop_types = ["2BHK", "3BHK", "1BHK", "Villa"]

    tasks = []
    for city in cities:
        for pt in prop_types:
            tasks.append(scrape_99acres(city, pt))
        tasks.append(scrape_magicbricks(city))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    all_listings = []
    for r in results:
        if isinstance(r, list):
            all_listings.extend(r)
        elif isinstance(r, Exception):
            logger.warning(f"Scraper task failed: {r}")

    logger.info(f"India scrape complete: {len(all_listings)} total listings")
    return all_listings


async def scrape_all_uk(cities: list[str] = None) -> list[dict]:
    """Run all UK scrapers concurrently across cities."""
    from services.country_config import COUNTRY_CONFIG
    cities = cities or COUNTRY_CONFIG["uk"]["cities"][:5]

    tasks = []
    for city in cities:
        tasks.append(scrape_rightmove(city))
        tasks.append(fetch_zoopla_api(city))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    all_listings = []
    for r in results:
        if isinstance(r, list):
            all_listings.extend(r)

    logger.info(f"UK scrape complete: {len(all_listings)} total listings")
    return all_listings
