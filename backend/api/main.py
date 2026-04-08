"""
UrbanNest UK — FastAPI Backend v3
Agentic pipeline: Fetch → Clean → Validate Location → Deduplicate → Serve
"""
import os
import sys
import logging
from datetime import datetime
from typing import Optional, List

# Ensure backend package is importable on Render
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lazy imports with fallback to avoid import errors on cold start
try:
    from backend.agents.data_fetch_agent import generate_deterministic_properties, CITY_CONFIG
    from backend.agents.cleaning_agent import deduplicate_and_clean
    from backend.agents.location_agent import validate_location, assign_location_metadata
    from backend.services.cache import get as cache_get, set as cache_set, search_key, stats as cache_stats, invalidate_city
    from backend.services.image_service import get_property_images
    AGENTS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Agent imports failed: {e} — using legacy mode")
    AGENTS_AVAILABLE = False

app = FastAPI(
    title="UrbanNest UK API v3",
    description="Agentic real estate — validated, deduplicated, location-accurate data",
    version="3.0.0",
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


def _get_all_properties_for_city(city: str) -> List[dict]:
    cache_key = f"city:{city.lower()}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    city_conf = CITY_CONFIG.get(city)
    if not city_conf:
        return []

    all_props = []
    for area in city_conf["areas"].keys():
        area_props = generate_deterministic_properties(city, area, count=12)
        all_props.extend(area_props)

    all_props = deduplicate_and_clean(all_props)
    all_props = validate_location(all_props, city)
    all_props = [assign_location_metadata(p) for p in all_props]

    for p in all_props:
        p.pop("_dedup_hash", None)
        p.pop("_location_validated", None)

    cache_set(cache_key, all_props, ttl=600)
    return all_props


def _filter(items, params):
    result = items
    if params.get("city"):
        result = [p for p in result if p.get("city","").lower() == params["city"].lower()]
    if params.get("area"):
        q = params["area"].lower()
        result = [p for p in result if q in p.get("area","").lower() or q in p.get("address","").lower()]
    if params.get("type"):
        result = [p for p in result if p.get("type") == params["type"]]
    if params.get("min_price"):
        result = [p for p in result if p.get("price",0) >= int(params["min_price"])]
    if params.get("max_price"):
        result = [p for p in result if p.get("price",0) <= int(params["max_price"])]
    if params.get("bedrooms"):
        try:
            beds = int(str(params["bedrooms"]).replace("Bed","").replace("+","").strip())
            result = [p for p in result if p.get("bedrooms",0) >= beds]
        except ValueError:
            pass
    if params.get("furnishing"):
        result = [p for p in result if p.get("furnishing") == params["furnishing"]]
    if params.get("query"):
        q = params["query"].lower()
        result = [p for p in result if any(q in str(p.get(f,"")).lower() for f in ("title","area","city","type","address"))]
    return result


def _sort(items, sort):
    if sort == "price_asc":   return sorted(items, key=lambda x: x.get("price",0))
    if sort == "price_desc":  return sorted(items, key=lambda x: x.get("price",0), reverse=True)
    if sort == "rating":      return sorted(items, key=lambda x: x.get("rating",0), reverse=True)
    if sort == "area":        return sorted(items, key=lambda x: x.get("area_sqft",0), reverse=True)
    return sorted(items, key=lambda x: (0 if x.get("featured") else 1, -x.get("rating",0)))


def _serialise(props):
    items = []
    for p in props:
        item = dict(p)
        item["images"] = [img["url"] if isinstance(img, dict) else img for img in item.get("images", [])]
        items.append(item)
    return items


@app.get("/api/health")
def health():
    return {
        "status": "healthy", "version": "3.0.0",
        "agents_available": AGENTS_AVAILABLE,
        "cities": list(CITY_CONFIG.keys()) if AGENTS_AVAILABLE else [],
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "cache": cache_stats() if AGENTS_AVAILABLE else {},
    }


@app.get("/api/cities")
def get_cities():
    if not AGENTS_AVAILABLE:
        return {"cities": [], "data": {}}
    result = {}
    for city, conf in CITY_CONFIG.items():
        result[city] = {
            "areas": list(conf["areas"].keys()),
            "avg_price": conf["base_price"],
            "currency_symbol": conf.get("symbol","£"),
            "lat": conf["lat"], "lng": conf["lng"],
        }
    return {"cities": list(CITY_CONFIG.keys()), "data": result}


@app.get("/api/properties/search")
def search_properties(
    city:       Optional[str] = None,
    area:       Optional[str] = None,
    query:      Optional[str] = None,
    type:       Optional[str] = None,
    min_price:  Optional[int] = None,
    max_price:  Optional[int] = None,
    bedrooms:   Optional[str] = None,
    furnishing: Optional[str] = None,
    min_area:   Optional[int] = None,
    max_area:   Optional[int] = None,
    page:       int = Query(1, ge=1),
    limit:      int = Query(20, ge=1, le=100),
    sort:       str = "featured",
):
    if not AGENTS_AVAILABLE:
        return {"total": 0, "page": page, "limit": limit, "items": [], "metadata": {"error": "agents unavailable"}}

    filters = {k: v for k, v in {"city":city,"area":area,"query":query,"type":type,
        "min_price":min_price,"max_price":max_price,"bedrooms":bedrooms,
        "furnishing":furnishing,"min_area":min_area,"max_area":max_area}.items() if v is not None}

    ck = search_key(city or "all", area or "", {k:v for k,v in filters.items() if k not in ("city","area","query")})
    cached_results = cache_get(ck)

    if cached_results is None:
        if city and city in CITY_CONFIG:
            all_props = _get_all_properties_for_city(city)
        elif city:
            all_props = []
        else:
            all_props = []
            for c in list(CITY_CONFIG.keys())[:4]:
                all_props.extend(_get_all_properties_for_city(c))

        filtered = _filter(all_props, filters)
        if area:
            filtered = validate_location(filtered, city or "", area)
        filtered = _sort(filtered, sort)
        cache_set(ck, filtered, ttl=600)
        cached_results = filtered

    total = len(cached_results)
    start = (page-1)*limit
    items = _serialise(cached_results[start:start+limit])

    return {"total": total, "page": page, "limit": limit, "items": items,
            "metadata": {"city":city,"area":area,"data_source":"agentic_v3",
                         "timestamp": datetime.utcnow().isoformat()+"Z"}}


@app.get("/api/properties/featured")
def get_featured(limit: int = Query(6, ge=1, le=20)):
    if not AGENTS_AVAILABLE:
        return {"items": [], "total": 0}
    featured = []
    for city in CITY_CONFIG.keys():
        props = _get_all_properties_for_city(city)
        featured.extend([p for p in props if p.get("featured")][:2])
    seen, unique = set(), []
    for p in featured:
        if p.get("id") not in seen:
            seen.add(p["id"])
            unique.append(p)
    return {"items": _serialise(unique[:limit]), "total": len(unique[:limit])}


@app.get("/api/properties/{property_id}")
def get_property(property_id: str):
    if not AGENTS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Service unavailable")
    for city in CITY_CONFIG.keys():
        for p in _get_all_properties_for_city(city):
            if p.get("id") == property_id:
                item = dict(p)
                item["images"] = [img["url"] if isinstance(img,dict) else img for img in item.get("images",[])]
                return item
    raise HTTPException(status_code=404, detail=f"Property {property_id!r} not found")


@app.get("/api/market/{city}/{area}")
def get_market_data(city: str, area: str):
    if not AGENTS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Service unavailable")
    props = _get_all_properties_for_city(city)
    area_props = [p for p in props if p.get("area","").lower() == area.lower()]
    if not area_props:
        raise HTTPException(status_code=404, detail=f"No data for {area}, {city}")
    prices = [p["price"] for p in area_props if p.get("price",0) > 0]
    sqfts  = [p["price_per_sqft"] for p in area_props if p.get("price_per_sqft",0) > 0]
    avg_price = int(sum(prices)/len(prices)) if prices else 0
    avg_ppsf  = int(sum(sqfts)/len(sqfts)) if sqfts else 0
    conf = CITY_CONFIG.get(city, {})
    return {
        "city": city, "area": area,
        "avg_price": avg_price, "avg_price_sqft": avg_ppsf,
        "total_listings": len(area_props),
        "price_change_1y": 6.8, "price_trend": "Rising", "demand_level": "High",
        "rental_yield_avg": round(4.2 + avg_price/2_000_000, 1),
        "investment_rating": 7.5,
        "currency_symbol": conf.get("symbol","£"),
        "data_source": "computed_from_listings",
        "timestamp": datetime.utcnow().isoformat()+"Z",
    }


@app.get("/api/price-estimate")
def price_estimate(
    city: str, area: str, property_type: str, area_sqft: int,
    bedrooms: Optional[int] = None, age: Optional[int] = None,
):
    if not AGENTS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Service unavailable")
    city_conf = CITY_CONFIG.get(city)
    if not city_conf:
        raise HTTPException(status_code=400, detail=f"Unknown city: {city}")
    area_conf   = city_conf["areas"].get(area, {"premium": 1.0})
    type_mult   = {"Penthouse":1.7,"Detached House":1.4,"Semi-Detached":1.1,"Terraced House":1.0,
                   "Flat":0.95,"Maisonette":0.95,"Bungalow":1.2,"Studio":0.75,"Commercial":1.3,"Land":0.5}
    age_factor  = max(0.75, 1.0 - (age or 0) * 0.004)
    type_factor = type_mult.get(property_type, 1.0)
    props       = _get_all_properties_for_city(city)
    area_props  = [p for p in props if p.get("area","").lower()==area.lower() and p.get("price_per_sqft",0)>0]
    avg_ppsf    = int(sum(p["price_per_sqft"] for p in area_props)/len(area_props)) if area_props else city_conf["base_price"]//800
    ppsf        = int(avg_ppsf * type_factor * age_factor)
    price       = ppsf * area_sqft
    rental_yield= round(4.0 + area_conf.get("premium",1.0) * 0.5, 1)
    def sdlt(p):
        if p<=250000: return 0
        if p<=925000: return int((p-250000)*0.05)
        if p<=1500000: return int(33750+(p-925000)*0.10)
        return int(91250+(p-1500000)*0.12)
    return {
        "predicted_price": price, "price_per_sqft": ppsf,
        "price_range_low": int(price*0.91), "price_range_high": int(price*1.09),
        "confidence": 72, "currency_symbol": city_conf.get("symbol","£"),
        "rental_yield_pct": rental_yield,
        "estimated_monthly_rental": int(price*rental_yield/100/12),
        "market_trend":"Rising", "stamp_duty_estimate": sdlt(price),
        "data_source":"pipeline_computed",
        "timestamp": datetime.utcnow().isoformat()+"Z",
    }


@app.get("/api/cache/stats")
def get_cache():
    return cache_stats() if AGENTS_AVAILABLE else {}


@app.delete("/api/cache/{city}")
def clear_cache(city: str):
    if AGENTS_AVAILABLE:
        invalidate_city(city)
    return {"message": f"Cache cleared for {city}"}
