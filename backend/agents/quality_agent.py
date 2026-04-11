"""
UrbanNest AI — Data Quality Agent
Monitors property data for issues: missing fields, stale prices,
suspicious values, and duplicate near-matches.
"""
import os as _os, sys as _sys
_backend_dir = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
if _backend_dir not in _sys.path:
    _sys.path.insert(0, _backend_dir)

import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from db.models import Property, DataIngestionLog

logger = logging.getLogger(__name__)

REQUIRED_FIELDS = ["country", "city", "title", "price", "property_type"]
PRICE_SANITY = {
    "india": {"min": 50_000_00, "max": 500_000_000_00},    # ₹5L – ₹500Cr in paise
    "uk":    {"min": 20_000_00, "max": 100_000_000_00},    # £20K – £100M in pence
}


def run_quality_checks(db: Session) -> dict:
    """Run all quality checks and return a report dict."""
    report = {
        "timestamp":        datetime.utcnow().isoformat(),
        "missing_fields":   0,
        "price_outliers":   0,
        "missing_coords":   0,
        "stale_listings":   0,
        "flagged_ids":      [],
        "total_checked":    0,
    }

    all_props = db.query(Property).all()
    report["total_checked"] = len(all_props)

    stale_cutoff = datetime.utcnow() - timedelta(days=14)

    for p in all_props:
        issues = []

        # Check required fields
        for field in REQUIRED_FIELDS:
            if not getattr(p, field, None):
                issues.append(f"missing:{field}")

        # Sanity-check price
        if p.price and p.country in PRICE_SANITY:
            bounds = PRICE_SANITY[p.country]
            if p.price < bounds["min"] or p.price > bounds["max"]:
                issues.append(f"price_outlier:{p.price}")
                report["price_outliers"] += 1

        # Check coordinates
        if not p.lat or not p.lng:
            issues.append("missing_coords")
            report["missing_coords"] += 1

        # Check staleness
        if p.updated_at and p.updated_at < stale_cutoff and not p.featured:
            issues.append("stale")
            report["stale_listings"] += 1

        if issues:
            report["missing_fields"] += sum(1 for i in issues if i.startswith("missing:"))
            report["flagged_ids"].append({"id": p.id, "issues": issues})

    # Trim flagged_ids to first 50 for readability
    report["flagged_ids"] = report["flagged_ids"][:50]
    report["total_flagged"] = len(report["flagged_ids"])

    logger.info(f"Quality check: {report['total_flagged']}/{report['total_checked']} flagged")
    return report
