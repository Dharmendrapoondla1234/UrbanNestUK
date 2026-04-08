"""
Agent 1: Data Fetch Agent
- Calls real property APIs (Zoopla, Rightmove-style endpoints)
- Falls back to Unsplash/structured generation if APIs unavailable
- All data is location-anchored to prevent cross-contamination
"""
import asyncio
import hashlib
import logging
import os
import random
import httpx
from datetime import datetime
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

# API configuration — reads from env vars
RAPIDAPI_KEY    = os.environ.get("RAPIDAPI_KEY", "")
ZOOPLA_API_KEY  = os.environ.get("ZOOPLA_API_KEY", "")

# Zoopla-compatible property listing API (via RapidAPI)
ZOOPLA_ENDPOINT = "https://zoopla.p.rapidapi.com/properties/list"
RAPID_HOST_ZOOPLA = "zoopla.p.rapidapi.com"

# UK Property data via Rightmove-compatible scrape proxy
RIGHTMOVE_ENDPOINT = "https://rightmove-scraper.p.rapidapi.com/api/search"
RAPID_HOST_RM = "rightmove-scraper.p.rapidapi.com"


async def fetch_from_zoopla(city: str, area: str, filters: dict) -> List[dict]:
    """Fetch live listings from Zoopla via RapidAPI"""
    if not RAPIDAPI_KEY:
        return []

    params = {
        "area": f"{area}, {city}",
        "listing_status": "sale",
        "minimum_price": filters.get("min_price", ""),
        "maximum_price": filters.get("max_price", ""),
        "minimum_beds": filters.get("bedrooms", ""),
        "property_type": _map_type_to_zoopla(filters.get("type", "")),
        "page_size": "20",
        "page_number": str(filters.get("page", 1)),
    }
    params = {k: v for k, v in params.items() if v}

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(
                ZOOPLA_ENDPOINT,
                params=params,
                headers={
                    "X-RapidAPI-Key": RAPIDAPI_KEY,
                    "X-RapidAPI-Host": RAPID_HOST_ZOOPLA,
                }
            )
            if r.status_code == 200:
                data = r.json()
                listings = data.get("listing", []) or data.get("listings", []) or []
                return [_normalise_zoopla(l, city, area) for l in listings if l]
    except Exception as e:
        logger.warning(f"Zoopla API failed: {e}")
    return []


def _map_type_to_zoopla(t: str) -> str:
    m = {
        "Flat": "flats",
        "Studio": "flats",
        "Terraced House": "houses",
        "Semi-Detached": "houses",
        "Detached House": "houses",
        "Bungalow": "houses",
        "Penthouse": "flats",
        "Commercial": "commercial",
        "Land": "land",
    }
    return m.get(t, "")


def _normalise_zoopla(raw: dict, city: str, area: str) -> dict:
    """Map Zoopla API response to our internal schema"""
    return {
        "external_id": str(raw.get("listing_id", "")),
        "title": raw.get("title", ""),
        "address": raw.get("displayable_address", f"{area}, {city}"),
        "postcode": raw.get("outcode", ""),
        "price": int(raw.get("price", 0)),
        "type": raw.get("property_type", "Flat").title(),
        "bedrooms": int(raw.get("num_bedrooms", 0)),
        "bathrooms": int(raw.get("num_bathrooms", 1)),
        "area_sqft": int(raw.get("floor_area", 0) or 0),
        "lat": float(raw.get("latitude", 0)),
        "lng": float(raw.get("longitude", 0)),
        "images": [{"url": img, "source": "zoopla"} for img in (raw.get("image_url", []) or [])[:3]],
        "description": raw.get("description", ""),
        "source_url": raw.get("details_url", ""),
        "data_source": "zoopla",
        "city": city,
        "area": area,
        "listed_at": raw.get("listing_date", datetime.utcnow().isoformat()),
    }


async def fetch_from_uk_properties_api(city: str, filters: dict) -> List[dict]:
    """
    UK Properties API via RapidAPI — returns real current listings
    https://rapidapi.com/collection/real-estate-apis
    """
    if not RAPIDAPI_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(
                "https://uk-properties.p.rapidapi.com/properties",
                params={"location": city, "limit": "20"},
                headers={
                    "X-RapidAPI-Key": RAPIDAPI_KEY,
                    "X-RapidAPI-Host": "uk-properties.p.rapidapi.com",
                }
            )
            if r.status_code == 200:
                return r.json().get("results", [])
    except Exception as e:
        logger.warning(f"UK Properties API failed: {e}")
    return []


# ── Fallback: Deterministic Generation (when no API key) ──────────────────────
# Properties are generated deterministically from city+area+index seed
# so the SAME area always produces the SAME properties (not random on each request)

CITY_CONFIG = {
    "London": {
        "base_price": 550000, "price_variance": 300000,
        "lat": 51.5074, "lng": -0.1278,
        "areas": {
            "Canary Wharf":  {"lat_off": 0.012, "lng_off": 0.020, "premium": 1.3},
            "Shoreditch":    {"lat_off": 0.018, "lng_off": 0.015, "premium": 1.15},
            "Kensington":    {"lat_off": -0.008, "lng_off": -0.018, "premium": 1.8},
            "Chelsea":       {"lat_off": -0.012, "lng_off": -0.020, "premium": 1.9},
            "Brixton":       {"lat_off": -0.025, "lng_off": -0.010, "premium": 0.85},
            "Hackney":       {"lat_off": 0.025, "lng_off": 0.008, "premium": 0.9},
            "Islington":     {"lat_off": 0.020, "lng_off": -0.005, "premium": 1.1},
            "Clapham":       {"lat_off": -0.018, "lng_off": -0.012, "premium": 1.0},
            "Notting Hill":  {"lat_off": 0.003, "lng_off": -0.022, "premium": 1.7},
            "Greenwich":     {"lat_off": -0.005, "lng_off": 0.030, "premium": 0.95},
        },
        "agents": ["Foxtons", "Savills", "Knight Frank", "Strutt & Parker", "JLL"],
        "currency": "GBP", "symbol": "£",
    },
    "Manchester": {
        "base_price": 220000, "price_variance": 120000,
        "lat": 53.4808, "lng": -2.2426,
        "areas": {
            "Ancoats":       {"lat_off": 0.008, "lng_off": 0.005, "premium": 1.2},
            "Didsbury":      {"lat_off": -0.045, "lng_off": -0.008, "premium": 1.1},
            "Salford Quays": {"lat_off": 0.002, "lng_off": -0.028, "premium": 1.05},
            "Chorlton":      {"lat_off": -0.030, "lng_off": -0.020, "premium": 1.0},
            "Deansgate":     {"lat_off": 0.002, "lng_off": -0.008, "premium": 1.15},
            "Northern Quarter": {"lat_off": 0.005, "lng_off": 0.002, "premium": 1.1},
            "Stretford":     {"lat_off": -0.015, "lng_off": -0.030, "premium": 0.85},
            "Hulme":         {"lat_off": -0.010, "lng_off": -0.012, "premium": 0.9},
        },
        "agents": ["Purplebricks", "Your Move", "Connells", "Reeds Rains"],
        "currency": "GBP", "symbol": "£",
    },
    "Birmingham": {
        "base_price": 200000, "price_variance": 100000,
        "lat": 52.4862, "lng": -1.8904,
        "areas": {
            "Edgbaston":     {"lat_off": -0.018, "lng_off": -0.015, "premium": 1.3},
            "Moseley":       {"lat_off": -0.025, "lng_off": -0.010, "premium": 1.1},
            "Digbeth":       {"lat_off": 0.005, "lng_off": 0.008, "premium": 0.95},
            "Harborne":      {"lat_off": -0.015, "lng_off": -0.022, "premium": 1.2},
            "Jewellery Quarter": {"lat_off": 0.010, "lng_off": -0.005, "premium": 1.1},
            "Kings Heath":   {"lat_off": -0.030, "lng_off": -0.005, "premium": 0.95},
            "Selly Oak":     {"lat_off": -0.030, "lng_off": -0.018, "premium": 0.9},
        },
        "agents": ["Connells", "Romans", "Hunters", "Fine & Country"],
        "currency": "GBP", "symbol": "£",
    },
    "Leeds": {
        "base_price": 190000, "price_variance": 90000,
        "lat": 53.8008, "lng": -1.5491,
        "areas": {
            "Chapel Allerton": {"lat_off": 0.030, "lng_off": -0.002, "premium": 1.15},
            "Headingley":    {"lat_off": 0.022, "lng_off": -0.015, "premium": 1.1},
            "Hyde Park":     {"lat_off": 0.015, "lng_off": -0.010, "premium": 0.9},
            "Roundhay":      {"lat_off": 0.040, "lng_off": 0.010, "premium": 1.2},
            "Horsforth":     {"lat_off": 0.025, "lng_off": -0.030, "premium": 1.05},
        },
        "agents": ["Dacre Son & Hartley", "Manning Stainton", "Hunters"],
        "currency": "GBP", "symbol": "£",
    },
    "Edinburgh": {
        "base_price": 310000, "price_variance": 150000,
        "lat": 55.9533, "lng": -3.1883,
        "areas": {
            "New Town":      {"lat_off": 0.008, "lng_off": -0.002, "premium": 1.5},
            "Old Town":      {"lat_off": -0.002, "lng_off": 0.003, "premium": 1.4},
            "Leith":         {"lat_off": 0.025, "lng_off": 0.010, "premium": 1.1},
            "Morningside":   {"lat_off": -0.022, "lng_off": -0.012, "premium": 1.3},
            "Stockbridge":   {"lat_off": 0.010, "lng_off": -0.015, "premium": 1.2},
        },
        "agents": ["Savills Edinburgh", "Knight Frank Scotland", "Rettie & Co"],
        "currency": "GBP", "symbol": "£",
    },
    "Bristol": {
        "base_price": 280000, "price_variance": 130000,
        "lat": 51.4545, "lng": -2.5879,
        "areas": {
            "Clifton":       {"lat_off": 0.010, "lng_off": -0.015, "premium": 1.4},
            "Redland":       {"lat_off": 0.018, "lng_off": -0.010, "premium": 1.2},
            "Stokes Croft":  {"lat_off": 0.012, "lng_off": -0.002, "premium": 1.0},
            "Harbourside":   {"lat_off": -0.005, "lng_off": -0.005, "premium": 1.15},
            "Bedminster":    {"lat_off": -0.015, "lng_off": -0.002, "premium": 0.9},
        },
        "agents": ["Savills Bristol", "Chappell & Matthews", "CBRE"],
        "currency": "GBP", "symbol": "£",
    },
    "Liverpool": {
        "base_price": 160000, "price_variance": 80000,
        "lat": 53.4084, "lng": -2.9916,
        "areas": {
            "Baltic Triangle": {"lat_off": -0.005, "lng_off": 0.002, "premium": 1.2},
            "Allerton":      {"lat_off": -0.035, "lng_off": 0.008, "premium": 1.1},
            "Sefton Park":   {"lat_off": -0.025, "lng_off": 0.005, "premium": 1.15},
            "Woolton":       {"lat_off": -0.040, "lng_off": 0.020, "premium": 1.1},
            "Wavertree":     {"lat_off": -0.015, "lng_off": 0.010, "premium": 0.95},
        },
        "agents": ["Purplebricks", "Move Residential", "Anthony James"],
        "currency": "GBP", "symbol": "£",
    },
    "Oxford": {
        "base_price": 400000, "price_variance": 180000,
        "lat": 51.7520, "lng": -1.2577,
        "areas": {
            "Jericho":       {"lat_off": 0.012, "lng_off": -0.008, "premium": 1.3},
            "Cowley":        {"lat_off": -0.008, "lng_off": 0.015, "premium": 0.9},
            "Summertown":    {"lat_off": 0.025, "lng_off": -0.003, "premium": 1.2},
            "Headington":    {"lat_off": 0.005, "lng_off": 0.020, "premium": 1.0},
            "Botley":        {"lat_off": 0.002, "lng_off": -0.022, "premium": 0.95},
        },
        "agents": ["Knight Frank Oxford", "Breckon & Breckon", "Andrews"],
        "currency": "GBP", "symbol": "£",
    },
}

PROPERTY_SPECS = {
    "Flat":           {"sqft_range": (400, 900),  "beds": [1, 2, 2, 3]},
    "Studio":         {"sqft_range": (200, 450),  "beds": [0]},
    "Maisonette":     {"sqft_range": (600, 1200), "beds": [2, 2, 3]},
    "Terraced House": {"sqft_range": (700, 1600), "beds": [2, 3, 3, 4]},
    "Semi-Detached":  {"sqft_range": (800, 1800), "beds": [3, 3, 4, 4]},
    "Detached House": {"sqft_range": (1200, 3500),"beds": [3, 4, 4, 5]},
    "Bungalow":       {"sqft_range": (700, 1400), "beds": [2, 3, 3]},
    "Penthouse":      {"sqft_range": (900, 2500), "beds": [2, 3, 3, 4]},
    "Commercial":     {"sqft_range": (400, 3000), "beds": [0]},
    "Land":           {"sqft_range": (1000, 8000),"beds": [0]},
}


def generate_deterministic_properties(city: str, area: str, count: int = 20) -> List[dict]:
    """
    Generate DETERMINISTIC properties per city+area.
    Same city+area always returns same properties — no randomness per request.
    Different areas return different properties (no contamination).
    """
    from backend.services.image_service import get_property_images

    city_conf  = CITY_CONFIG.get(city, CITY_CONFIG["London"])
    area_conf  = city_conf["areas"].get(area, {"lat_off": 0, "lng_off": 0, "premium": 1.0})

    base_lat = city_conf["lat"] + area_conf["lat_off"]
    base_lng = city_conf["lng"] + area_conf["lng_off"]
    premium  = area_conf["premium"]
    agents   = city_conf["agents"]
    symbol   = city_conf["symbol"]

    property_types = list(PROPERTY_SPECS.keys())
    tenure_options = ["Freehold", "Freehold", "Leasehold", "Leasehold", "Shared Ownership"]
    epc_options    = ["A", "B", "B", "C", "C", "C", "D", "D", "E"]
    furnish_opts   = ["Unfurnished", "Part Furnished", "Fully Furnished"]
    avail_opts     = ["Available Now", "Available Now", "Under Offer", "Coming Soon", "New Build"]
    council_bands  = ["A", "B", "C", "D", "E", "F"]
    amenities_pool = ["Parking", "Garden", "Garage", "Balcony", "Gym", "Concierge",
                      "Storage", "Lift", "Smart Home", "Underfloor Heating", "Roof Terrace"]

    results = []

    for i in range(count):
        # DETERMINISTIC seed — city + area + index (NOT random.random())
        seed_str = f"{city}|{area}|{i}"
        seed_int = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
        rng = _SeededRandom(seed_int)

        ptype    = property_types[rng.choice(len(property_types))]
        specs    = PROPERTY_SPECS[ptype]
        sqft_min, sqft_max = specs["sqft_range"]
        sqft     = rng.randint(sqft_min, sqft_max)
        beds     = specs["beds"][rng.choice(len(specs["beds"]))]
        baths    = max(1, beds) if beds else 1

        # Price: base * premium * size factor + controlled variance
        base_p   = city_conf["base_price"] * premium
        variance = city_conf["price_variance"]
        noise    = (rng.uniform() - 0.5) * variance
        price    = max(50000, int(base_p + noise + sqft * rng.uniform() * 50))

        # Location: each property gets unique micro-offset within area
        lat_noise = (rng.uniform() - 0.5) * 0.008  # ~±450m
        lng_noise = (rng.uniform() - 0.5) * 0.010
        lat       = round(base_lat + lat_noise, 6)
        lng       = round(base_lng + lng_noise, 6)

        prop_id = f"prop_{city[:3].lower()}_{area[:4].lower().replace(' ', '')}_{i:03d}"

        # Unique images per property (seeded by prop_id)
        images = get_property_images(prop_id, ptype, city, count=3)

        tenure = tenure_options[rng.choice(len(tenure_options))]
        epc    = epc_options[rng.choice(len(epc_options))]
        agent  = agents[rng.choice(len(agents))]
        furnish= furnish_opts[rng.choice(len(furnish_opts))]
        avail  = avail_opts[rng.choice(len(avail_opts))]
        council= council_bands[rng.choice(len(council_bands))]

        amenity_count = rng.randint(2, 6)
        perm_indices = list(range(len(amenities_pool)))
        rng.shuffle(perm_indices)
        amenities = [amenities_pool[j] for j in perm_indices[:amenity_count]]

        ppsf = price // sqft if sqft else 0

        beds_label = f"{beds} Bed " if beds else ""
        title = f"{beds_label}{ptype} in {area}"

        results.append({
            "id": prop_id,
            "title": title,
            "type": ptype,
            "city": city,
            "area": area,
            "address": f"{area}, {city}, UK",
            "postcode": _fake_postcode(city, rng),
            "price": price,
            "price_per_sqft": ppsf,
            "currency": "GBP",
            "currency_symbol": symbol,
            "area_sqft": sqft,
            "bedrooms": beds,
            "bathrooms": baths,
            "furnishing": furnish,
            "availability": avail,
            "floor": f"Floor {rng.randint(1, 8)}" if ptype in ("Flat", "Studio", "Penthouse", "Maisonette") else None,
            "age": rng.pick([0, 0, 1, 5, 10, 20, 30]),
            "lat": lat,
            "lng": lng,
            "images": images,
            "rating": round(3.2 + rng.uniform() * 1.8, 1),
            "locality_rating": round(3.2 + rng.uniform() * 1.8, 1),
            "safety_rating": round(3.0 + rng.uniform() * 2.0, 1),
            "lifestyle_rating": round(3.2 + rng.uniform() * 1.8, 1),
            "tenure": tenure,
            "epc_rating": epc,
            "council_tax_band": council,
            "nearest_station": f"{area} Station",
            "station_distance": f"{round(0.1 + rng.uniform() * 1.4, 1)} miles",
            "broadband_speed": f"{rng.pick([67, 100, 200, 500, 900])} Mbps",
            "flood_risk": rng.pick(["Very Low", "Very Low", "Low", "Low", "Medium"]),
            "neighborhood_culture": rng.pick(["Vibrant", "Quiet residential", "Mixed", "Upmarket", "Family-friendly"]),
            "amenities": amenities,
            "estate_agent": agent,
            "rightmove_id": f"RM{100000 + seed_int % 900000}",
            "source_url": None,
            "verified": rng.uniform() > 0.1,
            "featured": rng.uniform() > 0.88,
            "has_virtual_tour": rng.uniform() > 0.65,
            "monthly_service_charge": rng.randint(80, 400) if ptype in ("Flat", "Maisonette", "Penthouse") else None,
            "listed_at": datetime.utcnow().isoformat() + "Z",
            "data_source": "deterministic",
            "image_source": "unsplash",
        })

    return results


def _fake_postcode(city: str, rng) -> str:
    """Generate a plausible-format UK postcode for the city"""
    prefixes = {
        "London": ["E1", "E2", "EC1", "N1", "N5", "NW1", "SE1", "SW1", "W1", "W8", "WC1"],
        "Manchester": ["M1", "M2", "M3", "M14", "M20", "M21"],
        "Birmingham": ["B1", "B2", "B5", "B13", "B15", "B17"],
        "Leeds": ["LS1", "LS2", "LS6", "LS7", "LS8", "LS17"],
        "Edinburgh": ["EH1", "EH2", "EH3", "EH6", "EH9", "EH10"],
        "Bristol": ["BS1", "BS2", "BS6", "BS7", "BS8"],
        "Liverpool": ["L1", "L2", "L3", "L15", "L17"],
        "Oxford": ["OX1", "OX2", "OX3", "OX4"],
    }
    pool = prefixes.get(city, ["XX1"])
    prefix = pool[rng.choice(len(pool))]
    suffix_digit = rng.randint(1, 9)
    letters = "ABCDEFGHJKLMNPQRSTUVWXY"
    suffix_letters = f"{letters[rng.choice(len(letters))]}{letters[rng.choice(len(letters))]}"
    return f"{prefix} {suffix_digit}{suffix_letters}"


class _SeededRandom:
    """LCG-based deterministic RNG so we can reproduce the same data per seed"""
    def __init__(self, seed: int):
        self._s = seed & 0xFFFFFFFF

    def _next(self) -> int:
        self._s = (1664525 * self._s + 1013904223) & 0xFFFFFFFF
        return self._s

    def uniform(self) -> float:
        return self._next() / 0xFFFFFFFF

    def randint(self, lo: int, hi: int) -> int:
        return lo + (self._next() % (hi - lo + 1))

    def choice(self, n: int) -> int:
        return self._next() % n

    def shuffle(self, lst: list):
        for i in range(len(lst) - 1, 0, -1):
            j = self.choice(i + 1)
            lst[i], lst[j] = lst[j], lst[i]

    def pick(self, lst: list):
        """Pick a random element from a list"""
        return lst[self.choice(len(lst))]
