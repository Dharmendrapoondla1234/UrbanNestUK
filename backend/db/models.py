"""
UrbanNest AI — SQLAlchemy ORM Models
PostgreSQL schema: properties, users, favorites, alerts, alert_matches, ingestion_logs.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, BigInteger, SmallInteger, Boolean,
    DateTime, Date, Text, Float, ForeignKey, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from db.database import Base


def new_uuid():
    return str(uuid.uuid4())


class Property(Base):
    __tablename__ = "properties"

    id               = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    country          = Column(String(50),  nullable=False, index=True)
    city             = Column(String(100), nullable=False, index=True)
    area             = Column(String(200), nullable=False, index=True)
    postcode         = Column(String(20),  index=True)
    address          = Column(Text)
    lat              = Column(Float)
    lng              = Column(Float)
    title            = Column(Text, nullable=False)
    description      = Column(Text)
    property_type    = Column(String(50),  index=True)
    price            = Column(BigInteger,  nullable=False, index=True)
    currency         = Column(String(5),   nullable=False)
    price_display    = Column(String(50))
    area_sqft        = Column(Integer,     index=True)
    bedrooms         = Column(SmallInteger, index=True)
    bathrooms        = Column(SmallInteger)
    floor            = Column(String(20))
    furnishing       = Column(String(30))
    tenure           = Column(String(30))
    epc_rating       = Column(String(2))
    availability     = Column(String(50))
    available_from   = Column(Date)
    age_years        = Column(SmallInteger)
    amenities        = Column(JSONB)
    images           = Column(JSONB)
    floor_plan_url   = Column(Text)
    virtual_tour_url = Column(Text)
    rating           = Column(Float)
    locality_rating  = Column(Float)
    safety_rating    = Column(Float)
    source_url       = Column(Text)
    data_source      = Column(String(30),  index=True)
    external_id      = Column(String(100), index=True)
    verified         = Column(Boolean, default=False, index=True)
    featured         = Column(Boolean, default=False, index=True)
    embedding_id     = Column(Integer)
    estate_agent     = Column(String(100))
    council_tax_band = Column(String(2))
    nearest_station  = Column(String(100))
    station_distance = Column(String(20))
    broadband_speed  = Column(String(20))
    flood_risk       = Column(String(20))
    raw_data         = Column(JSONB)
    listed_at        = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    favorites     = relationship("Favorite",   back_populates="property", cascade="all, delete")
    alert_matches = relationship("AlertMatch", back_populates="property", cascade="all, delete")

    __table_args__ = (
        UniqueConstraint("data_source", "external_id", name="uq_source_external"),
        Index("ix_properties_country_city",   "country", "city"),
        Index("ix_properties_price_range",    "country", "price"),
    )

    def to_dict(self) -> dict:
        return {
            "id":            self.id,
            "country":       self.country,
            "city":          self.city,
            "area":          self.area,
            "postcode":      self.postcode,
            "address":       self.address,
            "lat":           self.lat,
            "lng":           self.lng,
            "title":         self.title,
            "description":   self.description,
            "property_type": self.property_type,
            "price":         self.price,
            "currency":      self.currency,
            "price_display": self.price_display,
            "area_sqft":     self.area_sqft,
            "bedrooms":      self.bedrooms,
            "bathrooms":     self.bathrooms,
            "floor":         self.floor,
            "furnishing":    self.furnishing,
            "tenure":        self.tenure,
            "epc_rating":    self.epc_rating,
            "amenities":     self.amenities or [],
            "images":        self.images or [],
            "rating":        self.rating,
            "source_url":    self.source_url,
            "data_source":   self.data_source,
            "verified":      self.verified,
            "featured":      self.featured,
            "estate_agent":  self.estate_agent,
            "listed_at":     self.listed_at.isoformat() if self.listed_at else None,
        }


class User(Base):
    __tablename__ = "users"

    id                  = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    email               = Column(String(255), unique=True, nullable=False, index=True)
    password_hash       = Column(String(255), nullable=False)
    name                = Column(String(100))
    country_preference  = Column(String(50),  default="uk")
    city_preference     = Column(String(100))
    phone               = Column(String(30))
    is_active           = Column(Boolean, default=True)
    is_verified         = Column(Boolean, default=False)
    created_at          = Column(DateTime, default=datetime.utcnow)
    last_login          = Column(DateTime)

    favorites = relationship("Favorite",   back_populates="user", cascade="all, delete")
    alerts    = relationship("Alert",      back_populates="user", cascade="all, delete")


class Favorite(Base):
    __tablename__ = "favorites"

    id          = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    user_id     = Column(UUID(as_uuid=False), ForeignKey("users.id"),      nullable=False, index=True)
    property_id = Column(UUID(as_uuid=False), ForeignKey("properties.id"), nullable=False, index=True)
    saved_at    = Column(DateTime, default=datetime.utcnow)
    notes       = Column(Text)

    user     = relationship("User",     back_populates="favorites")
    property = relationship("Property", back_populates="favorites")

    __table_args__ = (
        UniqueConstraint("user_id", "property_id", name="uq_user_property"),
    )


class Alert(Base):
    __tablename__ = "alerts"

    id             = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    user_id        = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    query_text     = Column(Text, nullable=False)
    filters        = Column(JSONB)
    country        = Column(String(50),  index=True)
    city           = Column(String(100), index=True)
    is_active      = Column(Boolean, default=True, index=True)
    frequency      = Column(String(20), default="daily")
    last_triggered = Column(DateTime)
    match_count    = Column(Integer, default=0)
    created_at     = Column(DateTime, default=datetime.utcnow)

    user    = relationship("User",       back_populates="alerts")
    matches = relationship("AlertMatch", back_populates="alert", cascade="all, delete")


class AlertMatch(Base):
    __tablename__ = "alert_matches"

    id          = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    alert_id    = Column(UUID(as_uuid=False), ForeignKey("alerts.id"),      nullable=False, index=True)
    property_id = Column(UUID(as_uuid=False), ForeignKey("properties.id"),  nullable=False)
    notified_at = Column(DateTime, default=datetime.utcnow)
    channel     = Column(String(20), default="email")

    alert    = relationship("Alert",    back_populates="matches")
    property = relationship("Property", back_populates="alert_matches")

    __table_args__ = (
        UniqueConstraint("alert_id", "property_id", name="uq_alert_property"),
    )


class DataIngestionLog(Base):
    __tablename__ = "ingestion_logs"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    source          = Column(String(50))
    country         = Column(String(50))
    city            = Column(String(100))
    records_fetched = Column(Integer, default=0)
    records_new     = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_dupes   = Column(Integer, default=0)
    errors          = Column(JSONB)
    duration_secs   = Column(Float)
    started_at      = Column(DateTime, default=datetime.utcnow)
    completed_at    = Column(DateTime)
    status          = Column(String(20))
