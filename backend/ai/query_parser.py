"""
UrbanNest AI — Natural Language Query Parser
Converts user queries into structured database filters using Gemini.

Examples:
  "2BHK under 50 lakhs near IT parks"
  → {country:"india", bedrooms:2, max_price:5000000, area_keywords:["Whitefield","Electronic City"]}

  "apartments for rent in London under £1500"
  → {country:"uk", city:"London", for_rent:true, max_price:150000, property_type:"Flat"}
"""
import os as _os, sys as _sys
_backend_dir = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
if _backend_dir not in _sys.path:
    _sys.path.insert(0, _backend_dir)

import logging
from typing import Optional
from ai.gemini_client import call_gemini, GeminiError
from services.country_config import COUNTRY_CONFIG, get_config

logger = logging.getLogger(__name__)

PARSE_PROMPT = """You are a real estate search filter extractor.
Convert the user's natural language property query into a structured JSON filter object.

RULES:
- India prices: '50L'/'50 lakhs' → max_price=5000000 (in rupees), '2Cr' → 20000000
- UK prices: '£300k'/'300,000' → max_price=300000 (in GBP), '£1500/month' → max_rent_monthly=1500
- BHK (India): '2BHK' → property_type='2BHK', bedrooms=2
- 'near IT parks' (India) → area_keywords=['Whitefield','Electronic City','Manyata Tech Park','Hitech City','Hinjewadi']
- 'for rent'/'rental'/'monthly' → for_rent=true
- 'with parking'/'parking available' → amenities includes 'Parking'
- 'furnished'/'semi-furnished' → furnishing field
- If no country is clear from context, use the provided country_context
- Ignore words that don't map to filters

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "country": "india" or "uk" or null,
  "city": "city name" or null,
  "area": "specific area/neighbourhood" or null,
  "area_keywords": ["keyword1", "keyword2"] or [],
  "property_type": "2BHK"/"Flat"/"Villa"/etc or null,
  "min_price": integer in base currency (rupees/pounds) or null,
  "max_price": integer in base currency or null,
  "max_rent_monthly": integer or null,
  "bedrooms": integer (minimum) or null,
  "bathrooms": integer (minimum) or null,
  "furnishing": "Unfurnished"/"Semi-Furnished"/"Fully Furnished" or null,
  "amenities": ["Parking","Pool","Gym"] or [],
  "for_rent": true/false or null,
  "new_build": true/false or null,
  "min_sqft": integer or null,
  "max_sqft": integer or null,
  "refined_query": "cleaned version of the query for display"
}

User query: {query}
Country context: {country}
City context: {city}
Available property types for {country}: {property_types}
"""


async def parse_query(
    query: str,
    country: str = "uk",
    city: Optional[str] = None,
) -> dict:
    """
    Parse a natural language query into structured filters.
    Returns a dict of filters, falling back to an empty dict on any error.
    """
    try:
        cfg = get_config(country)
        prop_types = ", ".join(cfg["property_types"])
        prompt = PARSE_PROMPT.format(
            query=query,
            country=country,
            city=city or "any",
            property_types=prop_types,
        )
        result = await call_gemini(prompt, json_mode=True, temperature=0.05, max_tokens=512)

        if not isinstance(result, dict):
            logger.warning(f"Query parser returned non-dict: {result}")
            return {"refined_query": query}

        # Normalise — ensure country is set
        if not result.get("country"):
            result["country"] = country
        if city and not result.get("city"):
            result["city"] = city

        # Convert prices to smallest unit (paise/pence)
        for field in ("min_price", "max_price"):
            if result.get(field) is not None:
                result[field] = int(result[field] * 100)  # rupees/pounds → paise/pence

        logger.info(f"Parsed '{query}' → {result}")
        return result

    except GeminiError as e:
        logger.error(f"Gemini parse error ({e.code}): {e}")
        return {"refined_query": query, "_parse_error": str(e)}
    except Exception as e:
        logger.error(f"Unexpected parse error: {e}")
        return {"refined_query": query}


def filters_to_sql_summary(filters: dict) -> str:
    """Generate a human-readable summary of applied filters."""
    parts = []
    if filters.get("city"):
        parts.append(f"in {filters['city']}")
    if filters.get("area"):
        parts.append(f"area: {filters['area']}")
    if filters.get("property_type"):
        parts.append(filters["property_type"])
    if filters.get("bedrooms"):
        parts.append(f"{filters['bedrooms']}+ bed")
    if filters.get("max_price"):
        from services.country_config import fmt_price
        country = filters.get("country", "uk")
        parts.append(f"under {fmt_price(filters['max_price'], country)}")
    if filters.get("for_rent"):
        parts.append("for rent")
    if filters.get("amenities"):
        parts.append(f"with {', '.join(filters['amenities'])}")
    return " · ".join(parts) if parts else "all properties"
