import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

TEST_DB_URL = "sqlite:///:memory:"

from app.core.database import Base, get_db
from app.main import app

test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    from app.core.security import get_password_hash
    from app.models.user import User, UserRole, SupplierProfile
    from app.models.rfq import RFQ, RFQStatus
    from app.models.auction_config import AuctionConfiguration, ExtensionTrigger
    from app.models.invitation import RFQInvitation, InvitationStatus
    from app.models.bid import Bid
    from datetime import datetime, timedelta

    buyer = User(
        email="buyer@acme.com",
        password_hash=get_password_hash("password123"),
        full_name="Priya Sharma (Acme Corp)",
        role=UserRole.BUYER,
        is_active=True
    )
    db.add(buyer)
    db.flush()

    suppliers_data = [
        ("dhl@supplier.com", "DHL Global Forwarding", "DHL Express India", "+91 98765 43210", "Gurugram"),
        ("bluedart@supplier.com", "Blue Dart Aviation", "Blue Dart Express", "+91 98765 43211", "Mumbai"),
        ("fedex@supplier.com", "FedEx Supply Chain", "FedEx Express India", "+91 98765 43212", "Bengaluru"),
        ("delhivery@supplier.com", "Delhivery Logistics", "Delhivery Logistics", "+91 98765 43213", "Delhi"),
    ]

    supplier_users = {}
    for email, full_name, carrier, phone, address in suppliers_data:
        user = User(
            email=email,
            password_hash=get_password_hash("password123"),
            full_name=full_name,
            role=UserRole.SUPPLIER,
            is_active=True
        )
        db.add(user)
        db.flush()

        profile = SupplierProfile(
            user_id=user.id,
            carrier_name=carrier,
            contact_number=phone,
            address=address
        )
        db.add(profile)
        supplier_users[carrier] = user

    now = datetime.utcnow()
    rfq1 = RFQ(
        reference_id="RFQ-TEST-001",
        buyer_id=buyer.id,
        name="Delhi to Mumbai FTL Freight (Active Auction)",
        description="Test RFQ",
        service_type="Full Truckload",
        pickup_location="Delhi",
        destination="Mumbai",
        pickup_at=now + timedelta(days=5),
        bid_start_at=now - timedelta(hours=1),
        initial_close_at=now + timedelta(minutes=8),
        current_close_at=now + timedelta(minutes=8),
        forced_close_at=now + timedelta(minutes=30),
        target_budget=60000.0,
        status=RFQStatus.ACTIVE
    )
    db.add(rfq1)
    db.flush()

    db.add(AuctionConfiguration(
        rfq_id=rfq1.id,
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger=ExtensionTrigger.L1_CHANGE
    ))

    for sup in supplier_users.values():
        db.add(RFQInvitation(
            rfq_id=rfq1.id,
            supplier_id=sup.id,
            invitation_status=InvitationStatus.ACCEPTED
        ))

    # DHL: 50,000 (L2)
    db.add(Bid(
        rfq_id=rfq1.id,
        supplier_id=supplier_users["DHL Express India"].id,
        freight_charges=45000.0,
        origin_charges=2000.0,
        destination_charges=3000.0,
        total_amount=50000.0,
        transit_days=2,
        validity_days=15,
        submitted_at=now - timedelta(minutes=30)
    ))

    # Blue Dart: 48,000 (L1)
    db.add(Bid(
        rfq_id=rfq1.id,
        supplier_id=supplier_users["Blue Dart Express"].id,
        freight_charges=43000.0,
        origin_charges=2000.0,
        destination_charges=3000.0,
        total_amount=48000.0,
        transit_days=2,
        validity_days=15,
        submitted_at=now - timedelta(minutes=15)
    ))

    db.commit()
    db.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
