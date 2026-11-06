import uuid
from datetime import datetime
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class EventType(str, enum.Enum):
    BID_SUBMITTED = "BID_SUBMITTED"
    RANKING_CHANGED = "RANKING_CHANGED"
    AUCTION_EXTENDED = "AUCTION_EXTENDED"
    AUCTION_CLOSED = "AUCTION_CLOSED"
    AUCTION_FORCE_CLOSED = "AUCTION_FORCE_CLOSED"
    AUCTION_SCHEDULED = "AUCTION_SCHEDULED"
    AUCTION_ACTIVATED = "AUCTION_ACTIVATED"

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rfq_id = Column(String(36), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    event_type = Column(Enum(EventType), nullable=False)
    description = Column(Text, nullable=False)
    details = Column(JSON, nullable=True)  # Store JSON metadata (previous_close, new_close, trigger_reason, etc.)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    rfq = relationship("RFQ", back_populates="activity_logs")
    actor = relationship("User", back_populates="activity_logs")

