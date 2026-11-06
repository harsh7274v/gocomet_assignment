import uuid
from datetime import datetime
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class RFQStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    FORCE_CLOSED = "FORCE_CLOSED"
    CANCELLED = "CANCELLED"

class RFQ(Base):
    __tablename__ = "rfqs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reference_id = Column(String(64), unique=True, index=True, nullable=False)
    buyer_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    service_type = Column(String(100), default="Freight Transportation")
    pickup_location = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    pickup_at = Column(DateTime, nullable=False)

    # Auction Timing Milestones (UTC)
    bid_start_at = Column(DateTime, nullable=False)
    initial_close_at = Column(DateTime, nullable=False)
    current_close_at = Column(DateTime, nullable=False)
    forced_close_at = Column(DateTime, nullable=False)

    status = Column(Enum(RFQStatus), default=RFQStatus.DRAFT, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    buyer = relationship("User", back_populates="rfqs")
    auction_config = relationship("AuctionConfiguration", back_populates="rfq", uselist=False, cascade="all, delete-orphan")
    invitations = relationship("RFQInvitation", back_populates="rfq", cascade="all, delete-orphan")
    bids = relationship("Bid", back_populates="rfq", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="rfq", cascade="all, delete-orphan")
