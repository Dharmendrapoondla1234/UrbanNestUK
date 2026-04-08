"""
Agent 3: Location Validation Agent
- Validates that each property's lat/lng is actually within its stated city/area
- Rejects properties assigned to wrong location (cross-contamination fix)
- Uses bounding boxes per city/area for fast O(1) validation
"""
import math
from typing import List, Optional, Tuple, Dict


# City bounding boxes: (lat_min, lat_max, lng_min, lng_max)
CITY_BOUNDS: Dict[str, Tuple[float, float, float, float]] = {
    "London":     (51.28, 51.70, -0.51, 0.33),
    "Manchester": (53.37, 53.60, -2.40, -2.05),
    "Birmingham": (52.35, 52.60, -2.05, -1.70),
    "Leeds":      (53.70, 53.92, -1.80, -1.30),
    "Edinburgh":  (55.85, 56.05, -3.40, -3.00),
    "Bristol":    (51.38, 51.55, -2.75, -2.45),
    "Liverpool":  (53.33, 53.50, -3.10, -2.82),
    "Oxford":     (51.68, 51.83, -1.38, -1.15),
    "Cambridge":  (52.15, 52.25, 0.06, 0.18),
    "Brighton":   (50.79, 50.88, -0.22, -0.04),
    "Cardiff":    (51.43, 51.55, -3.30, -3.08),
    "Glasgow":    (55.77, 55.97, -4.40, -4.05),
    "Nottingham": (52.88, 52.98, -1.22, -1.05),
    "Sheffield":  (53.32, 53.46, -1.60, -1.35),
    "Newcastle":  (54.95, 55.05, -1.68, -1.52),
}

# Area-specific tighter bounds relative to city centre
# Format: {city: {area: (lat_off_min, lat_off_max, lng_off_min, lng_off_max)}}
# These are offsets from city centre, so area radius check is: dist(area_centre, prop) < threshold
AREA_CENTRES = {
    "London": {
        "Canary Wharf":  (51.5194, -0.1078),
        "Shoreditch":    (51.5225, -0.0772),
        "Kensington":    (51.4988, -0.1938),
        "Chelsea":       (51.4860, -0.1700),
        "Brixton":       (51.4613, -0.1148),
        "Hackney":       (51.5448, -0.0553),
        "Islington":     (51.5362, -0.1033),
        "Clapham":       (51.4619, -0.1369),
        "Notting Hill":  (51.5094, -0.2065),
        "Greenwich":     (51.5024, -0.0978),
    },
    "Manchester": {
        "Ancoats":        (53.4829, -2.2169),
        "Didsbury":       (53.4129, -2.2218),
        "Salford Quays":  (53.4729, -2.2887),
        "Chorlton":       (53.4419, -2.2795),
        "Deansgate":      (53.4763, -2.2495),
        "Northern Quarter": (53.4834, -2.2339),
    },
}

AREA_RADIUS_KM = 5.5  # properties must be within 2.5km of area centre
CITY_TOLERANCE_KM = 25  # looser tolerance for city-level validation


def validate_location(properties: List[dict], city: str, area: Optional[str] = None) -> List[dict]:
    """
    Filter out properties that don't geographically belong to the requested city/area.
    This is the fix for same properties appearing in multiple locations.
    """
    valid = []
    bounds = CITY_BOUNDS.get(city)
    area_centre = _get_area_centre(city, area) if area else None

    for p in properties:
        lat = p.get("lat", 0)
        lng = p.get("lng", 0)

        if lat == 0 and lng == 0:
            # No coordinates — accept but flag
            p["_location_validated"] = False
            valid.append(p)
            continue

        # City-level bounding box check
        if bounds:
            lat_min, lat_max, lng_min, lng_max = bounds
            if not (lat_min <= lat <= lat_max and lng_min <= lng <= lng_max):
                # Outside city bounds — reject
                continue

        # Area-level proximity check
        if area_centre:
            dist = _haversine(lat, lng, area_centre[0], area_centre[1])
            if dist > AREA_RADIUS_KM:
                # Too far from area centre — reject
                continue

        p["_location_validated"] = True
        valid.append(p)

    return valid


def assign_location_metadata(p: dict) -> dict:
    """Add verified location data to a property"""
    city = p.get("city", "")
    area = p.get("area", "")
    lat  = p.get("lat", 0)
    lng  = p.get("lng", 0)

    # Find nearest known area centre
    centres = AREA_CENTRES.get(city, {})
    nearest_area = area
    min_dist = float("inf")

    for area_name, (alat, alng) in centres.items():
        d = _haversine(lat, lng, alat, alng)
        if d < min_dist:
            min_dist = d
            nearest_area = area_name

    if min_dist < AREA_RADIUS_KM and nearest_area != area:
        # Correct the area assignment
        p["area"] = nearest_area
        p["area_corrected"] = True

    # Google Maps deep link for this property's location
    if lat and lng:
        p["maps_url"] = f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"
        p["directions_url"] = f"https://www.google.com/maps/dir/?api=1&destination={lat},{lng}"
    elif p.get("address"):
        addr = p["address"].replace(" ", "+")
        p["maps_url"] = f"https://www.google.com/maps/search/?api=1&query={addr}"
        p["directions_url"] = f"https://www.google.com/maps/dir/?api=1&destination={addr}"

    return p


def _get_area_centre(city: str, area: str) -> Optional[Tuple[float, float]]:
    return AREA_CENTRES.get(city, {}).get(area)


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lng2 - lng1)
    a = math.sin(Δφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(Δλ/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
