from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator
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

class RFQCreateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    description: Optional[str] = None
    service_type: str = "Freight Transportation"
    pickup_location: str = Field(min_length=2, max_length=255)
    destination: str = Field(min_length=2, max_length=255)
    pickup_at: datetime

    bid_start_at: datetime
    initial_close_at: datetime
    forced_close_at: datetime

    enable_british_auction: bool = True
    auction_config: Optional[AuctionConfigCreate] = None
    invited_supplier_ids: Optional[List[str]] = []

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
    bid_start_at: datetime
    current_close_at: datetime
    forced_close_at: datetime
    status: RFQStatus
    current_lowest_bid: Optional[float] = None
    total_bids_count: int = 0
    total_suppliers_count: int = 0
    created_at: datetime

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

    class Config:
        from_attributes = True
