from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.rfq import RFQ
from app.models.user import User, UserRole
from app.models.activity_log import ActivityLog
from app.models.bid import Bid
from app.schemas.leaderboard import LeaderboardResponse, LeaderboardEntry
from app.schemas.activity import ActivityLogResponse
from app.routers.deps import get_current_user
from app.services.ranking_service import RankingService
from app.services.auction_engine import AuctionEngine

router = APIRouter(prefix="/rfqs", tags=["Auctions"])

@router.get("/{rfq_id}/leaderboard", response_model=LeaderboardResponse)
def get_auction_leaderboard(
    rfq_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    # Sync auction status based on current time
    AuctionEngine.sync_auction_status(db, rfq)

    # Compute leaderboard
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
