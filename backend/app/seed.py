from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User, UserRole, SupplierProfile

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if users already seeded
        existing_buyer = db.query(User).filter(User.email == "buyer@acme.com").first()
        if existing_buyer:
            return

        print("[Seed] Creating default enterprise buyer and supplier accounts (no demo RFQs)...")

        # 1. Create Buyer Account
        buyer = User(
            email="buyer@acme.com",
            password_hash=get_password_hash("password123"),
            full_name="Priya Sharma (Acme Corp)",
            role=UserRole.BUYER,
            is_active=True
        )
        db.add(buyer)
        db.flush()

        # 2. Create 4 Pre-registered Supplier Carriers
        suppliers_data = [
            ("dhl@supplier.com", "DHL Global Forwarding", "DHL Express India", "+91 98765 43210", "Gurugram, Haryana"),
            ("bluedart@supplier.com", "Blue Dart Aviation", "Blue Dart Express", "+91 98765 43211", "Mumbai, Maharashtra"),
            ("fedex@supplier.com", "FedEx Supply Chain", "FedEx Express India", "+91 98765 43212", "Bengaluru, Karnataka"),
            ("delhivery@supplier.com", "Delhivery Logistics", "Delhivery Logistics", "+91 98765 43213", "Delhi, NCR"),
        ]

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

        db.commit()
        print("[Seed] Successfully created default user accounts with clean database!")

    except Exception as e:
        db.rollback()
        print(f"[Seed Error]: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
