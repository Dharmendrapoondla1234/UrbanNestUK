"""
Cache Service — In-memory TTL cache for property data
- City+area results cached for 10 minutes (fresh enough for real estate)
- Individual properties cached for 30 minutes
- Auto-invalidation on TTL expiry
"""
import time
import hashlib
from typing import Any, Optional, Dict, Tuple

# TTL constants (seconds)
SEARCH_TTL     = 600   # 10 minutes for search results
PROPERTY_TTL   = 1800  # 30 minutes for individual properties
MARKET_TTL     = 3600  # 1 hour for market data

_store: Dict[str, Tuple[Any, float]] = {}  # key → (value, expires_at)


def get(key: str) -> Optional[Any]:
    entry = _store.get(key)
    if not entry:
        return None
    value, expires_at = entry
    if time.time() > expires_at:
        del _store[key]
        return None
    return value


def set(key: str, value: Any, ttl: int = SEARCH_TTL):
    _store[key] = (value, time.time() + ttl)


def delete(key: str):
    _store.pop(key, None)


def invalidate_city(city: str):
    """Invalidate all cache entries for a city"""
    keys_to_del = [k for k in _store if city.lower() in k.lower()]
    for k in keys_to_del:
        del _store[k]


def search_key(city: str, area: str = "", filters: dict = None) -> str:
    """Stable cache key for a search query"""
    parts = [city.lower(), area.lower()]
    if filters:
        for k in sorted(filters.keys()):
            parts.append(f"{k}={filters[k]}")
    raw = "|".join(parts)
    return f"search:{hashlib.md5(raw.encode()).hexdigest()}"


def stats() -> dict:
    now = time.time()
    alive = sum(1 for _, (_, exp) in _store.items() if exp > now)
    return {"total_entries": len(_store), "alive": alive, "expired": len(_store) - alive}
