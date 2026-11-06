import pytest
from datetime import datetime, timedelta
from app.models.rfq import RFQ, RFQStatus
from app.models.auction_config import AuctionConfiguration, ExtensionTrigger
from app.services.extension_service import ExtensionService

def test_trigger_a_bid_received_inside_window():
    now = datetime.utcnow()
    close_at = now + timedelta(minutes=5)
    forced_at = now + timedelta(minutes=30)

    rfq = RFQ(
        current_close_at=close_at,
        forced_close_at=forced_at
    )
    config = AuctionConfiguration(
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger=ExtensionTrigger.BID_RECEIVED
    )

    res = ExtensionService.evaluate_bid_extension(
        rfq=rfq,
        config=config,
        bid_timestamp=now,
        old_leaderboard=[],
        new_leaderboard=[],
        bidder_carrier_name="DHL"
    )

    assert res.should_extend is True
    assert res.new_close_at == close_at + timedelta(minutes=5)
    assert res.extended_minutes == 5
    assert "DHL" in res.reason

def test_trigger_a_bid_received_outside_window():
    now = datetime.utcnow()
    close_at = now + timedelta(minutes=25)  # 25 min away; window is 10 min
    forced_at = now + timedelta(minutes=60)

    rfq = RFQ(
        current_close_at=close_at,
        forced_close_at=forced_at
    )
    config = AuctionConfiguration(
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger=ExtensionTrigger.BID_RECEIVED
    )

    res = ExtensionService.evaluate_bid_extension(
        rfq=rfq,
        config=config,
        bid_timestamp=now,
        old_leaderboard=[],
        new_leaderboard=[],
        bidder_carrier_name="DHL"
    )

    assert res.should_extend is False
    assert res.new_close_at == close_at

def test_trigger_b_any_rank_change():
    now = datetime.utcnow()
    close_at = now + timedelta(minutes=4)
    forced_at = now + timedelta(minutes=30)

    rfq = RFQ(current_close_at=close_at, forced_close_at=forced_at)
    config = AuctionConfiguration(
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger=ExtensionTrigger.ANY_RANK_CHANGE
    )

    old_board = [
        {"supplier_id": "sup-1", "rank": "L1"},
        {"supplier_id": "sup-2", "rank": "L2"},
        {"supplier_id": "sup-3", "rank": "L3"}
    ]
    # sup-3 overtakes sup-2: new order sup-1, sup-3, sup-2
    new_board_rank_changed = [
        {"supplier_id": "sup-1", "rank": "L1"},
        {"supplier_id": "sup-3", "rank": "L2"},
        {"supplier_id": "sup-2", "rank": "L3"}
    ]

    res = ExtensionService.evaluate_bid_extension(
        rfq=rfq,
        config=config,
        bid_timestamp=now,
        old_leaderboard=old_board,
        new_leaderboard=new_board_rank_changed,
        bidder_carrier_name="FedEx"
    )

    assert res.should_extend is True
    assert res.new_close_at == close_at + timedelta(minutes=5)

    # Now test case where sup-3 lowered bid but remained L3 (no rank change)
    new_board_no_change = [
        {"supplier_id": "sup-1", "rank": "L1"},
        {"supplier_id": "sup-2", "rank": "L2"},
        {"supplier_id": "sup-3", "rank": "L3"}
    ]
    res2 = ExtensionService.evaluate_bid_extension(
        rfq=rfq,
        config=config,
        bid_timestamp=now,
        old_leaderboard=old_board,
        new_leaderboard=new_board_no_change,
        bidder_carrier_name="FedEx"
    )
    assert res2.should_extend is False

def test_trigger_c_l1_rank_change():
    now = datetime.utcnow()
    close_at = now + timedelta(minutes=4)
    forced_at = now + timedelta(minutes=30)

    rfq = RFQ(current_close_at=close_at, forced_close_at=forced_at)
    config = AuctionConfiguration(
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger=ExtensionTrigger.L1_CHANGE
    )

    old_board = [
        {"supplier_id": "sup-1", "rank": "L1"},
        {"supplier_id": "sup-2", "rank": "L2"},
        {"supplier_id": "sup-3", "rank": "L3"}
    ]

    # Scenario 1: sup-3 moves to L2 (L1 is still sup-1) -> Should NOT extend
    mid_board = [
        {"supplier_id": "sup-1", "rank": "L1"},
        {"supplier_id": "sup-3", "rank": "L2"},
        {"supplier_id": "sup-2", "rank": "L3"}
    ]
    res_no_l1_change = ExtensionService.evaluate_bid_extension(
        rfq=rfq,
        config=config,
        bid_timestamp=now,
        old_leaderboard=old_board,
        new_leaderboard=mid_board,
        bidder_carrier_name="FedEx"
    )
    assert res_no_l1_change.should_extend is False

    # Scenario 2: sup-2 overtakes sup-1 to become L1 -> Should extend!
    new_l1_board = [
        {"supplier_id": "sup-2", "rank": "L1"},
        {"supplier_id": "sup-1", "rank": "L2"},
        {"supplier_id": "sup-3", "rank": "L3"}
    ]
    res_l1_changed = ExtensionService.evaluate_bid_extension(
        rfq=rfq,
        config=config,
        bid_timestamp=now,
        old_leaderboard=old_board,
        new_leaderboard=new_l1_board,
        bidder_carrier_name="Blue Dart"
    )
    assert res_l1_changed.should_extend is True
    assert res_l1_changed.new_close_at == close_at + timedelta(minutes=5)

def test_forced_close_ceiling_clamping():
    now = datetime.utcnow()
    close_at = now + timedelta(minutes=3)
    # Forced close is only 2 minutes after close_at, but extension Y is 5 minutes!
    forced_at = close_at + timedelta(minutes=2)

    rfq = RFQ(current_close_at=close_at, forced_close_at=forced_at)
    config = AuctionConfiguration(
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger=ExtensionTrigger.BID_RECEIVED
    )

    res = ExtensionService.evaluate_bid_extension(
        rfq=rfq,
        config=config,
        bid_timestamp=now,
        old_leaderboard=[],
        new_leaderboard=[],
        bidder_carrier_name="DHL"
    )

    assert res.should_extend is True
    # Must be clamped strictly to forced_at
    assert res.new_close_at == forced_at
    assert res.was_clamped_to_forced_close is True
    assert "Forced Close ceiling" in res.reason
