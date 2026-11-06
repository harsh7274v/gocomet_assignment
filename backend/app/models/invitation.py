import uuid
from datetime import datetime
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class InvitationStatus(str, enum.Enum):
    INVITED = "INVITED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"

class RFQInvitation(Base):
    __tablename__ = "rfq_invitations"
    __table_args__ = (
        UniqueConstraint("rfq_id", "supplier_id", name="uq_rfq_supplier_invitation"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rfq_id = Column(String(36), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)
    supplier_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    invitation_status = Column(Enum(InvitationStatus), default=InvitationStatus.INVITED, nullable=False)
    invited_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    rfq = relationship("RFQ", back_populates="invitations")
    supplier = relationship("User", back_populates="invitations")

