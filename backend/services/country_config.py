"""
UrbanNest AI — Country Configuration
All country-specific values live here. Zero hardcoding elsewhere.
Add a new country by adding a new key — the rest of the system adapts.
"""

COUNTRY_CONFIG = {
    "india": {
        "currency": "INR",
        "symbol": "₹",
        "price_unit": "paise",           # 1 INR = 100 paise, stored as int
        "large_unit": "lakh",            # 1 lakh = 100,000 INR
        "crore_threshold": 10_000_000,   # 1 crore = 10,000,000 INR
        "lakh_threshold": 100_000,
        "cities": [
            "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
            "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Surat",
            "Kochi", "Gurgaon", "Noida", "Chandigarh", "Indore",
        ],
        "property_types": [
            "1BHK", "2BHK", "3BHK", "4BHK", "5BHK",
            "Studio", "Villa", "Plot", "Penthouse", "Commercial",
            "Row House", "Duplex", "Farm House",
        ],
        "listing_types": ["Buy", "Rent", "PG/Co-living", "New Projects"],
        "scrapers": ["99acres", "magicbricks", "housing_com", "nobroker"],
        "apis": ["RERA_API"],
        "coord_bbox": [8.4, 68.7, 37.6, 97.4],
        "map_center": {"lat": 20.5937, "lng": 78.9629, "zoom": 5},
        "default_city": "Bangalore",
        "area_keywords": {
            "it_parks": ["Whitefield", "Electronic City", "Manyata Tech Park",
                         "Hitech City", "Gachibowli", "Magarpatta", "Hinjewadi"],
            "premium":  ["Bandra", "Juhu", "Worli", "Koregaon Park", "Indiranagar",
                         "Hauz Khas", "Golf Course Road"],
        },
        "tenure_types": ["Freehold", "Leasehold", "99-Year Lease", "999-Year Lease"],
        "furnishing_types": ["Unfurnished", "Semi-Furnished", "Fully Furnished"],
    },
    "uk": {
        "currency": "GBP",
        "symbol": "£",
        "price_unit": "pence",           # 1 GBP = 100 pence, stored as int
        "large_unit": "thousand",
        "million_threshold": 1_000_000,
        "thousand_threshold": 1_000,
        "cities": [
            "London", "Manchester", "Birmingham", "Leeds", "Edinburgh",
            "Bristol", "Liverpool", "Oxford", "Cambridge", "Brighton",
            "Cardiff", "Glasgow", "Nottingham", "Sheffield", "Newcastle",
        ],
        "property_types": [
            "Flat", "Studio", "Maisonette", "Terraced House",
            "Semi-Detached", "Detached House", "Bungalow",
            "Penthouse", "Commercial", "Land",
        ],
        "listing_types": ["Buy", "Rent", "New Build", "Auction"],
        "scrapers": ["rightmove", "zoopla"],
        "apis": ["ZOOPLA_API", "RIGHTMOVE_API"],
        "coord_bbox": [49.9, -8.6, 60.9, 1.8],
        "map_center": {"lat": 54.0, "lng": -2.0, "zoom": 6},
        "default_city": "London",
        "tenure_types": ["Freehold", "Leasehold", "Share of Freehold", "Shared Ownership"],
        "furnishing_types": ["Unfurnished", "Part Furnished", "Fully Furnished"],
        "epc_ratings": ["A", "B", "C", "D", "E", "F", "G"],
        "stamp_duty_bands": [           # SDLT bands as of 2025
            (250_000, 0.00),
            (925_000, 0.05),
            (1_500_000, 0.10),
            (float("inf"), 0.12),
        ],
    },
}

SUPPORTED_COUNTRIES = list(COUNTRY_CONFIG.keys())


def get_config(country: str) -> dict:
    """Get config for a country, raising clear error if unsupported."""
    c = country.lower()
    if c not in COUNTRY_CONFIG:
        raise ValueError(
            f"Unsupported country '{country}'. Supported: {SUPPORTED_COUNTRIES}"
        )
    return COUNTRY_CONFIG[c]


def fmt_price(amount_smallest_unit: int, country: str) -> str:
    """Format price from smallest unit (paise/pence) to human-readable string."""
    cfg = get_config(country)
    sym = cfg["symbol"]

    if country == "india":
        inr = amount_smallest_unit / 100
        if inr >= cfg["crore_threshold"]:
            return f"{sym}{inr / 1e7:.2f} Cr"
        if inr >= cfg["lakh_threshold"]:
            return f"{sym}{inr / 1e5:.2f} L"
        return f"{sym}{inr:,.0f}"
    else:  # uk
        gbp = amount_smallest_unit / 100
        if gbp >= cfg["million_threshold"]:
            return f"{sym}{gbp / 1e6:.2f}M"
        if gbp >= cfg["thousand_threshold"]:
            return f"{sym}{gbp / 1e3:.0f}K"
        return f"{sym}{gbp:,.0f}"


def parse_price_to_paise_or_pence(price_str: str, country: str) -> int:
    """Convert human price string to smallest unit integer.
    Examples: '50L' → 5000000 (INR paise), '£300k' → 30000000 (GBP pence)
    """
    import re
    s = price_str.strip().upper().replace(",", "").replace("£", "").replace("₹", "")

    if country == "india":
        m = re.match(r"([\d.]+)\s*(CR|CRORE|L|LAKH|K)?", s)
        if not m:
            return 0
        val = float(m.group(1))
        unit = m.group(2) or ""
        if unit in ("CR", "CRORE"):
            inr = val * 1e7
        elif unit in ("L", "LAKH"):
            inr = val * 1e5
        elif unit == "K":
            inr = val * 1e3
        else:
            inr = val
        return int(inr * 100)   # convert to paise
    else:  # uk
        m = re.match(r"([\d.]+)\s*(M|MILLION|K|THOUSAND)?", s)
        if not m:
            return 0
        val = float(m.group(1))
        unit = m.group(2) or ""
        if unit in ("M", "MILLION"):
            gbp = val * 1e6
        elif unit in ("K", "THOUSAND"):
            gbp = val * 1e3
        else:
            gbp = val
        return int(gbp * 100)   # convert to pence


def calc_stamp_duty(price_gbp: float) -> int:
    """Calculate UK SDLT (Stamp Duty Land Tax) for a given GBP price."""
    bands = COUNTRY_CONFIG["uk"]["stamp_duty_bands"]
    prev_threshold = 0
    tax = 0.0
    for threshold, rate in bands:
        if price_gbp <= prev_threshold:
            break
        taxable = min(price_gbp, threshold) - prev_threshold
        tax += taxable * rate
        prev_threshold = threshold
    return int(tax)
