from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.rfq import RFQ, RFQStatus
from app.models.user import User, SupplierProfile
from app.models.invitation import RFQInvitation, InvitationStatus
from app.models.bid import Bid
from app.models.activity_log import ActivityLog, EventType
from app.schemas.bid import BidSubmitRequest
from app.services.ranking_service import RankingService
from app.services.extension_service import ExtensionService, ExtensionEvaluationResult
from app.websockets.connection_manager import ws_manager

class AuctionEngine:
    @classmethod
    def sync_auction_status(cls, db: Session, rfq: RFQ, now: Optional[datetime] = None) -> RFQStatus:
        """
        Synchronizes the RFQ status based on the current UTC timestamp against
        bid_start_at, current_close_at, and forced_close_at.
        """
        if now is None:
            now = datetime.utcnow()

        if rfq.status in (RFQStatus.CANCELLED, RFQStatus.DRAFT):
            return rfq.status

        changed = False
        original_status = rfq.status

        if now >= rfq.forced_close_at:
            if rfq.status != RFQStatus.FORCE_CLOSED:
                rfq.status = RFQStatus.FORCE_CLOSED
                changed = True
                # Log force close
                log = ActivityLog(
                    rfq_id=rfq.id,
                    event_type=EventType.AUCTION_FORCE_CLOSED,
                    description=f"Auction reached non-negotiable Forced Bid Close Time ({rfq.forced_close_at.strftime('%Y-%m-%d %H:%M:%S UTC')}). Permanently closed.",
                    details={"closed_at": now.isoformat(), "forced_close_at": rfq.forced_close_at.isoformat()}
                )
                db.add(log)
        elif now >= rfq.current_close_at:
            if rfq.status != RFQStatus.CLOSED and rfq.status != RFQStatus.FORCE_CLOSED:
                rfq.status = RFQStatus.CLOSED
                changed = True
                log = ActivityLog(
                    rfq_id=rfq.id,
                    event_type=EventType.AUCTION_CLOSED,
                    description=f"Auction reached scheduled Bid Close Time ({rfq.current_close_at.strftime('%Y-%m-%d %H:%M:%S UTC')}). Bidding closed.",
                    details={"closed_at": now.isoformat(), "current_close_at": rfq.current_close_at.isoformat()}
                )
                db.add(log)
        elif now >= rfq.bid_start_at:
            if rfq.status == RFQStatus.SCHEDULED:
                rfq.status = RFQStatus.ACTIVE
                changed = True
                log = ActivityLog(
                    rfq_id=rfq.id,
                    event_type=EventType.AUCTION_ACTIVATED,
                    description="Auction has begun. Bidding is now open.",
                    details={"started_at": now.isoformat()}
                )
                db.add(log)

        if changed:
            db.commit()
            db.refresh(rfq)

        return rfq.status

    @classmethod
    async def process_bid(
        cls,
        db: Session,
        rfq_id: str,
        supplier_user: User,
        bid_in: BidSubmitRequest
    ) -> Tuple[Bid, ExtensionEvaluationResult, Dict[str, Any]]:
        """
        Validates and processes a supplier's quotation or rebid within a transactional context,
        evaluates rankings and extensions, and pushes real-time WebSocket events.
        """
        now = datetime.utcnow()

        # 1. Fetch RFQ
        rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
        if not rfq:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

        # Sync status
        cls.sync_auction_status(db, rfq, now)

        if rfq.status != RFQStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot submit bid. Auction is currently in '{rfq.status.value}' state."
            )

        # Hard timing check
        if now < rfq.bid_start_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Auction bidding has not started yet. Starts at {rfq.bid_start_at.strftime('%Y-%m-%d %H:%M:%S UTC')}."
            )
        if now >= rfq.current_close_at or now >= rfq.forced_close_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bidding deadline has passed. This auction is closed."
            )

        # 2. Check Supplier Invitation
        invitation = (
            db.query(RFQInvitation)
            .filter(RFQInvitation.rfq_id == rfq_id, RFQInvitation.supplier_id == supplier_user.id)
            .first()
        )
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You have not been invited to participate in this RFQ auction."
            )

        # Compute total amount server-side: Freight + Origin + Destination
        total_amount = round(bid_in.freight_charges + bid_in.origin_charges + bid_in.destination_charges, 2)
        if total_amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Total bid amount must be greater than zero."
            )

        # 3. Downside Bidding Validation: new bid must be lower than supplier's previous lowest valid bid
        previous_lowest_bid = (
            db.query(func.min(Bid.total_amount))
            .filter(Bid.rfq_id == rfq_id, Bid.supplier_id == supplier_user.id)
            .scalar()
        )

        if previous_lowest_bid is not None and total_amount >= previous_lowest_bid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Downside bidding rule violation: Your new bid (₹{total_amount:,.2f}) must be strictly lower than your previous bid (₹{previous_lowest_bid:,.2f})."
            )

        # Fetch supplier profile
        profile = (
            db.query(SupplierProfile)
            .filter(SupplierProfile.user_id == supplier_user.id)
            .first()
        )
        carrier_name = profile.carrier_name if profile else supplier_user.full_name

        # 4. Snapshot pre-bid leaderboard
        pre_leaderboard = RankingService.calculate_leaderboard(db, rfq_id)

        # 5. Insert new Bid record
        new_bid = Bid(
            rfq_id=rfq.id,
            supplier_id=supplier_user.id,
            freight_charges=bid_in.freight_charges,
            origin_charges=bid_in.origin_charges,
            destination_charges=bid_in.destination_charges,
            total_amount=total_amount,
            transit_days=bid_in.transit_days,
            validity_days=bid_in.validity_days,
            submitted_at=now,
            idempotency_key=bid_in.idempotency_key
        )
        db.add(new_bid)
        db.flush()  # Flush so it is visible to leaderboard calculation

        # 6. Calculate post-bid leaderboard
        post_leaderboard = RankingService.calculate_leaderboard(db, rfq_id)

        # Identify bidder's new rank
        new_rank = "Unranked"
        for entry in post_leaderboard:
            if entry["supplier_id"] == supplier_user.id:
                new_rank = entry["rank"]
                break

        # 7. Evaluate British Auction Extension
        config = rfq.auction_config
        extension_result = ExtensionService.evaluate_bid_extension(
            rfq=rfq,
            config=config,
            bid_timestamp=now,
            old_leaderboard=pre_leaderboard,
            new_leaderboard=post_leaderboard,
            bidder_carrier_name=carrier_name
        )

        if extension_result.should_extend:
            rfq.current_close_at = extension_result.new_close_at
            # Log Extension event
            ext_log = ActivityLog(
                rfq_id=rfq.id,
                actor_id=supplier_user.id,
                event_type=EventType.AUCTION_EXTENDED,
                description=f"AUCTION EXTENDED: {extension_result.reason}",
                details=extension_result.to_dict()
            )
            db.add(ext_log)

        # 8. Record Bid Submission Activity Log
        bid_log = ActivityLog(
            rfq_id=rfq.id,
            actor_id=supplier_user.id,
            event_type=EventType.BID_SUBMITTED,
            description=f"New bid of ₹{total_amount:,.2f} placed by {carrier_name} (Rank: {new_rank}).",
            details={
                "bid_id": new_bid.id,
                "carrier_name": carrier_name,
                "freight_charges": bid_in.freight_charges,
                "origin_charges": bid_in.origin_charges,
                "destination_charges": bid_in.destination_charges,
                "total_amount": total_amount,
                "transit_days": bid_in.transit_days,
                "validity_days": bid_in.validity_days,
                "new_rank": new_rank
            }
        )
        db.add(bid_log)

        # Check if ranking changed between old and new
        old_ranks = {e["supplier_id"]: e["rank"] for e in pre_leaderboard}
        new_ranks = {e["supplier_id"]: e["rank"] for e in post_leaderboard}
        if old_ranks != new_ranks:
            rank_log = ActivityLog(
                rfq_id=rfq.id,
                actor_id=supplier_user.id,
                event_type=EventType.RANKING_CHANGED,
                description=f"Leaderboard ranks shifted: {carrier_name} moved to {new_rank}.",
                details={"old_ranks": old_ranks, "new_ranks": new_ranks}
            )
            db.add(rank_log)

        db.commit()
        db.refresh(new_bid)
        db.refresh(rfq)

        # 9. Real-Time Broadcast via WebSockets
        ws_payload = {
            "type": "BID_PLACED",
            "rfq_id": rfq.id,
            "bid": {
                "id": new_bid.id,
                "carrier_name": carrier_name,
                "total_amount": total_amount,
                "rank": new_rank,
                "submitted_at": now.isoformat()
            },
            "leaderboard": post_leaderboard,
            "current_close_at": rfq.current_close_at.isoformat(),
            "forced_close_at": rfq.forced_close_at.isoformat(),
            "extension": extension_result.to_dict() if extension_result.should_extend else None
        }

        # Fire and forget async broadcast
        try:
            await ws_manager.broadcast_to_room(rfq.id, ws_payload)
        except Exception as e:
            print(f"[WebSocket Broadcast Warning]: {e}")

        return new_bid, extension_result, {"rank": new_rank, "leaderboard": post_leaderboard}
