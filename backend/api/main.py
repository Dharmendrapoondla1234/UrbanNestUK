"""
UrbanNest UK — FastAPI Backend
AI-powered real estate platform for the United Kingdom
"""
import os
import uuid
import json
import math
import random
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="UrbanNest UK API",
    description="AI-powered real estate platform — Properties, Price Prediction, Market Analysis",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")

# ── UK Property Data Store ───────────────────────────────────
PROPERTY_DATA = []

CITIES_DATA = {
    "London": {
        "areas": ["Canary Wharf", "Shoreditch", "Kensington", "Chelsea", "Brixton",
                  "Hackney", "Islington", "Clapham", "Notting Hill", "Greenwich"],
        "base_price_sqft": 850,   # £/sqft
        "avg_price": 650000,
        "growth_rate": 0.05,
        "lat": 51.5074, "lng": -0.1278,
        "currency": "GBP",
    },
    "Manchester": {
        "areas": ["Ancoats", "Didsbury", "Salford Quays", "Chorlton", "Deansgate",
                  "Northern Quarter", "Stretford", "Trafford", "Withington", "Hulme"],
        "base_price_sqft": 280,
        "avg_price": 230000,
        "growth_rate": 0.08,
        "lat": 53.4808, "lng": -2.2426,
        "currency": "GBP",
    },
    "Birmingham": {
        "areas": ["Edgbaston", "Moseley", "Digbeth", "Harborne", "Jewellery Quarter",
                  "Kings Heath", "Solihull", "Sutton Coldfield", "Erdington", "Selly Oak"],
        "base_price_sqft": 240,
        "avg_price": 210000,
        "growth_rate": 0.07,
        "lat": 52.4862, "lng": -1.8904,
        "currency": "GBP",
    },
    "Leeds": {
        "areas": ["Chapel Allerton", "Headingley", "Hyde Park", "Roundhay", "Horsforth",
                  "Meanwood", "Moortown", "Pudsey", "Armley", "Beeston"],
        "base_price_sqft": 220,
        "avg_price": 195000,
        "growth_rate": 0.09,
        "lat": 53.8008, "lng": -1.5491,
        "currency": "GBP",
    },
    "Edinburgh": {
        "areas": ["New Town", "Old Town", "Leith", "Morningside", "Stockbridge",
                  "Bruntsfield", "Marchmont", "Portobello", "Newington", "Corstorphine"],
        "base_price_sqft": 380,
        "avg_price": 320000,
        "growth_rate": 0.07,
        "lat": 55.9533, "lng": -3.1883,
        "currency": "GBP",
    },
    "Bristol": {
        "areas": ["Clifton", "Redland", "Stokes Croft", "Harbourside", "Bedminster",
                  "Cotham", "Southville", "Bishopston", "Horfield", "Fishponds"],
        "base_price_sqft": 340,
        "avg_price": 290000,
        "growth_rate": 0.07,
        "lat": 51.4545, "lng": -2.5879,
        "currency": "GBP",
    },
    "Liverpool": {
        "areas": ["Baltic Triangle", "Anfield", "Allerton", "Wavertree", "Woolton",
                  "Sefton Park", "Aigburth", "Mossley Hill", "West Derby", "Crosby"],
        "base_price_sqft": 195,
        "avg_price": 165000,
        "growth_rate": 0.09,
        "lat": 53.4084, "lng": -2.9916,
        "currency": "GBP",
    },
    "Oxford": {
        "areas": ["Jericho", "Cowley", "Summertown", "Headington", "Botley",
                  "Iffley", "Rose Hill", "Marston", "Cutteslowe", "Wolvercote"],
        "base_price_sqft": 480,
        "avg_price": 420000,
        "growth_rate": 0.05,
        "lat": 51.7520, "lng": -1.2577,
        "currency": "GBP",
    },
}

PROPERTY_TYPES = ['Flat', 'Terraced House', 'Semi-Detached', 'Detached House',
                  'Bungalow', 'Maisonette', 'Studio', 'Penthouse', 'Commercial', 'Land']
FURNISH_OPTIONS = ['Unfurnished', 'Part Furnished', 'Fully Furnished']
AVAILABILITY = ['Available Now', 'Under Offer', 'Coming Soon', 'New Build']
ESTATE_AGENTS = ['Foxtons', 'Savills', 'Knight Frank', 'Purplebricks', 'Rightmove Listed',
                 'Zoopla Partner', 'Your Move', 'Connells', 'Countrywide', 'Hunters']

REAL_IMAGES = [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80",
    "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=600&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80",
]


def generate_properties():
    """Generate realistic UK property dataset"""
    props = []
    idx = 1
    for city, city_data in CITIES_DATA.items():
        for area in city_data["areas"]:
            for ptype in random.sample(PROPERTY_TYPES, k=min(4, len(PROPERTY_TYPES))):
                bedrooms = 0 if ptype in ('Commercial', 'Land', 'Studio') else random.choice([1, 2, 2, 3, 3, 4])
                if ptype == 'Studio':
                    bedrooms = 1

                sqft = {
                    'Studio':        random.randint(250, 450),
                    'Flat':          random.randint(400, 1200),
                    'Maisonette':    random.randint(600, 1400),
                    'Terraced House':random.randint(700, 1800),
                    'Semi-Detached': random.randint(800, 2000),
                    'Detached House':random.randint(1200, 4000),
                    'Bungalow':      random.randint(700, 1600),
                    'Penthouse':     random.randint(900, 3000),
                    'Commercial':    random.randint(300, 3000),
                    'Land':          random.randint(1000, 10000),
                }.get(ptype, random.randint(600, 2000))

                area_modifier = 1 + (hash(area) % 40 - 20) / 100
                price_per_sqft = city_data["base_price_sqft"] * area_modifier * (1 + random.uniform(-0.1, 0.1))
                price = int(sqft * price_per_sqft)

                loc_lat = city_data["lat"] + (random.random() - 0.5) * 0.15
                loc_lng = city_data["lng"] + (random.random() - 0.5) * 0.15

                img_start = (idx - 1) % len(REAL_IMAGES)
                images = [REAL_IMAGES[img_start], REAL_IMAGES[(img_start + 1) % len(REAL_IMAGES)]]

                tenure = random.choice(['Freehold', 'Freehold', 'Leasehold', 'Leasehold', 'Shared Ownership'])
                epc = random.choice(['A', 'B', 'B', 'C', 'C', 'C', 'D', 'D', 'E'])

                prop = {
                    "id": f"prop_{idx:04d}",
                    "title": f"{f'{bedrooms} Bed ' if bedrooms else ''}{ptype} in {area}",
                    "type": ptype,
                    "city": city,
                    "area": area,
                    "address": f"{area}, {city}, UK",
                    "price": price,
                    "price_per_sqft": int(price_per_sqft),
                    "area_sqft": sqft,
                    "bedrooms": bedrooms,
                    "bathrooms": max(1, bedrooms) if bedrooms else 1,
                    "furnishing": random.choice(FURNISH_OPTIONS),
                    "availability": random.choice(AVAILABILITY),
                    "floor": f"Floor {random.randint(1,15)}" if ptype in ('Flat', 'Penthouse', 'Studio', 'Maisonette') else None,
                    "age": random.choice([0, 0, 1, 5, 10, 20, 30, 50]),
                    "images": images,
                    "lat": loc_lat,
                    "lng": loc_lng,
                    "rating": round(3.0 + random.random() * 2, 1),
                    "locality_rating": round(3.0 + random.random() * 2, 1),
                    "safety_rating": round(3.0 + random.random() * 2, 1),
                    "lifestyle_rating": round(3.0 + random.random() * 2, 1),
                    "tenure": tenure,
                    "epc_rating": epc,
                    "council_tax_band": random.choice(['A', 'B', 'C', 'D', 'E', 'F']),
                    "nearest_station": f"{area} Station",
                    "station_distance": f"{round(random.uniform(0.1, 1.5), 1)} miles",
                    "broadband_speed": f"{random.choice([100, 200, 500, 900])} Mbps",
                    "flood_risk": random.choice(["Very Low", "Low", "Medium", "High"]),
                    "neighborhood_culture": random.choice(["Vibrant", "Quiet residential", "Mixed", "Upmarket", "Family-friendly", "Student area"]),
                    "amenities": random.sample(["Parking", "Garden", "Garage", "Balcony", "Gym", "Concierge", "Storage", "Lift", "Smart home"], k=random.randint(2, 5)),
                    "estate_agent": random.choice(ESTATE_AGENTS),
                    "rightmove_id": f"RM{100000 + idx}",
                    "verified": random.random() > 0.2,
                    "featured": random.random() > 0.85,
                    "listed_at": datetime.utcnow().isoformat() + "Z",
                    "has_virtual_tour": random.random() > 0.6,
                    "monthly_service_charge": random.randint(100, 500) if ptype in ('Flat', 'Maisonette', 'Penthouse') else None,
                }
                props.append(prop)
                idx += 1
    return props


# Generate on startup
PROPERTY_DATA = generate_properties()
logger.info(f"Generated {len(PROPERTY_DATA)} UK properties")


# ── Helpers ──────────────────────────────────────────────────
def filter_properties(items, params):
    result = items
    if params.get("city"):
        result = [p for p in result if p["city"].lower() == params["city"].lower()]
    if params.get("area"):
        result = [p for p in result if params["area"].lower() in p["area"].lower()]
    if params.get("type"):
        result = [p for p in result if p["type"] == params["type"]]
    if params.get("min_price"):
        result = [p for p in result if p["price"] >= int(params["min_price"])]
    if params.get("max_price"):
        result = [p for p in result if p["price"] <= int(params["max_price"])]
    if params.get("bedrooms"):
        try:
            bhk = int(str(params["bedrooms"]).replace(" Bed", "").replace(" BHK", "").replace(" RK", ""))
            result = [p for p in result if p["bedrooms"] == bhk]
        except:
            pass
    if params.get("furnishing"):
        result = [p for p in result if p["furnishing"] == params["furnishing"]]
    if params.get("availability"):
        result = [p for p in result if p["availability"] == params["availability"]]
    if params.get("min_area"):
        result = [p for p in result if p["area_sqft"] >= int(params["min_area"])]
    if params.get("max_area"):
        result = [p for p in result if p["area_sqft"] <= int(params["max_area"])]
    if params.get("query"):
        q = params["query"].lower()
        result = [p for p in result if q in p["title"].lower() or q in p["area"].lower() or q in p["city"].lower()]
    return result


# ── Routes ───────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "urbannest-uk", "version": "2.0.0",
            "timestamp": datetime.utcnow().isoformat() + "Z", "properties_count": len(PROPERTY_DATA)}


@app.get("/api/properties/search")
def search_properties(
    city: Optional[str] = None,
    area: Optional[str] = None,
    query: Optional[str] = None,
    type: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    bedrooms: Optional[str] = None,
    furnishing: Optional[str] = None,
    availability: Optional[str] = None,
    min_area: Optional[int] = None,
    max_area: Optional[int] = None,
    page: int = 1,
    limit: int = 20,
    sort: str = "featured"
):
    params = {k: v for k, v in {
        "city": city, "area": area, "query": query, "type": type,
        "min_price": min_price, "max_price": max_price, "bedrooms": bedrooms,
        "furnishing": furnishing, "availability": availability,
        "min_area": min_area, "max_area": max_area,
    }.items() if v is not None}
    items = filter_properties(PROPERTY_DATA, params)

    if sort == "price_asc":
        items.sort(key=lambda x: x["price"])
    elif sort == "price_desc":
        items.sort(key=lambda x: x["price"], reverse=True)
    elif sort == "rating":
        items.sort(key=lambda x: x["rating"], reverse=True)
    elif sort == "area":
        items.sort(key=lambda x: x["area_sqft"], reverse=True)
    else:
        items.sort(key=lambda x: (0 if x.get("featured") else 1, -x["rating"]))

    total = len(items)
    start = (page - 1) * limit
    return {"total": total, "page": page, "limit": limit, "items": items[start:start + limit]}


@app.get("/api/properties/featured")
def get_featured(limit: int = 6):
    featured = [p for p in PROPERTY_DATA if p.get("featured")]
    return {"items": featured[:limit], "total": len(featured)}


@app.get("/api/properties/{property_id}")
def get_property(property_id: str):
    prop = next((p for p in PROPERTY_DATA if p["id"] == property_id), None)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


@app.get("/api/cities")
def get_cities():
    return {
        "cities": list(CITIES_DATA.keys()),
        "data": {city: {"areas": data["areas"], "avg_price": data["avg_price"]} for city, data in CITIES_DATA.items()}
    }


@app.get("/api/market/{city}/{area}")
async def get_market_data(city: str, area: str):
    """Get market data for a specific UK area"""
    city_data = CITIES_DATA.get(city, CITIES_DATA["London"])
    base_price = city_data["base_price_sqft"]
    area_modifier = 1 + (hash(area) % 40 - 20) / 100
    avg_price_sqft = base_price * area_modifier

    props_in_area = [p for p in PROPERTY_DATA if p["city"] == city and p["area"] == area]
    if props_in_area:
        avg_price_sqft = sum(p["price_per_sqft"] for p in props_in_area) / len(props_in_area)

    growth = city_data["growth_rate"]
    avg_price = city_data["avg_price"] * area_modifier

    return {
        "city": city,
        "area": area,
        "overview": f"{area} in {city} is a {'high-growth' if growth > 0.07 else 'steady'} market. Average prices sit around £{round(avg_price_sqft):,}/sqft with {'strong' if growth > 0.07 else 'moderate'} buyer demand and good long-term prospects.",
        "avg_price_sqft": round(avg_price_sqft),
        "avg_price": round(avg_price),
        "price_change_1y": round(growth * 100, 1),
        "price_change_6m": round(growth * 50, 1),
        "price_trend": "Rising" if growth > 0.06 else "Stable",
        "demand_level": "High" if growth > 0.07 else "Moderate",
        "demand_trend": "Increasing" if growth > 0.07 else "Stable",
        "supply_level": "Low" if growth > 0.07 else "Moderate",
        "inventory_months": round(4 - growth * 20, 1),
        "total_listings": len(props_in_area),
        "investment_rating": round(3.5 + growth * 15, 1),
        "growth_potential": "High" if growth > 0.07 else "Moderate",
        "rental_yield_avg": round(4.0 + random.uniform(0.5, 2.0), 1),
        "avg_rental_pcm": round(avg_price * 0.004),
        "key_drivers": [
            {"driver": "Transport connectivity", "impact": "Positive", "strength": "High"},
            {"driver": "Employment growth", "impact": "Positive", "strength": "Moderate"},
            {"driver": "School catchment quality", "impact": "Positive", "strength": "Medium"},
        ],
        "risks": [
            {"risk": "Stamp duty costs", "severity": "Low"},
            {"risk": "Interest rate sensitivity", "severity": "Moderate"},
        ],
        "upcoming_projects": [
            {"name": "Rail/Transport improvement", "impact": "High", "completion": "2026"},
            {"name": "Local regeneration scheme", "impact": "Moderate", "completion": "2027"},
        ],
        "micro_market_insights": f"Rule-based estimate for {area}, {city}. Enable Gemini API for AI-powered insights.",
    }


@app.get("/api/price-estimate")
def estimate_price(
    city: str,
    area: str,
    property_type: str,
    area_sqft: int,
    bedrooms: Optional[int] = None,
    age: Optional[int] = None,
):
    """Rule-based price estimation for UK properties"""
    city_data = CITIES_DATA.get(city, CITIES_DATA["London"])
    base = city_data["base_price_sqft"]
    area_modifier = 1 + (hash(area) % 40 - 20) / 100
    type_modifier = {
        "Penthouse": 1.6, "Detached House": 1.4, "Semi-Detached": 1.1,
        "Terraced House": 1.0, "Flat": 0.95, "Maisonette": 0.95,
        "Bungalow": 1.2, "Studio": 0.75, "Commercial": 1.3, "Land": 0.6,
    }.get(property_type, 1.0)
    age_modifier = max(0.75, 1.0 - (age or 0) * 0.004)
    price_per_sqft = base * area_modifier * type_modifier * age_modifier
    price = int(price_per_sqft * area_sqft)
    rental_yield = round(4.0 + random.uniform(0.5, 2.0), 1)

    return {
        "predicted_price": price,
        "price_per_sqft": int(price_per_sqft),
        "price_range_low": int(price * 0.92),
        "price_range_high": int(price * 1.08),
        "confidence": 74,
        "market_trend": "Rising" if city_data["growth_rate"] > 0.06 else "Stable",
        "trend_pct": round(city_data["growth_rate"] * 100, 1),
        "investment_potential": "High" if city_data["growth_rate"] > 0.07 else "Moderate",
        "rental_yield_pct": rental_yield,
        "estimated_monthly_rental": round(price * rental_yield / 100 / 12),
        "breakeven_years": round(100 / rental_yield, 1),
        "stamp_duty_estimate": _calc_stamp_duty(price),
        "key_factors": [
            {"factor": f"{area} location premium", "impact": "positive", "weight": "high"},
            {"factor": f"{property_type} property type", "impact": "positive", "weight": "medium"},
            {"factor": "Building age" if (age and age > 20) else "Modern construction", "impact": "negative" if (age and age > 20) else "positive", "weight": "low"},
        ],
        "comparable_properties": [
            {"name": f"Similar {property_type} nearby", "price": int(price * 0.95), "area": area_sqft},
            {"name": f"Premium {property_type} in {area}", "price": int(price * 1.07), "area": int(area_sqft * 1.05)},
        ],
        "note": "Rule-based estimate. Enable Gemini API for AI-powered prediction.",
    }


def _calc_stamp_duty(price: int) -> int:
    """Calculate UK Stamp Duty Land Tax (SDLT) for residential purchases"""
    if price <= 250000:
        return 0
    elif price <= 925000:
        return int((price - 250000) * 0.05)
    elif price <= 1500000:
        return int(33750 + (price - 925000) * 0.10)
    else:
        return int(91250 + (price - 1500000) * 0.12)
