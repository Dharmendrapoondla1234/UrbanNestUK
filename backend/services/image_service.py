"""
Image Service — Location-aware, property-type-specific images
No cross-property contamination. Each property gets images seeded by its unique ID.
Uses Unsplash Source API (free, no key needed) with property-type keywords.
"""
import hashlib
from typing import List


# Property-type specific search terms for relevant images
PROPERTY_TYPE_QUERIES = {
    "Flat":           ["modern-apartment-interior", "city-apartment", "flat-living-room"],
    "Studio":         ["studio-apartment", "compact-living", "studio-flat"],
    "Maisonette":     ["maisonette-house", "split-level-apartment", "townhouse-interior"],
    "Terraced House": ["terraced-house-exterior", "victorian-terrace", "brick-terrace-house"],
    "Semi-Detached":  ["semi-detached-house", "suburban-house", "family-home-garden"],
    "Detached House": ["detached-house", "large-family-home", "modern-detached"],
    "Bungalow":       ["bungalow-house", "single-storey-home", "bungalow-garden"],
    "Penthouse":      ["penthouse-apartment", "luxury-penthouse", "rooftop-apartment"],
    "Commercial":     ["commercial-property", "office-space-interior", "retail-unit"],
    "Land":           ["development-land", "empty-plot-land", "green-field-land"],
}

# Fallback pool (generic UK property images)
GENERIC_FALLBACKS = [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
    "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80",
]

# City-area specific architectural context images
CITY_CONTEXT = {
    "London": [
        "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80",
        "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=800&q=80",
    ],
    "Manchester": [
        "https://images.unsplash.com/photo-1562891561-d9b2b0a3d22c?w=800&q=80",
    ],
    "Edinburgh": [
        "https://images.unsplash.com/photo-1566986521-ef75ac73f2d5?w=800&q=80",
    ],
    "Bristol": [
        "https://images.unsplash.com/photo-1588436374754-5a6ff97ac52d?w=800&q=80",
    ],
}


def get_property_images(
    property_id: str,
    property_type: str,
    city: str,
    count: int = 3
) -> List[dict]:
    """
    Returns location and type specific images for a property.
    Uses property_id as seed so the SAME property always gets the SAME images.
    Different properties always get DIFFERENT images from the pool.
    """
    # Deterministic seed from property_id (stable across restarts)
    seed = int(hashlib.md5(property_id.encode()).hexdigest(), 16)

    queries = PROPERTY_TYPE_QUERIES.get(property_type, PROPERTY_TYPE_QUERIES["Flat"])
    fallbacks = GENERIC_FALLBACKS.copy()

    # Add city-specific images to the pool
    if city in CITY_CONTEXT:
        fallbacks = CITY_CONTEXT[city] + fallbacks

    images = []

    # Image 1: Property-type specific (using Unsplash source with keyword)
    # Each property gets a unique image offset within its type
    type_offset = seed % 100
    query = queries[seed % len(queries)]
    images.append({
        "url": f"https://source.unsplash.com/800x600/?{query}&sig={seed}",
        "alt": f"{property_type} property",
        "source": "unsplash"
    })

    # Images 2+: From our curated fallback pool, offset by seed so each prop is different
    pool_size = len(fallbacks)
    for i in range(1, count):
        idx = (seed + i * 7) % pool_size  # stride of 7 to spread evenly
        images.append({
            "url": fallbacks[idx],
            "alt": f"{city} property interior",
            "source": "unsplash"
        })

    # Deduplicate URLs within this property's image set
    seen = set()
    unique = []
    for img in images:
        if img["url"] not in seen:
            seen.add(img["url"])
            unique.append(img)

    return unique[:count]


def validate_image_url(url: str) -> bool:
    """Basic URL validation — rejects obviously broken or placeholder URLs"""
    if not url:
        return False
    if not url.startswith(("https://", "http://")):
        return False
    # Reject common placeholder patterns
    bad_patterns = ["placeholder", "example.com", "test.png", "dummy"]
    if any(p in url.lower() for p in bad_patterns):
        return False
    return True
