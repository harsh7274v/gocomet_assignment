import uuid
from datetime import datetime
import enum
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    BUYER = "BUYER"
    SUPPLIER = "SUPPLIER"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    supplier_profile = relationship("SupplierProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    rfqs = relationship("RFQ", back_populates="buyer")
    bids = relationship("Bid", back_populates="supplier")
    invitations = relationship("RFQInvitation", back_populates="supplier")
    activity_logs = relationship("ActivityLog", back_populates="actor")

class SupplierProfile(Base):
    __tablename__ = "supplier_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    carrier_name = Column(String(255), nullable=False)
    contact_number = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="supplier_profile")

