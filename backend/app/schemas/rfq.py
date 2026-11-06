from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator, field_validator, field_serializer
from app.models.rfq import RFQStatus
from app.models.auction_config import ExtensionTrigger
from app.models.invitation import InvitationStatus

class AuctionConfigCreate(BaseModel):
    trigger_window_minutes: int = Field(default=10, ge=1, le=120, description="X minutes before close time")
    extension_duration_minutes: int = Field(default=5, ge=1, le=120, description="Y minutes added on extension")
    extension_trigger: ExtensionTrigger = Field(default=ExtensionTrigger.L1_CHANGE)

class AuctionConfigResponse(BaseModel):
    id: str
    rfq_id: str
    trigger_window_minutes: int
    extension_duration_minutes: int
    extension_trigger: ExtensionTrigger

    class Config:
        from_attributes = True

def normalize_utc_naive(v):
    if isinstance(v, str):
        # Handle 'Z' or timezone offsets
        clean = v.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean)
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    elif isinstance(v, datetime):
        if v.tzinfo is not None:
            return v.astimezone(timezone.utc).replace(tzinfo=None)
        return v
    return v

class RFQCreateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    description: Optional[str] = None
    service_type: str = "Freight Transportation"
    pickup_location: str = Field(min_length=2, max_length=255)
    destination: str = Field(min_length=2, max_length=255)
    pickup_at: datetime
    target_budget: Optional[float] = None

    bid_start_at: datetime
    initial_close_at: datetime
    forced_close_at: datetime

    enable_british_auction: bool = True
    auction_config: Optional[AuctionConfigCreate] = None
    invited_supplier_ids: Optional[List[str]] = []

    @field_validator("pickup_at", "bid_start_at", "initial_close_at", "forced_close_at", mode="before")
    @classmethod
    def ensure_utc_naive(cls, v):
        return normalize_utc_naive(v)

    @model_validator(mode="after")
    def validate_timings(self):
        if self.bid_start_at >= self.initial_close_at:
            raise ValueError("Bid Close Time must be strictly later than Bid Start Time")
        if self.initial_close_at >= self.forced_close_at:
            raise ValueError("Forced Bid Close Time must be strictly later than Bid Close Time")
        return self

class RFQInvitationResponse(BaseModel):
    id: str
    supplier_id: str
    carrier_name: Optional[str] = None
    supplier_email: Optional[str] = None
    invitation_status: InvitationStatus
    invited_at: datetime

    class Config:
        from_attributes = True

class RFQListItemResponse(BaseModel):
    id: str
    reference_id: str
    name: str
    service_type: str
    pickup_location: str
    destination: str
    pickup_at: datetime
    target_budget: Optional[float] = None
    bid_start_at: datetime
    current_close_at: datetime
    forced_close_at: datetime
    status: RFQStatus
    target_budget: Optional[float] = None
    current_lowest_bid: Optional[float] = None
    total_bids_count: int = 0
    total_suppliers_count: int = 0
    created_at: datetime

    @field_serializer("pickup_at", "bid_start_at", "current_close_at", "forced_close_at", "created_at", when_used="json")
    def serialize_utc_dt(self, dt: datetime, _info):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc).isoformat()
        return dt.isoformat()

class RFQDetailResponse(BaseModel):
    id: str
    reference_id: str
    buyer_id: str
    buyer_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    service_type: str
    pickup_location: str
    destination: str
    pickup_at: datetime
    target_budget: Optional[float] = None
    bid_start_at: datetime
    initial_close_at: datetime
    current_close_at: datetime
    forced_close_at: datetime
    status: RFQStatus
    created_at: datetime
    auction_config: Optional[AuctionConfigResponse] = None
    invitations: List[RFQInvitationResponse] = []
    current_lowest_bid: Optional[float] = None
    my_rank: Optional[str] = None
    my_latest_bid: Optional[float] = None

    @field_serializer("pickup_at", "bid_start_at", "initial_close_at", "current_close_at", "forced_close_at", "created_at", when_used="json")
    def serialize_utc_dt(self, dt: datetime, _info):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc).isoformat()
        return dt.isoformat()

    class Config:
        from_attributes = True

