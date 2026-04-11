"""
UrbanNest AI — FastAPI Backend v4
Multi-country AI-powered real estate platform.
Entry point: uvicorn backend.api.main:app --host 0.0.0.0 --port 8000
"""
import os, sys, logging
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

# ── Path bootstrap (must be first) ────────────────────────────────────
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_project_dir = os.path.dirname(_backend_dir)
for _p in [_backend_dir, _project_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI, HTTPException, Query, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Internal imports (after path bootstrap) ───────────────────────────
from db.database import engine, SessionLocal, Base, get_db
from db.models import Property, User, Favorite, Alert, AlertMatch
from ai.query_parser import parse_query, filters_to_sql_summary
from ai.rag_pipeline import rag_search, find_similar
from ai.gemini_client import call_gemini, GeminiError
from services.country_config import (
    COUNTRY_CONFIG, fmt_price, get_config, SUPPORTED_COUNTRIES
)

# ── WebSocket manager (shared module, avoids circular imports) ────────
from api.websocket_manager import ws_manager


# ── App lifecycle ─────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import models so Base.metadata has them registered
    import db.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    yield

app = FastAPI(
    title="UrbanNest AI Platform API v4",
    description="Multi-country AI real estate — India & UK",
    version="4.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════
# HEALTH & CONFIG
# ══════════════════════════════════════════════════════════════════════

@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    try:
        prop_count = db.query(Property).count()
    except Exception:
        prop_count = -1
    return {
        "status":             "healthy",
        "version":            "4.0.0",
        "timestamp":          datetime.utcnow().isoformat() + "Z",
        "supported_countries": SUPPORTED_COUNTRIES,
        "property_count":     prop_count,
        "gemini_model":       "gemini-2.0-flash (v1beta)",
    }


@app.get("/api/countries")
def get_countries():
    return {
        country: {
            "currency":     cfg["currency"],
            "symbol":       cfg["symbol"],
            "cities":       cfg["cities"],
            "property_types": cfg["property_types"],
            "default_city": cfg.get("default_city"),
            "map_center":   cfg.get("map_center"),
        }
        for country, cfg in COUNTRY_CONFIG.items()
    }


# ══════════════════════════════════════════════════════════════════════
# SEARCH
# ══════════════════════════════════════════════════════════════════════

@app.get("/api/search/nl")
async def natural_language_search(
    q:       str            = Query(..., description="NL query e.g. '2BHK under 50 lakhs Bangalore'"),
    country: str            = Query("uk", enum=SUPPORTED_COUNTRIES),
    city:    Optional[str]  = Query(None),
    rag:     bool           = Query(False, description="Generate AI narrative response"),
    db:      Session        = Depends(get_db),
):
    filters = await parse_query(q, country=country, city=city)
    result  = await rag_search(q, filters, db, k=24, generate_response=rag)
    return {
        "query":          q,
        "filters_applied": filters,
        "filter_summary": filters_to_sql_summary(filters),
        **result,
    }


@app.get("/api/search/filter")
def filter_search(
    country:       str            = Query("uk", enum=SUPPORTED_COUNTRIES),
    city:          Optional[str]  = None,
    area:          Optional[str]  = None,
    property_type: Optional[str]  = None,
    min_price:     Optional[int]  = None,
    max_price:     Optional[int]  = None,
    bedrooms:      Optional[int]  = None,
    bathrooms:     Optional[int]  = None,
    furnishing:    Optional[str]  = None,
    amenities:     Optional[str]  = None,
    featured_only: bool           = False,
    sort:          str            = Query("featured", enum=["featured", "price_asc", "price_desc", "newest"]),
    page:          int            = Query(1, ge=1),
    limit:         int            = Query(20, ge=1, le=100),
    db:            Session        = Depends(get_db),
):
    q = db.query(Property).filter(Property.country == country)

    if city:          q = q.filter(Property.city.ilike(f"%{city}%"))
    if area:          q = q.filter(Property.area.ilike(f"%{area}%"))
    if property_type: q = q.filter(Property.property_type.ilike(f"%{property_type}%"))
    if bedrooms:      q = q.filter(Property.bedrooms >= bedrooms)
    if bathrooms:     q = q.filter(Property.bathrooms >= bathrooms)
    if furnishing:    q = q.filter(Property.furnishing.ilike(f"%{furnishing}%"))
    if featured_only: q = q.filter(Property.featured == True)  # noqa: E712
    if min_price:     q = q.filter(Property.price >= min_price * 100)
    if max_price:     q = q.filter(Property.price <= max_price * 100)

    if amenities:
        for am in amenities.split(","):
            am = am.strip()
            if am:
                q = q.filter(Property.amenities.contains([am]))

    if sort == "price_asc":    q = q.order_by(Property.price.asc())
    elif sort == "price_desc": q = q.order_by(Property.price.desc())
    elif sort == "newest":     q = q.order_by(Property.listed_at.desc())
    else:                      q = q.order_by(Property.featured.desc(), Property.rating.desc().nullslast())

    total = q.count()
    items = q.offset((page - 1) * limit).limit(limit).all()
    return {"total": total, "page": page, "limit": limit, "items": [p.to_dict() for p in items]}


@app.get("/api/properties/featured")
def get_featured(
    country: str     = Query("uk", enum=SUPPORTED_COUNTRIES),
    limit:   int     = Query(8, ge=1, le=20),
    db:      Session = Depends(get_db),
):
    items = (
        db.query(Property)
        .filter(Property.country == country, Property.featured == True)  # noqa: E712
        .order_by(Property.rating.desc().nullslast())
        .limit(limit)
        .all()
    )
    return {"items": [p.to_dict() for p in items], "total": len(items)}


@app.get("/api/properties/{property_id}")
def get_property(property_id: str, db: Session = Depends(get_db)):
    p = db.query(Property).filter(Property.id == property_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=f"Property {property_id!r} not found")
    return p.to_dict()


@app.get("/api/properties/{property_id}/similar")
async def get_similar(property_id: str, db: Session = Depends(get_db)):
    similar = await find_similar(property_id, db, k=8)
    return {"items": similar, "total": len(similar)}


# ══════════════════════════════════════════════════════════════════════
# FAVORITES
# ══════════════════════════════════════════════════════════════════════

@app.post("/api/favorites/{property_id}")
def save_favorite(
    property_id: str,
    user_id:     str            = Query(...),
    notes:       Optional[str]  = None,
    db:          Session        = Depends(get_db),
):
    if not db.query(Property).filter(Property.id == property_id).first():
        raise HTTPException(status_code=404, detail="Property not found")

    existing = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.property_id == property_id,
    ).first()
    if existing:
        return {"message": "Already saved", "saved": True}

    db.add(Favorite(user_id=user_id, property_id=property_id, notes=notes))
    db.commit()
    return {"message": "Saved", "saved": True}


@app.delete("/api/favorites/{property_id}")
def remove_favorite(
    property_id: str,
    user_id:     str     = Query(...),
    db:          Session = Depends(get_db),
):
    fav = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.property_id == property_id,
    ).first()
    if fav:
        db.delete(fav)
        db.commit()
    return {"message": "Removed", "saved": False}


@app.get("/api/favorites")
def get_favorites(user_id: str = Query(...), db: Session = Depends(get_db)):
    favs = (
        db.query(Favorite)
        .filter(Favorite.user_id == user_id)
        .order_by(Favorite.saved_at.desc())
        .all()
    )
    return {
        "items": [
            {**f.property.to_dict(), "saved_at": f.saved_at.isoformat(), "notes": f.notes}
            for f in favs if f.property
        ],
        "total": len(favs),
    }


# ══════════════════════════════════════════════════════════════════════
# ALERTS
# ══════════════════════════════════════════════════════════════════════

@app.post("/api/alerts")
async def create_alert(
    query:   str            = Query(...),
    country: str            = Query("uk"),
    city:    Optional[str]  = None,
    user_id: str            = Query(...),
    db:      Session        = Depends(get_db),
):
    filters = await parse_query(query, country=country, city=city)
    alert = Alert(
        user_id=user_id,
        query_text=query,
        filters=filters,
        country=country,
        city=city or filters.get("city"),
        is_active=True,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {"alert_id": alert.id, "query": query, "filters": filters}


@app.get("/api/alerts")
def get_alerts(user_id: str = Query(...), db: Session = Depends(get_db)):
    alerts = db.query(Alert).filter(Alert.user_id == user_id).all()
    return {
        "alerts": [
            {"id": a.id, "query": a.query_text, "is_active": a.is_active,
             "match_count": a.match_count, "created_at": a.created_at.isoformat() if a.created_at else None}
            for a in alerts
        ]
    }


@app.delete("/api/alerts/{alert_id}")
def delete_alert(alert_id: str, user_id: str = Query(...), db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user_id).first()
    if a:
        db.delete(a)
        db.commit()
    return {"deleted": True}


# ══════════════════════════════════════════════════════════════════════
# AI FEATURES
# ══════════════════════════════════════════════════════════════════════

@app.post("/api/ai/advisor")
async def ai_advisor(
    message: str            = Query(...),
    country: str            = Query("uk"),
    city:    Optional[str]  = None,
    history: Optional[str]  = None,
):
    import json as _json
    ctx = ""
    if history:
        try:
            msgs = _json.loads(history)
            ctx  = "\n".join(
                f"{'USER' if m['role']=='user' else 'ADVISOR'}: {m['text']}"
                for m in msgs[-6:]
            )
        except Exception:
            pass

    prompt = f"""You are an expert property advisor for {country.upper()} real estate.
{f'City focus: {city}.' if city else ''} Date: {datetime.utcnow().strftime('%B %Y')}.

{ctx}

USER: {message}

ADVISOR: Give expert, specific advice. For UK mention SDLT, EPC, freehold/leasehold.
For India mention RERA, stamp duty, carpet vs built-up area. 2-4 paragraphs, no bullet lists."""

    try:
        response = await call_gemini(prompt, max_tokens=800)
        return {"response": response}
    except GeminiError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/api/ai/valuation")
async def ai_valuation(
    country:       str            = Query("uk"),
    city:          str            = Query(...),
    area:          Optional[str]  = None,
    property_type: str            = Query("Flat"),
    size_sqft:     Optional[int]  = None,
    bedrooms:      Optional[int]  = None,
    condition:     str            = Query("Good"),
):
    cfg = get_config(country)
    prompt = f"""Property valuation for {country.upper()}.
Location: {area or city}, {city} | Type: {property_type}
Size: {size_sqft or 'unknown'} sqft | Beds: {bedrooms or 'N/A'} | Condition: {condition}

Return ONLY valid JSON, no markdown:
{{"estimated_price":0,"currency":"{cfg['currency']}","price_range_low":0,"price_range_high":0,
"price_per_sqft":0,"confidence_pct":75,"estimated_monthly_rent":0,"gross_rental_yield":0.0,
"annual_growth_pct":0.0,"investment_rating":"Good","market_sentiment":"Stable",
"key_drivers":["driver1"],"risk_factors":["risk1"],"ai_analysis":"analysis here."}}"""

    try:
        result = await call_gemini(prompt, json_mode=True, max_tokens=1024)
        if isinstance(result, dict):
            ep = result.get("estimated_price", 0)
            result["price_display"] = fmt_price(ep * 100, country) if ep else "—"
        return result
    except GeminiError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/ai/market")
async def market_intelligence(
    country: str            = Query("uk"),
    city:    str            = Query(...),
    area:    Optional[str]  = None,
    profile: str            = Query("general"),
):
    cfg = get_config(country)
    prompt = f"""Real estate market analysis for {country.upper()}.
Location: {area or 'city-wide'}, {city} | Profile: {profile} | Year: {datetime.utcnow().year}

Return ONLY valid JSON, no markdown:
{{"market_summary":"overview","avg_price":0,"currency_symbol":"{cfg['symbol']}",
"price_change_1y_pct":0.0,"price_change_5y_pct":0.0,"avg_rental_yield":0.0,
"demand_level":"Moderate","supply_level":"Moderate","market_phase":"Stable",
"investment_score":7.0,"top_growth_areas":[{{"area":"name","growth_pct":0.0}}],
"key_drivers":[{{"driver":"name","impact":"Positive"}}],
"risks":[{{"risk":"name","severity":"Low"}}],
"buyer_advice":"advice","investor_verdict":"verdict"}}"""

    try:
        return await call_gemini(prompt, json_mode=True, max_tokens=1024)
    except GeminiError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ══════════════════════════════════════════════════════════════════════
# WEBSOCKET — real-time alerts
# ══════════════════════════════════════════════════════════════════════

@app.websocket("/ws/alerts/{user_id}")
async def websocket_alerts(websocket: WebSocket, user_id: str):
    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)


# ══════════════════════════════════════════════════════════════════════
# ADMIN — data ingest & index rebuild
# ══════════════════════════════════════════════════════════════════════

@app.post("/api/admin/ingest")
async def trigger_ingest(
    country:   str            = Query("uk", enum=SUPPORTED_COUNTRIES),
    city:      Optional[str]  = None,
    admin_key: str            = Query(...),
    db:        Session        = Depends(get_db),
):
    if admin_key != os.environ.get("ADMIN_KEY", ""):
        raise HTTPException(status_code=403, detail="Invalid admin key")

    from agents.scraper_agent import scrape_all_india, scrape_all_uk
    from agents.cleaning_agent import ingest_listings

    cities   = [city] if city else None
    listings = await (scrape_all_india(cities) if country == "india" else scrape_all_uk(cities))
    stats    = ingest_listings(listings, db)
    return {"ingested": stats, "country": country}


@app.post("/api/admin/rebuild-index")
def rebuild_faiss_index(admin_key: str = Query(...), db: Session = Depends(get_db)):
    if admin_key != os.environ.get("ADMIN_KEY", ""):
        raise HTTPException(status_code=403, detail="Invalid admin key")

    from ai.rag_pipeline import rebuild_index
    return {"status": "rebuilt", **rebuild_index(db)}
