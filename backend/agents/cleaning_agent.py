"""
UrbanNest AI — Cleaning & Deduplication Agent
Normalises scraped data, deduplicates against DB, assigns coordinates.
"""
import os as _os, sys as _sys
_backend_dir = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
if _backend_dir not in _sys.path:
    _sys.path.insert(0, _backend_dir)

import logging
import re
from datetime import datetime
from sqlalchemy.orm import Session
from db.models import Property, DataIngestionLog
from services.country_config import fmt_price, get_config

logger = logging.getLogger(__name__)

# Approximate city center coordinates for geo-seeding when scraper gives none
CITY_COORDS = {
    # India
    "Mumbai":    (19.0760, 72.8777), "Delhi":      (28.7041, 77.1025),
    "Bangalore": (12.9716, 77.5946), "Hyderabad":  (17.3850, 78.4867),
    "Chennai":   (13.0827, 80.2707), "Pune":       (18.5204, 73.8567),
    "Kolkata":   (22.5726, 88.3639), "Gurgaon":    (28.4595, 77.0266),
    # UK
    "London":    (51.5074, -0.1278), "Manchester": (53.4808, -2.2426),
    "Birmingham":(52.4862, -1.8904), "Leeds":      (53.8008, -1.5491),
    "Edinburgh": (55.9533, -3.1883), "Bristol":    (51.4545, -2.5879),
    "Liverpool": (53.4084, -2.9916), "Oxford":     (51.7520, -1.2577),
}


def normalise_listing(raw: dict) -> dict:
    """Normalise a raw scraped/API listing to the canonical schema."""
    country = (raw.get("country") or "uk").lower()

    # Ensure price in smallest unit
    price = raw.get("price", 0) or 0
    if isinstance(price, float):
        price = int(price)

    # Attempt to generate price_display if missing
    price_display = raw.get("price_display")
    if not price_display and price:
        try:
            price_display = fmt_price(price, country)
        except Exception:
            price_display = str(price)

    # Normalise property type casing
    prop_type = raw.get("property_type", "")
    if prop_type:
        # Standardise UK types
        uk_types = {
            "flat": "Flat", "studio": "Studio", "maisonette": "Maisonette",
            "terraced": "Terraced House", "semi-detached": "Semi-Detached",
            "detached": "Detached House", "bungalow": "Bungalow",
            "penthouse": "Penthouse",
        }
        prop_type = uk_types.get(prop_type.lower(), prop_type)

    # Seed coordinates if missing
    lat = raw.get("lat")
    lng = raw.get("lng")
    if (not lat or not lng):
        city = raw.get("city", "")
        if city in CITY_COORDS:
            import random, hashlib
            seed = hashlib.md5(f"{city}{raw.get('external_id','')}".encode()).digest()
            r = random.Random(int.from_bytes(seed[:4], 'big'))
            base_lat, base_lng = CITY_COORDS[city]
            lat = round(base_lat + (r.random() - 0.5) * 0.08, 6)
            lng = round(base_lng + (r.random() - 0.5) * 0.10, 6)

    # Build title if missing
    title = raw.get("title", "")
    if not title:
        beds = raw.get("bedrooms")
        pt   = prop_type or "Property"
        city = raw.get("city", "")
        area = raw.get("area", "")
        title = f"{beds}bed {pt} in {area or city}".strip()

    return {
        "country":       country,
        "city":          (raw.get("city") or "").strip(),
        "area":          (raw.get("area") or raw.get("city") or "").strip(),
        "postcode":      raw.get("postcode", ""),
        "address":       raw.get("address", ""),
        "lat":           lat,
        "lng":           lng,
        "title":         title,
        "description":   raw.get("description", ""),
        "property_type": prop_type,
        "price":         price,
        "currency":      raw.get("currency", get_config(country)["currency"]),
        "price_display": price_display,
        "area_sqft":     raw.get("area_sqft"),
        "bedrooms":      raw.get("bedrooms"),
        "bathrooms":     raw.get("bathrooms"),
        "floor":         raw.get("floor"),
        "furnishing":    raw.get("furnishing"),
        "tenure":        raw.get("tenure"),
        "epc_rating":    raw.get("epc_rating"),
        "amenities":     raw.get("amenities") or [],
        "images":        raw.get("images") or [],
        "source_url":    raw.get("source_url", ""),
        "data_source":   raw.get("data_source", "unknown"),
        "external_id":   raw.get("external_id", ""),
        "verified":      bool(raw.get("verified", False)),
        "featured":      bool(raw.get("featured", False)),
        "estate_agent":  raw.get("estate_agent"),
        "raw_data":      raw.get("raw_data"),
        "listed_at":     datetime.utcnow(),
        "updated_at":    datetime.utcnow(),
    }


def ingest_listings(raw_listings: list[dict], db: Session) -> dict:
    """
    Ingest a list of raw listings into PostgreSQL.
    Deduplicates by (data_source, external_id).
    Returns stats: {new, updated, dupes, errors}
    """
    stats = {"new": 0, "updated": 0, "dupes": 0, "errors": 0, "total_in": len(raw_listings)}
    started = datetime.utcnow()

    for raw in raw_listings:
        try:
            data = normalise_listing(raw)

            # Skip if price is zero or missing
            if not data["price"]:
                stats["errors"] += 1
                continue

            # Dedup check
            source    = data["data_source"]
            ext_id    = data["external_id"]

            if source and ext_id:
                existing = (
                    db.query(Property)
                    .filter(Property.data_source == source, Property.external_id == ext_id)
                    .first()
                )
                if existing:
                    # Update price and timestamp only
                    existing.price         = data["price"]
                    existing.price_display = data["price_display"]
                    existing.updated_at    = datetime.utcnow()
                    stats["updated"] += 1
                    continue

            # Insert new property
            prop = Property(**{k: v for k, v in data.items() if hasattr(Property, k)})
            db.add(prop)
            stats["new"] += 1

        except Exception as e:
            logger.error(f"Ingest error: {e} | raw={str(raw)[:200]}")
            stats["errors"] += 1
            db.rollback()
            continue

    try:
        db.commit()
    except Exception as e:
        logger.error(f"Commit failed: {e}")
        db.rollback()
        stats["errors"] += 1

    duration = (datetime.utcnow() - started).total_seconds()
    stats["duration_secs"] = round(duration, 2)
    logger.info(f"Ingest complete: {stats}")
    return stats
