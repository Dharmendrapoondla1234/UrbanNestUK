"""
Property data models — strict typing for data integrity
"""
from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
import hashlib
import re


class PropertyImage(BaseModel):
    url: str
    alt: str = ""
    source: str = "unsplash"  # unsplash | rightmove | zoopla | agent

    @field_validator("url")
    @classmethod
    def validate_url(cls, v):
        if not v.startswith(("http://", "https://")):
            raise ValueError("Image URL must be absolute")
        return v


class Property(BaseModel):
    id: str
    title: str
    type: str
    city: str
    area: str
    address: str
    postcode: Optional[str] = None

    # Price
    price: int
    price_per_sqft: Optional[int] = None
    currency: str = "GBP"
    currency_symbol: str = "£"

    # Specs
    area_sqft: Optional[int] = None
    bedrooms: int = 0
    bathrooms: int = 1
    furnishing: Optional[str] = None
    availability: str = "Available Now"
    floor: Optional[str] = None
    age: Optional[int] = None

    # Location (REQUIRED for deduplication)
    lat: float
    lng: float

    # Media — typed list, not random strings
    images: List[PropertyImage] = []

    # Ratings
    rating: float = 4.0
    locality_rating: float = 4.0
    safety_rating: float = 4.0
    lifestyle_rating: float = 4.0

    # UK-specific
    tenure: Optional[str] = None
    epc_rating: Optional[str] = None
    council_tax_band: Optional[str] = None
    nearest_station: Optional[str] = None
    station_distance: Optional[str] = None
    broadband_speed: Optional[str] = None
    flood_risk: Optional[str] = "Very Low"
    neighborhood_culture: Optional[str] = None

    # Metadata
    amenities: List[str] = []
    estate_agent: Optional[str] = None
    rightmove_id: Optional[str] = None
    source_url: Optional[str] = None
    verified: bool = True
    featured: bool = False
    has_virtual_tour: bool = False
    monthly_service_charge: Optional[int] = None
    listed_at: str = ""

    # Data quality
    data_source: str = "generated"   # generated | rightmove | zoopla | api
    image_source: str = "unsplash"   # unsplash | property | verified
    dedup_hash: str = ""             # for deduplication

    @model_validator(mode="after")
    def compute_dedup_hash(self):
        """Hash of address + lat/lng rounded to 3dp to catch near-duplicates"""
        sig = f"{self.address.lower().strip()}|{self.lat:.3f}|{self.lng:.3f}|{self.price}"
        self.dedup_hash = hashlib.md5(sig.encode()).hexdigest()
        return self

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, v):
        if not -90 <= v <= 90:
            raise ValueError(f"Invalid latitude: {v}")
        return round(v, 6)

    @field_validator("lng")
    @classmethod
    def validate_lng(cls, v):
        if not -180 <= v <= 180:
            raise ValueError(f"Invalid longitude: {v}")
        return round(v, 6)

    def image_urls(self) -> List[str]:
        return [img.url for img in self.images]


class SearchResult(BaseModel):
    total: int
    page: int
    limit: int
    items: List[dict]
    query_metadata: dict = {}


class CityData(BaseModel):
    name: str
    lat: float
    lng: float
    avg_price: int
    currency_symbol: str = "£"
    areas: List[str]
