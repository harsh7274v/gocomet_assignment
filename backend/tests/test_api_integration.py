import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}

def test_login_buyer():
    res = client.post("/api/auth/login", json={
        "email": "buyer@acme.com",
        "password": "password123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "BUYER"

def test_login_supplier():
    res = client.post("/api/auth/login", json={
        "email": "dhl@supplier.com",
        "password": "password123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "SUPPLIER"
    assert data["user"]["supplier_profile"]["carrier_name"] == "DHL Express India"

def test_list_rfqs_and_bid():
    # Login as DHL
    login_res = client.post("/api/auth/login", json={
        "email": "dhl@supplier.com",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List RFQs
    rfqs_res = client.get("/api/rfqs", headers=headers)
    assert rfqs_res.status_code == 200
    rfqs = rfqs_res.json()
    assert len(rfqs) >= 1

    active_rfq = next(r for r in rfqs if r["status"] == "ACTIVE")
    rfq_id = active_rfq["id"]
    old_close = active_rfq["current_close_at"]

    # Check initial leaderboard: Blue Dart is L1 at ₹48,000, DHL is L2 at ₹50,000
    lb_res = client.get(f"/api/rfqs/{rfq_id}/leaderboard", headers=headers)
    assert lb_res.status_code == 200
    lb = lb_res.json()
    assert lb["entries"][0]["carrier_name"] == "Blue Dart Express"
    assert lb["entries"][0]["rank"] == "L1"

    # DHL bids ₹46,000 (Freight 41000 + Origin 2000 + Dest 3000)
    # This overtakes L1 and triggers British Auction Extension!
    bid_res = client.post(f"/api/rfqs/{rfq_id}/bids", headers=headers, json={
        "freight_charges": 41000.0,
        "origin_charges": 2000.0,
        "destination_charges": 3000.0,
        "transit_days": 2,
        "validity_days": 15
    })
    assert bid_res.status_code == 200
    bid_data = bid_res.json()
    assert bid_data["total_amount"] == 46000.0

    # Verify Leaderboard has DHL as new L1
    lb_res_after = client.get(f"/api/rfqs/{rfq_id}/leaderboard", headers=headers)
    lb_after = lb_res_after.json()
    assert lb_after["entries"][0]["carrier_name"] == "DHL Express India"
    assert lb_after["entries"][0]["rank"] == "L1"
    assert lb_after["entries"][0]["total_amount"] == 46000.0

    # Verify Activity log recorded the extension and bid
    act_res = client.get(f"/api/rfqs/{rfq_id}/activity", headers=headers)
    assert act_res.status_code == 200
    logs = act_res.json()
    ext_logs = [l for l in logs if l["event_type"] == "AUCTION_EXTENDED"]
    assert len(ext_logs) >= 1
    assert "New L1 lowest bidder (DHL Express India) emerged" in ext_logs[0]["description"]

def test_downside_bidding_rule_rejection():
    # Login as DHL
    login_res = client.post("/api/auth/login", json={
        "email": "dhl@supplier.com",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get active RFQ
    rfqs = client.get("/api/rfqs", headers=headers).json()
    active_rfq = next(r for r in rfqs if r["status"] == "ACTIVE")
    rfq_id = active_rfq["id"]

    # DHL tries to submit a bid of ₹47,000, which is higher than its previous bid of ₹46,000
    bad_bid = client.post(f"/api/rfqs/{rfq_id}/bids", headers=headers, json={
        "freight_charges": 42000.0,
        "origin_charges": 2000.0,
        "destination_charges": 3000.0,
        "transit_days": 2,
        "validity_days": 15
    })
    assert bad_bid.status_code == 400
    assert "Downside bidding rule violation" in bad_bid.json()["detail"]

