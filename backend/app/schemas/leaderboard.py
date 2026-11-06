from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class LeaderboardEntry(BaseModel):
    rank: str               # "L1", "L2", "L3" ...
    rank_number: int        # 1, 2, 3 ...
    supplier_id: str
    carrier_name: str
    total_amount: float
    freight_charges: float
    origin_charges: float
    destination_charges: float
    transit_days: int
    validity_days: int
    submitted_at: datetime
    is_own_bid: Optional[bool] = False

class LeaderboardResponse(BaseModel):
    rfq_id: str
    current_close_at: datetime
    forced_close_at: datetime
    total_suppliers_participating: int
    total_bids_placed: int
    lowest_bid_amount: Optional[float] = None
    winning_supplier: Optional[str] = None
    entries: List[LeaderboardEntry]
