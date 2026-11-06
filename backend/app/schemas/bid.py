from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class BidSubmitRequest(BaseModel):
    freight_charges: float = Field(ge=0.0, description="Freight cost")
    origin_charges: float = Field(ge=0.0, default=0.0, description="Origin handling / pickup charges")
    destination_charges: float = Field(ge=0.0, default=0.0, description="Destination handling / delivery charges")
    transit_days: int = Field(ge=1, le=180, default=3, description="Estimated transit duration in days")
    validity_days: int = Field(ge=1, le=365, default=15, description="Quote validity period in days")
    idempotency_key: Optional[str] = None

class BidResponse(BaseModel):
    id: str
    rfq_id: str
    supplier_id: str
    carrier_name: Optional[str] = None
    freight_charges: float
    origin_charges: float
    destination_charges: float
    total_amount: float
    transit_days: int
    validity_days: int
    submitted_at: datetime

    class Config:
        from_attributes = True
