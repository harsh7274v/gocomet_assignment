import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base

class Bid(Base):
    __tablename__ = "bids"
    __table_args__ = (
        Index("ix_bids_rfq_supplier", "rfq_id", "supplier_id"),
        Index("ix_bids_submitted_at", "submitted_at"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rfq_id = Column(String(36), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)
    supplier_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Cost Breakdown
    freight_charges = Column(Float, nullable=False)
    origin_charges = Column(Float, nullable=False, default=0.0)
    destination_charges = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False)

    # Commercial Terms
    transit_days = Column(Integer, nullable=False, default=3)
    validity_days = Column(Integer, nullable=False, default=15)
    
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    idempotency_key = Column(String(64), nullable=True)

    # Relationships
    rfq = relationship("RFQ", back_populates="bids")
    supplier = relationship("User", back_populates="bids")

