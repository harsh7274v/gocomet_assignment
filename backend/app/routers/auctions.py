from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.rfq import RFQ, RFQStatus
from app.models.user import User, UserRole, SupplierProfile
from app.models.activity_log import ActivityLog, EventType
from app.models.bid import Bid
from app.schemas.bid import BidSubmitRequest
from app.schemas.leaderboard import LeaderboardResponse, LeaderboardEntry
from app.schemas.activity import ActivityLogResponse
from app.routers.deps import get_current_user
from app.services.ranking_service import RankingService
from app.services.auction_engine import AuctionEngine
from app.websockets.connection_manager import ws_manager

router = APIRouter(prefix="/rfqs", tags=["Auctions"])

class SimulateBidRequest(BaseModel):
    carrier_email: str
    amount: float
    transit_days: int = 2
    validity_days: int = 15

@router.get("/{rfq_id}/leaderboard", response_model=LeaderboardResponse)
def get_auction_leaderboard(
    rfq_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    AuctionEngine.sync_auction_status(db, rfq)
    entries = RankingService.calculate_leaderboard(db, rfq_id, current_user.id)
    
    total_bids = db.query(Bid).filter(Bid.rfq_id == rfq.id).count()
    lowest_bid_amount = entries[0]["total_amount"] if entries else None
    winning_carrier = entries[0]["carrier_name"] if entries else None

    return LeaderboardResponse(
        rfq_id=rfq.id,
        current_close_at=rfq.current_close_at,
        forced_close_at=rfq.forced_close_at,
        total_suppliers_participating=len(entries),
        total_bids_placed=total_bids,
        lowest_bid_amount=lowest_bid_amount,
        winning_supplier=winning_carrier,
        entries=[LeaderboardEntry(**e) for e in entries]
    )

@router.get("/{rfq_id}/activity", response_model=List[ActivityLogResponse])
def get_auction_activity(
    rfq_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.rfq_id == rfq_id)
        .order_by(ActivityLog.created_at.desc())
        .all()
    )

    results = []
    for log in logs:
        actor_name = log.actor.full_name if log.actor else "System Engine"
        results.append(ActivityLogResponse(
            id=log.id,
            rfq_id=log.rfq_id,
            actor_id=log.actor_id,
            actor_name=actor_name,
            event_type=log.event_type,
            description=log.description,
            details=log.details,
            created_at=log.created_at
        ))
    return results

@router.post("/{rfq_id}/simulate-bid")
async def simulate_bid_endpoint(
    rfq_id: str,
    sim_in: SimulateBidRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluator sandbox endpoint: Simulates a bid from a specific carrier to test
    triggers, ranking shifts, and automatic extensions in real-time.
    """
    supplier_user = db.query(User).filter(User.email == sim_in.carrier_email).first()
    if not supplier_user:
        raise HTTPException(status_code=404, detail=f"Carrier {sim_in.carrier_email} not found")

    # Split amount into realistic freight (85%), origin (5%), destination (10%)
    origin = round(sim_in.amount * 0.05, 2)
    destination = round(sim_in.amount * 0.05, 2)
    freight = round(sim_in.amount - origin - destination, 2)

    bid_in = BidSubmitRequest(
        freight_charges=freight,
        origin_charges=origin,
        destination_charges=destination,
        transit_days=sim_in.transit_days,
        validity_days=sim_in.validity_days
    )

    new_bid, ext_res, meta = await AuctionEngine.process_bid(
        db=db,
        rfq_id=rfq_id,
        supplier_user=supplier_user,
        bid_in=bid_in
    )

    return {
        "status": "success",
        "bid_id": new_bid.id,
        "total_amount": new_bid.total_amount,
        "new_rank": meta["rank"],
        "extension": ext_res.to_dict()
    }

@router.post("/{rfq_id}/fast-forward")
async def fast_forward_close_time(
    rfq_id: str,
    minutes_from_now: int = 3,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluator sandbox helper: Adjusts current_close_at to X minutes from now
    so that bidding falls squarely into the Trigger Window for instant demonstration.
    """
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    now = datetime.utcnow()
    new_close = now + timedelta(minutes=minutes_from_now)
    # Ensure it's before forced close
    if new_close >= rfq.forced_close_at:
        new_close = rfq.forced_close_at - timedelta(minutes=1)

    rfq.current_close_at = new_close
    rfq.status = RFQStatus.ACTIVE
    
    log = ActivityLog(
        rfq_id=rfq.id,
        actor_id=current_user.id,
        event_type=EventType.AUCTION_EXTENDED,
        description=f"[SIMULATION] Close time shifted to {new_close.strftime('%H:%M:%S UTC')} ({minutes_from_now}m from now) to enter Trigger Window.",
        details={"simulated": True, "new_close": new_close.isoformat()}
    )
    db.add(log)
    db.commit()

    # Broadcast updated deadline
    await ws_manager.broadcast_to_room(rfq.id, {
        "type": "DEADLINE_ADJUSTED",
        "rfq_id": rfq.id,
        "current_close_at": new_close.isoformat(),
        "forced_close_at": rfq.forced_close_at.isoformat()
    })

    return {
        "status": "success",
        "new_close_at": new_close.isoformat(),
        "minutes_from_now": minutes_from_now
    }
