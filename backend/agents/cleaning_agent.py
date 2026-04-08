"""
Agent 2: Data Cleaning & Deduplication Agent
- Removes duplicate properties (by hash, lat/lng proximity, address similarity)
- Validates data types and ranges
- Normalises formats (price, location strings)
- Assigns quality scores
"""
import hashlib
import math
import re
from typing import List, Dict, Set, Tuple


def deduplicate_and_clean(properties: List[dict]) -> List[dict]:
    """
    Full pipeline: clean → validate → deduplicate → quality-score
    Returns clean, unique, validated properties.
    """
    # Stage 1: Basic cleaning
    cleaned = [_clean_property(p) for p in properties if p]
    cleaned = [p for p in cleaned if p is not None]

    # Stage 2: Deduplication (multi-strategy)
    unique = _deduplicate(cleaned)

    # Stage 3: Validate coordinates
    valid = [p for p in unique if _valid_coords(p)]

    # Stage 4: Quality score and sort
    scored = [_add_quality_score(p) for p in valid]
    scored.sort(key=lambda x: x.get("_quality_score", 0), reverse=True)

    # Stage 5: Remove internal quality score before returning
    for p in scored:
        p.pop("_quality_score", None)

    return scored


def _clean_property(p: dict) -> dict:
    """Normalise and sanitise a single property record"""
    try:
        # Price: ensure integer, remove commas/symbols
        if isinstance(p.get("price"), str):
            p["price"] = int(re.sub(r"[^\d]", "", p["price"]) or 0)
        p["price"] = max(0, int(p.get("price") or 0))

        # City and area: capitalise properly
        p["city"] = str(p.get("city", "")).strip().title()
        p["area"] = str(p.get("area", "")).strip().title()
        p["address"] = str(p.get("address", f"{p['area']}, {p['city']}, UK")).strip()

        # Coordinates: ensure float
        p["lat"] = float(p.get("lat", 0) or 0)
        p["lng"] = float(p.get("lng", 0) or 0)

        # Bedrooms/bathrooms
        p["bedrooms"]  = max(0, int(p.get("bedrooms", 0) or 0))
        p["bathrooms"] = max(1, int(p.get("bathrooms", 1) or 1))

        # Ratings: clamp 0-5
        for field in ("rating", "locality_rating", "safety_rating", "lifestyle_rating"):
            val = float(p.get(field, 4.0) or 4.0)
            p[field] = round(min(5.0, max(0.0, val)), 1)

        # Images: validate and keep only valid URLs
        raw_images = p.get("images", [])
        valid_imgs = []
        seen_img_urls = set()
        for img in raw_images:
            if isinstance(img, str):
                img = {"url": img, "source": "unknown"}
            url = img.get("url", "")
            if url and url not in seen_img_urls and _valid_image_url(url):
                seen_img_urls.add(url)
                valid_imgs.append(img)
        p["images"] = valid_imgs

        # Compute dedup hash
        sig = f"{p['address'].lower()}|{p['lat']:.3f}|{p['lng']:.3f}|{p['price']}"
        p["_dedup_hash"] = hashlib.md5(sig.encode()).hexdigest()

        return p
    except Exception:
        return None


def _deduplicate(properties: List[dict]) -> List[dict]:
    """
    Multi-strategy deduplication:
    1. Exact ID match
    2. Dedup hash (address + coords + price)
    3. Spatial proximity (same lat/lng within ~50m)
    """
    seen_ids: Set[str] = set()
    seen_hashes: Set[str] = set()
    coord_grid: Dict[Tuple[int, int], List[dict]] = {}  # grid cells for proximity check
    unique = []

    for p in properties:
        pid = p.get("id", "")
        if pid and pid in seen_ids:
            continue

        dedup_hash = p.get("_dedup_hash", "")
        if dedup_hash and dedup_hash in seen_hashes:
            continue

        # Spatial dedup: bucket into ~50m grid cells
        lat, lng = p.get("lat", 0), p.get("lng", 0)
        grid_key = (int(lat * 1000), int(lng * 1000))  # 0.001° ≈ 111m
        neighbours = coord_grid.get(grid_key, [])
        is_spatial_dup = False
        for neighbour in neighbours:
            dist = _haversine(lat, lng, neighbour["lat"], neighbour["lng"])
            if dist < 0.05 and abs(p["price"] - neighbour["price"]) < 5000:
                # Same location, same price → duplicate
                is_spatial_dup = True
                break
        if is_spatial_dup:
            continue

        # Passed all checks — accept this property
        if pid:
            seen_ids.add(pid)
        if dedup_hash:
            seen_hashes.add(dedup_hash)

        coord_grid.setdefault(grid_key, []).append(p)
        unique.append(p)

    return unique


def _valid_coords(p: dict) -> bool:
    """Reject properties with zero or obviously wrong coordinates"""
    lat, lng = p.get("lat", 0), p.get("lng", 0)
    if lat == 0 and lng == 0:
        return False
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        return False
    return True


def _valid_image_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    if not url.startswith(("https://", "http://")):
        return False
    bad = ["placeholder", "example.com", "test.png", "dummy", "lorem", "blank"]
    return not any(b in url.lower() for b in bad)


def _add_quality_score(p: dict) -> dict:
    """Score each property for sorting — higher = better data quality"""
    score = 0
    if p.get("price", 0) > 0:           score += 20
    if p.get("area_sqft", 0) > 0:       score += 10
    if p.get("bedrooms", 0) > 0:        score += 5
    if p.get("lat", 0) != 0:            score += 15
    if p.get("images"):                  score += 10 * min(len(p["images"]), 3)
    if p.get("address"):                 score += 5
    if p.get("epc_rating"):              score += 3
    if p.get("tenure"):                  score += 3
    if p.get("estate_agent"):            score += 2
    if p.get("nearest_station"):         score += 2
    if p.get("data_source") == "zoopla": score += 20  # real data bonus
    p["_quality_score"] = score
    return p


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in km between two lat/lng points"""
    R = 6371
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lng2 - lng1)
    a = math.sin(Δφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(Δλ/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
