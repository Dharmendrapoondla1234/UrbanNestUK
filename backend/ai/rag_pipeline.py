"""
UrbanNest AI — RAG Pipeline
Retrieval-Augmented Generation using FAISS + Gemini.

Flow:
  1. Embed user query with sentence-transformers
  2. FAISS approximate nearest-neighbor search → top-K candidate property IDs
  3. PostgreSQL filter on candidates using structured filters
  4. Build context string from top properties
  5. Gemini generates a natural language response with recommendations
"""
import os as _os, sys as _sys
_backend_dir = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
if _backend_dir not in _sys.path:
    _sys.path.insert(0, _backend_dir)

import os
import logging
import json
import asyncio
from pathlib import Path
from typing import Optional

import numpy as np
from sqlalchemy.orm import Session

from db.models import Property
from ai.gemini_client import call_gemini
from services.country_config import fmt_price

logger = logging.getLogger(__name__)

FAISS_INDEX_PATH = Path(os.environ.get("FAISS_INDEX_PATH", "/data/faiss.index"))
FAISS_IDMAP_PATH = FAISS_INDEX_PATH.with_suffix(".ids.json")

# ── Lazy-load heavy ML deps ───────────────────────────────────────────
_model = None
_index = None
_id_map: list[str] = []          # FAISS row index → property UUID


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Sentence transformer loaded: all-MiniLM-L6-v2")
    return _model


def _get_index():
    global _index, _id_map
    if _index is None and FAISS_INDEX_PATH.exists():
        import faiss
        _index = faiss.read_index(str(FAISS_INDEX_PATH))
        _id_map = json.loads(FAISS_IDMAP_PATH.read_text())
        logger.info(f"FAISS index loaded: {_index.ntotal} vectors")
    return _index


def build_property_text(p) -> str:
    """Build a rich text representation of a property for embedding."""
    parts = [
        p.title or "",
        p.property_type or "",
        p.city or "",
        p.area or "",
        p.country or "",
        p.price_display or "",
        f"{p.bedrooms} bedroom" if p.bedrooms else "",
        f"{p.area_sqft} sqft" if p.area_sqft else "",
        p.furnishing or "",
        p.tenure or "",
    ]
    if p.amenities:
        parts.extend(p.amenities if isinstance(p.amenities, list) else [])
    if p.description:
        parts.append(p.description[:200])
    return " ".join(filter(None, parts))


def rebuild_index(db: Session) -> dict:
    """
    Rebuild the FAISS index from all verified properties.
    Runs nightly via Celery. Returns stats dict.
    """
    global _index, _id_map

    import faiss

    logger.info("Rebuilding FAISS index...")
    props = db.query(Property).filter(Property.verified == True).all()

    if not props:
        logger.warning("No verified properties to index")
        return {"indexed": 0, "error": "no properties"}

    texts = [build_property_text(p) for p in props]
    model = _get_model()
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=True)
    embeddings = embeddings.astype(np.float32)

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)    # inner product on normalized = cosine similarity
    index.add(embeddings)

    FAISS_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(FAISS_INDEX_PATH))

    id_map = [str(p.id) for p in props]
    FAISS_IDMAP_PATH.write_text(json.dumps(id_map))

    # Update in-memory references
    _index = index
    _id_map = id_map

    logger.info(f"FAISS index rebuilt: {index.ntotal} vectors, dim={dim}")
    return {"indexed": index.ntotal, "dim": dim}


def semantic_search(query: str, k: int = 60) -> list[str]:
    """Return top-K property UUIDs from FAISS semantic search."""
    idx = _get_index()
    if idx is None:
        logger.warning("FAISS index not available — falling back to DB-only search")
        return []

    model = _get_model()
    q_vec = model.encode([query], normalize_embeddings=True).astype(np.float32)
    scores, faiss_ids = idx.search(q_vec, k)

    results = []
    for score, fid in zip(scores[0], faiss_ids[0]):
        if fid >= 0 and fid < len(_id_map) and score > 0.1:
            results.append(_id_map[fid])
    return results


def apply_db_filters(
    db: Session,
    candidate_ids: list[str],
    filters: dict,
    limit: int = 20,
) -> list[Property]:
    """Apply structured filters to candidate properties from FAISS."""
    q = db.query(Property)

    # If FAISS gave candidates, restrict to those; otherwise search all
    if candidate_ids:
        q = q.filter(Property.id.in_(candidate_ids))

    # Apply every filter dynamically
    if filters.get("country"):
        q = q.filter(Property.country == filters["country"].lower())
    if filters.get("city"):
        q = q.filter(Property.city.ilike(f"%{filters['city']}%"))
    if filters.get("area"):
        q = q.filter(Property.area.ilike(f"%{filters['area']}%"))
    if filters.get("property_type"):
        q = q.filter(Property.property_type.ilike(f"%{filters['property_type']}%"))
    if filters.get("min_price"):
        q = q.filter(Property.price >= filters["min_price"])
    if filters.get("max_price"):
        q = q.filter(Property.price <= filters["max_price"])
    if filters.get("bedrooms"):
        q = q.filter(Property.bedrooms >= filters["bedrooms"])
    if filters.get("bathrooms"):
        q = q.filter(Property.bathrooms >= filters["bathrooms"])
    if filters.get("furnishing"):
        q = q.filter(Property.furnishing.ilike(f"%{filters['furnishing']}%"))
    if filters.get("area_keywords"):
        from sqlalchemy import or_
        kw_filters = [Property.area.ilike(f"%{kw}%") for kw in filters["area_keywords"]]
        q = q.filter(or_(*kw_filters))
    if filters.get("amenities"):
        for amenity in filters["amenities"]:
            q = q.filter(Property.amenities.contains([amenity]))
    if filters.get("min_sqft"):
        q = q.filter(Property.area_sqft >= filters["min_sqft"])
    if filters.get("max_sqft"):
        q = q.filter(Property.area_sqft <= filters["max_sqft"])
    if filters.get("verified_only", True):
        q = q.filter(Property.verified == True)

    # Sort — featured first, then by rating
    q = q.order_by(Property.featured.desc(), Property.rating.desc())
    return q.limit(limit).all()


async def rag_search(
    query: str,
    filters: dict,
    db: Session,
    k: int = 20,
    generate_response: bool = False,
) -> dict:
    """
    Full RAG pipeline:
    1. Semantic search via FAISS
    2. DB filter on candidates
    3. Optional: Gemini generates a rich response
    """
    # Step 1: FAISS semantic search
    candidate_ids = semantic_search(query, k=k * 3)

    # Step 2: Apply DB filters
    properties = apply_db_filters(db, candidate_ids, filters, limit=k)

    # If FAISS found nothing useful, fall back to pure DB search
    if not properties and candidate_ids:
        properties = apply_db_filters(db, [], filters, limit=k)

    result = {
        "query": query,
        "filters": filters,
        "total": len(properties),
        "items": [p.to_dict() for p in properties],
        "semantic_candidates": len(candidate_ids),
    }

    # Step 3: Optional Gemini narrative response
    if generate_response and properties:
        result["ai_response"] = await _generate_rag_response(query, properties, filters)

    return result


async def _generate_rag_response(
    query: str,
    properties: list[Property],
    filters: dict,
) -> str:
    """Generate a Gemini narrative response based on search results."""
    country = filters.get("country", "uk")

    # Build concise context from top 5 properties
    context_lines = []
    for i, p in enumerate(properties[:5], 1):
        line = f"{i}. {p.title} | {p.price_display} | {p.area}, {p.city} | {p.bedrooms}bed {p.area_sqft}sqft"
        if p.amenities:
            line += f" | {', '.join((p.amenities or [])[:3])}"
        context_lines.append(line)
    context = "\n".join(context_lines)

    prompt = f"""You are an expert real estate advisor for {country.upper()}.
The user searched: "{query}"
We found {len(properties)} matching properties. Top results:
{context}

Write a helpful 2-3 sentence response summarizing what was found and highlighting 
the best 1-2 options. Be specific about prices, locations, and features. 
Mention if the results match the user's requirements well or if they should 
broaden their search. Keep it concise and actionable."""

    try:
        return await call_gemini(prompt, temperature=0.6, max_tokens=300)
    except Exception as e:
        logger.warning(f"RAG response generation failed: {e}")
        return f"Found {len(properties)} properties matching your search."


async def find_similar(property_id: str, db: Session, k: int = 8) -> list[dict]:
    """Find properties similar to a given property using FAISS."""
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        return []

    text = build_property_text(prop)
    candidate_ids = semantic_search(text, k=k * 3)

    # Exclude the source property
    candidate_ids = [cid for cid in candidate_ids if cid != property_id]

    similar = apply_db_filters(
        db,
        candidate_ids,
        {"country": prop.country, "city": prop.city},
        limit=k,
    )
    return [p.to_dict() for p in similar]
