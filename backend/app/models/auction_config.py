import uuid
from datetime import datetime
import enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class ExtensionTrigger(str, enum.Enum):
    BID_RECEIVED = "bid_received"
    ANY_RANK_CHANGE = "any_rank_change"
    L1_CHANGE = "l1_change"

class AuctionConfiguration(Base):
    __tablename__ = "auction_configurations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rfq_id = Column(String(36), ForeignKey("rfqs.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # British Auction timing rules
    trigger_window_minutes = Column(Integer, nullable=False, default=10)     # X minutes
    extension_duration_minutes = Column(Integer, nullable=False, default=5)  # Y minutes
    extension_trigger = Column(Enum(ExtensionTrigger), nullable=False, default=ExtensionTrigger.L1_CHANGE)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    rfq = relationship("RFQ", back_populates="auction_config")

