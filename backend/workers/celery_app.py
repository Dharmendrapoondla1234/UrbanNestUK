"""
UrbanNest AI — Celery Tasks & Scheduler
Automated agents: scraping, index rebuild, alert matching, quality checks.
Run with: celery -A workers.celery_app worker --beat --loglevel=info
"""
import os as _os, sys as _sys
_backend_dir = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
if _backend_dir not in _sys.path:
    _sys.path.insert(0, _backend_dir)

import os
import logging
import asyncio
from datetime import datetime

from celery import Celery
from celery.schedules import crontab

logger = logging.getLogger(__name__)

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("urbannest", broker=REDIS_URL, backend=REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    # ── Scheduled tasks ──────────────────────────────────────────
    beat_schedule={
        # Scrape India every 6 hours
        "scrape-india": {
            "task": "workers.tasks.scrape_india",
            "schedule": crontab(minute=0, hour="*/6"),
        },
        # Scrape UK every 6 hours (offset by 1h)
        "scrape-uk": {
            "task": "workers.tasks.scrape_uk",
            "schedule": crontab(minute=0, hour="1,7,13,19"),
        },
        # Rebuild FAISS index nightly at 2 AM
        "rebuild-faiss": {
            "task": "workers.tasks.rebuild_faiss",
            "schedule": crontab(minute=0, hour=2),
        },
        # Run quality agent every 4 hours
        "quality-check": {
            "task": "workers.tasks.quality_check",
            "schedule": crontab(minute=30, hour="*/4"),
        },
        # Alert matching every 30 minutes
        "match-alerts": {
            "task": "workers.tasks.match_alerts",
            "schedule": crontab(minute="*/30"),
        },
        # Clean stale listings daily at 3 AM
        "clean-stale": {
            "task": "workers.tasks.clean_stale_listings",
            "schedule": crontab(minute=0, hour=3),
        },
    },
)


def get_db():
    from db.database import SessionLocal
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        db.close()
        raise e


# ══════════════════════════════════════════════════════════════════════
# TASKS
# ══════════════════════════════════════════════════════════════════════

@celery_app.task(name="workers.tasks.scrape_india", bind=True, max_retries=2)
def scrape_india(self):
    """Scrape India property listings from 99acres + MagicBricks."""
    logger.info("Starting India scrape task")
    db = get_db()
    try:
        from agents.scraper_agent import scrape_all_india
        from agents.cleaning_agent import ingest_listings

        listings = asyncio.run(scrape_all_india())
        stats = ingest_listings(listings, db)
        logger.info(f"India scrape complete: {stats}")
        return stats
    except Exception as e:
        logger.error(f"India scrape failed: {e}")
        self.retry(countdown=300, exc=e)
    finally:
        db.close()


@celery_app.task(name="workers.tasks.scrape_uk", bind=True, max_retries=2)
def scrape_uk(self):
    """Scrape UK property listings from Rightmove + Zoopla."""
    logger.info("Starting UK scrape task")
    db = get_db()
    try:
        from agents.scraper_agent import scrape_all_uk
        from agents.cleaning_agent import ingest_listings

        listings = asyncio.run(scrape_all_uk())
        stats = ingest_listings(listings, db)
        logger.info(f"UK scrape complete: {stats}")
        return stats
    except Exception as e:
        logger.error(f"UK scrape failed: {e}")
        self.retry(countdown=300, exc=e)
    finally:
        db.close()


@celery_app.task(name="workers.tasks.rebuild_faiss", bind=True)
def rebuild_faiss(self):
    """Rebuild FAISS vector index from all verified properties."""
    logger.info("Rebuilding FAISS index")
    db = get_db()
    try:
        from ai.rag_pipeline import rebuild_index
        stats = rebuild_index(db)
        logger.info(f"FAISS rebuilt: {stats}")
        return stats
    except Exception as e:
        logger.error(f"FAISS rebuild failed: {e}")
        raise
    finally:
        db.close()


@celery_app.task(name="workers.tasks.match_alerts", bind=True)
def match_alerts(self):
    """Match recently added properties against active user alerts."""
    logger.info("Running alert matching")
    db = get_db()
    try:
        from agents.alert_agent import run_alert_matching
        asyncio.run(run_alert_matching(db))
        return {"status": "ok", "ts": datetime.utcnow().isoformat()}
    except Exception as e:
        logger.error(f"Alert matching failed: {e}")
    finally:
        db.close()


@celery_app.task(name="workers.tasks.quality_check", bind=True)
def quality_check(self):
    """Run data quality agent: flag dupes, stale listings, missing fields."""
    logger.info("Running quality check")
    db = get_db()
    try:
        from agents.quality_agent import run_quality_checks
        report = run_quality_checks(db)
        logger.info(f"Quality report: {report}")
        return report
    except Exception as e:
        logger.error(f"Quality check failed: {e}")
    finally:
        db.close()


@celery_app.task(name="workers.tasks.clean_stale_listings", bind=True)
def clean_stale_listings(self):
    """Remove listings not updated in the past 7 days."""
    from datetime import timedelta
    db = get_db()
    try:
        cutoff = datetime.utcnow() - timedelta(days=7)
        from db.models import Property
        deleted = (
            db.query(Property)
            .filter(Property.updated_at < cutoff, Property.featured == False)
            .delete(synchronize_session=False)
        )
        db.commit()
        logger.info(f"Cleaned {deleted} stale listings")
        return {"deleted": deleted}
    except Exception as e:
        logger.error(f"Stale cleanup failed: {e}")
        db.rollback()
    finally:
        db.close()
