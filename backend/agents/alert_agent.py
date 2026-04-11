"""
UrbanNest AI — Alert Agent
Matches newly ingested properties against active user alert criteria.
Sends email notifications. WebSocket push handled by a separate notifier module
to avoid circular imports with api.main.
"""
import os as _os, sys as _sys
_backend_dir = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
if _backend_dir not in _sys.path:
    _sys.path.insert(0, _backend_dir)

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from db.models import Alert, AlertMatch, Property
from services.country_config import fmt_price

logger = logging.getLogger(__name__)

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
APP_URL   = os.environ.get("APP_URL", "https://urbannest.ai")


def _property_matches_alert(prop: Property, filters: dict) -> bool:
    """Return True if a property satisfies the alert filter criteria."""
    if not filters:
        return True
    if filters.get("country") and prop.country != filters["country"].lower():
        return False
    if filters.get("city") and filters["city"].lower() not in (prop.city or "").lower():
        return False
    if filters.get("area") and filters["area"].lower() not in (prop.area or "").lower():
        return False
    if filters.get("property_type") and filters["property_type"].lower() not in (prop.property_type or "").lower():
        return False
    if filters.get("max_price") and prop.price > filters["max_price"]:
        return False
    if filters.get("min_price") and prop.price < filters["min_price"]:
        return False
    if filters.get("bedrooms") and (prop.bedrooms or 0) < int(filters["bedrooms"]):
        return False
    if filters.get("amenities"):
        prop_amenities = [a.lower() for a in (prop.amenities or [])]
        for req in filters["amenities"]:
            if req.lower() not in prop_amenities:
                return False
    return True


async def run_alert_matching(db: Session, since_hours: int = 1):
    """
    Find all properties updated in the last N hours and match
    against every active user alert. Sends email notifications on match.
    """
    cutoff = datetime.utcnow() - timedelta(hours=since_hours)

    new_props = (
        db.query(Property)
        .filter(Property.updated_at >= cutoff)
        .all()
    )
    if not new_props:
        logger.debug("No new properties to match alerts against")
        return {"matched": 0, "alerts_checked": 0}

    active_alerts = db.query(Alert).filter(Alert.is_active == True).all()  # noqa: E712
    if not active_alerts:
        return {"matched": 0, "alerts_checked": 0}

    logger.info(f"Matching {len(new_props)} new props against {len(active_alerts)} alerts")

    total_matches = 0
    for alert in active_alerts:
        filters = alert.filters or {}
        matched_props = []

        for prop in new_props:
            # Skip if already notified
            already = (
                db.query(AlertMatch)
                .filter(AlertMatch.alert_id == alert.id, AlertMatch.property_id == prop.id)
                .first()
            )
            if already:
                continue
            if _property_matches_alert(prop, filters):
                matched_props.append(prop)

        if matched_props:
            for prop in matched_props:
                db.add(AlertMatch(alert_id=alert.id, property_id=prop.id))

            alert.last_triggered = datetime.utcnow()
            alert.match_count    = (alert.match_count or 0) + len(matched_props)
            total_matches       += len(matched_props)

            try:
                await _notify_user(alert, matched_props, db)
            except Exception as e:
                logger.error(f"Notification failed for alert {alert.id}: {e}")

    try:
        db.commit()
    except Exception as e:
        logger.error(f"Alert match commit failed: {e}")
        db.rollback()

    logger.info(f"Alert matching done: {total_matches} matches across {len(active_alerts)} alerts")
    return {"matched": total_matches, "alerts_checked": len(active_alerts)}


async def _notify_user(alert: Alert, properties: list, db: Session):
    """Send email notification for matched properties."""
    user = alert.user
    if not user or not user.email:
        return

    country = alert.country or "uk"
    prop_lines = []
    for p in properties[:5]:
        prop_lines.append(
            f"• {p.title} — {fmt_price(p.price, country)}\n"
            f"  {p.area}, {p.city} | {APP_URL}/search?id={p.id}"
        )

    body = (
        f"Hello {user.name or 'there'},\n\n"
        f"We found {len(properties)} new {'property' if len(properties)==1 else 'properties'} "
        f"matching your alert:\n\"{alert.query_text}\"\n\n"
        + "\n".join(prop_lines)
        + ("\n...and more" if len(properties) > 5 else "")
        + f"\n\nView all: {APP_URL}/alerts\n\n— UrbanNest AI"
    )

    subject = (
        f"🏡 {len(properties)} new "
        f"{'match' if len(properties)==1 else 'matches'} for your alert"
    )
    _send_email(user.email, subject, body)

    # Push via WebSocket — import here to avoid circular at module level
    try:
        from api.websocket_manager import ws_manager
        await ws_manager.send_alert(str(user.id), {
            "type":       "new_matches",
            "alert_id":   str(alert.id),
            "query":      alert.query_text,
            "count":      len(properties),
            "properties": [p.to_dict() for p in properties[:3]],
        })
    except Exception:
        pass  # WebSocket not connected — that's fine


def _send_email(to: str, subject: str, body: str):
    """Send plain-text email via SMTP."""
    if not SMTP_HOST or not SMTP_USER:
        logger.debug(f"SMTP not configured — skipping email to {to}")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = SMTP_USER
        msg["To"]      = to
        msg.attach(MIMEText(body, "plain"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to, msg.as_string())
        logger.info(f"Alert email sent to {to}")
    except Exception as e:
        logger.error(f"Email failed ({to}): {e}")
