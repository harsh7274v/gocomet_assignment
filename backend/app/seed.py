from datetime import datetime, timedelta
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User, UserRole, SupplierProfile
from app.models.rfq import RFQ, RFQStatus
from app.models.auction_config import AuctionConfiguration, ExtensionTrigger
from app.models.invitation import RFQInvitation, InvitationStatus
from app.models.bid import Bid
from app.models.activity_log import ActivityLog, EventType

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if users already seeded
        existing_buyer = db.query(User).filter(User.email == "buyer@acme.com").first()
        if existing_buyer:
            print("[Seed] Database already seeded. Skipping.")
            return

        print("[Seed] Populating initial demo data...")

        # 1. Create Buyer
        buyer = User(
            email="buyer@acme.com",
            password_hash=get_password_hash("password123"),
            full_name="Priya Sharma (Acme Corp)",
            role=UserRole.BUYER,
            is_active=True
        )
        db.add(buyer)
        db.flush()

        # 2. Create 4 Suppliers
        suppliers_data = [
            ("dhl@supplier.com", "DHL Global Forwarding", "DHL Express India", "+91 98765 43210", "Gurugram, Haryana"),
            ("bluedart@supplier.com", "Blue Dart Aviation", "Blue Dart Express", "+91 98765 43211", "Mumbai, Maharashtra"),
            ("fedex@supplier.com", "FedEx Supply Chain", "FedEx Express India", "+91 98765 43212", "Bengaluru, Karnataka"),
            ("delhivery@supplier.com", "Delhivery Logistics", "Delhivery Logistics", "+91 98765 43213", "Delhi, NCR"),
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

        db.flush()

        # 3. Create RFQ 1: ACTIVE British Auction (Delhi to Mumbai)
        now = datetime.utcnow()
        rfq1_start = now - timedelta(hours=1)
        rfq1_close = now + timedelta(minutes=8)     # Within 10 min window!
        rfq1_forced = now + timedelta(minutes=30)   # Forced ceiling

        rfq1 = RFQ(
            reference_id="RFQ-20261106-DELMUM",
            buyer_id=buyer.id,
            name="Delhi to Mumbai FTL Freight (Active Auction)",
            description="50 Metric Ton Full Truckload shipment. Temperature controlled container required.",
            service_type="Full Truckload (FTL)",
            pickup_location="Delhi Hub, NH48",
            destination="Mumbai Logistics Park, Nhava Sheva",
            pickup_at=now + timedelta(days=5),
            bid_start_at=rfq1_start,
            initial_close_at=rfq1_close,
            current_close_at=rfq1_close,
            forced_close_at=rfq1_forced,
            status=RFQStatus.ACTIVE
        )
        db.add(rfq1)
        db.flush()

        # Auction Config: X=10m, Y=5m, Trigger=L1_CHANGE
        cfg1 = AuctionConfiguration(
            rfq_id=rfq1.id,
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            extension_trigger=ExtensionTrigger.L1_CHANGE
        )
        db.add(cfg1)

        # Invite all 4 suppliers
        for sup_user in supplier_users.values():
            db.add(RFQInvitation(
                rfq_id=rfq1.id,
                supplier_id=sup_user.id,
                invitation_status=InvitationStatus.ACCEPTED
            ))

        # Initial bids for RFQ 1
        # FedEx: ₹52,000 (L3)
        bid_fedex = Bid(
            rfq_id=rfq1.id,
            supplier_id=supplier_users["FedEx Express India"].id,
            freight_charges=47000.0,
            origin_charges=2000.0,
            destination_charges=3000.0,
            total_amount=52000.0,
            transit_days=3,
            validity_days=15,
            submitted_at=now - timedelta(minutes=45)
        )
        db.add(bid_fedex)

        # DHL: ₹50,000 (L2)
        bid_dhl = Bid(
            rfq_id=rfq1.id,
            supplier_id=supplier_users["DHL Express India"].id,
            freight_charges=45000.0,
            origin_charges=2000.0,
            destination_charges=3000.0,
            total_amount=50000.0,
            transit_days=2,
            validity_days=15,
            submitted_at=now - timedelta(minutes=30)
        )
        db.add(bid_dhl)

        # Blue Dart: ₹48,000 (Current L1)
        bid_bluedart = Bid(
            rfq_id=rfq1.id,
            supplier_id=supplier_users["Blue Dart Express"].id,
            freight_charges=43000.0,
            origin_charges=2000.0,
            destination_charges=3000.0,
            total_amount=48000.0,
            transit_days=2,
            validity_days=14,
            submitted_at=now - timedelta(minutes=15)
        )
        db.add(bid_bluedart)

        # Activity Logs for RFQ 1
        db.add(ActivityLog(
            rfq_id=rfq1.id,
            actor_id=buyer.id,
            event_type=EventType.AUCTION_ACTIVATED,
            description="British Auction activated with X=10 min trigger window and Y=5 min extension.",
            details={"trigger": "l1_change", "window": 10, "extension": 5}
        ))
        db.add(ActivityLog(
            rfq_id=rfq1.id,
            actor_id=supplier_users["Blue Dart Express"].id,
            event_type=EventType.BID_SUBMITTED,
            description="Blue Dart Express placed bid of ₹48,000.00 and became L1.",
            details={"rank": "L1", "amount": 48000.0}
        ))

        # 4. Create RFQ 2: SCHEDULED Auction (Bangalore to Chennai)
        rfq2 = RFQ(
            reference_id="RFQ-20261106-BLRCHN",
            buyer_id=buyer.id,
            name="Bangalore to Chennai Dedicated Express",
            description="Electronic components fragile cargo transit.",
            service_type="Dedicated Fleet",
            pickup_location="Electronic City, Bengaluru",
            destination="Sriperumbudur Industrial Zone, Chennai",
            pickup_at=now + timedelta(days=7),
            bid_start_at=now + timedelta(hours=2),
            initial_close_at=now + timedelta(hours=6),
            current_close_at=now + timedelta(hours=6),
            forced_close_at=now + timedelta(hours=8),
            status=RFQStatus.SCHEDULED
        )
        db.add(rfq2)
        db.flush()

        db.add(AuctionConfiguration(
            rfq_id=rfq2.id,
            trigger_window_minutes=15,
            extension_duration_minutes=5,
            extension_trigger=ExtensionTrigger.BID_RECEIVED
        ))

        for sup_user in supplier_users.values():
            db.add(RFQInvitation(
                rfq_id=rfq2.id,
                supplier_id=sup_user.id,
                invitation_status=InvitationStatus.INVITED
            ))

        # 5. Create RFQ 3: CLOSED Auction (Mumbai to Pune)
        rfq3 = RFQ(
            reference_id="RFQ-20261105-MUMPUN",
            buyer_id=buyer.id,
            name="Mumbai to Pune Daily Shuttle",
            description="Regular intercity cargo transit.",
            service_type="Daily Shuttle",
            pickup_location="Kurla Hub, Mumbai",
            destination="Chakan Auto Cluster, Pune",
            pickup_at=now - timedelta(days=1),
            bid_start_at=now - timedelta(days=2),
            initial_close_at=now - timedelta(hours=5),
            current_close_at=now - timedelta(hours=4, minutes=45),
            forced_close_at=now - timedelta(hours=4),
            status=RFQStatus.CLOSED
        )
        db.add(rfq3)
        db.flush()

        db.add(AuctionConfiguration(
            rfq_id=rfq3.id,
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            extension_trigger=ExtensionTrigger.ANY_RANK_CHANGE
        ))

        for sup_user in supplier_users.values():
            db.add(RFQInvitation(
                rfq_id=rfq3.id,
                supplier_id=sup_user.id,
                invitation_status=InvitationStatus.ACCEPTED
            ))

        db.add(Bid(
            rfq_id=rfq3.id,
            supplier_id=supplier_users["Delhivery Logistics"].id,
            freight_charges=28000.0,
            origin_charges=1500.0,
            destination_charges=1500.0,
            total_amount=31000.0,
            transit_days=1,
            validity_days=30,
            submitted_at=now - timedelta(hours=5, minutes=10)
        ))

        db.add(ActivityLog(
            rfq_id=rfq3.id,
            actor_id=None,
            event_type=EventType.AUCTION_CLOSED,
            description="Auction ended at scheduled closing time. Winning carrier: Delhivery Logistics at ₹31,000.00.",
            details={"winning_carrier": "Delhivery Logistics", "amount": 31000.0}
        ))

        db.commit()
        print("[Seed] Successfully seeded database with Buyer, 4 Suppliers, and 3 RFQs!")

    except Exception as e:
        db.rollback()
        print(f"[Seed Error]: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
