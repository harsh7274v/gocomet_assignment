import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.user import User, UserRole, SupplierProfile
from app.models.rfq import RFQ, RFQStatus
from app.models.auction_config import AuctionConfiguration, ExtensionTrigger
from app.models.invitation import RFQInvitation, InvitationStatus
from app.models.bid import Bid
from app.models.activity_log import ActivityLog, EventType
from app.schemas.rfq import (
    RFQCreateRequest,
    RFQListItemResponse,
    RFQDetailResponse,
    RFQInvitationResponse,
    AuctionConfigResponse,
)
from app.routers.deps import get_current_user, require_buyer
from app.services.auction_engine import AuctionEngine
from app.services.ranking_service import RankingService

router = APIRouter(prefix="/rfqs", tags=["RFQs"])

@router.post("", response_model=RFQDetailResponse)
def create_rfq(
    rfq_in: RFQCreateRequest,
    current_user: User = Depends(require_buyer),
    db: Session = Depends(get_db)
):
    # Generate unique reference_id: RFQ-YYYYMMDD-XXXX
    date_str = datetime.utcnow().strftime("%Y%m%d")
    ref_id = f"RFQ-{date_str}-{str(uuid.uuid4())[:6].upper()}"

    now = datetime.utcnow()
    # Publish immediately: if bid_start_at <= now, mark ACTIVE; else SCHEDULED
    if now >= rfq_in.bid_start_at:
        initial_status = RFQStatus.ACTIVE
    else:
        initial_status = RFQStatus.SCHEDULED

    rfq = RFQ(
        reference_id=ref_id,
        buyer_id=current_user.id,
        name=rfq_in.name,
        description=rfq_in.description,
        service_type=rfq_in.service_type,
        pickup_location=rfq_in.pickup_location,
        destination=rfq_in.destination,
        pickup_at=rfq_in.pickup_at,
        bid_start_at=rfq_in.bid_start_at,
        initial_close_at=rfq_in.initial_close_at,
        current_close_at=rfq_in.initial_close_at,
        forced_close_at=rfq_in.forced_close_at,
        status=initial_status,
    )
    db.add(rfq)
    db.flush()

    # British Auction Config
    if rfq_in.enable_british_auction and rfq_in.auction_config:
        config = AuctionConfiguration(
            rfq_id=rfq.id,
            trigger_window_minutes=rfq_in.auction_config.trigger_window_minutes,
            extension_duration_minutes=rfq_in.auction_config.extension_duration_minutes,
            extension_trigger=rfq_in.auction_config.extension_trigger,
        )
        db.add(config)
    elif rfq_in.enable_british_auction:
        # Default config
        config = AuctionConfiguration(
            rfq_id=rfq.id,
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            extension_trigger=ExtensionTrigger.L1_CHANGE,
        )
        db.add(config)

    # Invitations
    if rfq_in.invited_supplier_ids:
        for sup_id in rfq_in.invited_supplier_ids:
            inv = RFQInvitation(
                rfq_id=rfq.id,
                supplier_id=sup_id,
                invitation_status=InvitationStatus.INVITED
            )
            db.add(inv)

    # Log RFQ creation
    log = ActivityLog(
        rfq_id=rfq.id,
        actor_id=current_user.id,
        event_type=EventType.AUCTION_SCHEDULED,
        description=f"RFQ '{rfq.name}' created by {current_user.full_name} with British Auction settings.",
        details={"reference_id": ref_id}
    )
    db.add(log)

    db.commit()
    db.refresh(rfq)

    # Return detail response
    return get_rfq_details(rfq.id, current_user, db)

@router.get("", response_model=List[RFQListItemResponse])
def list_rfqs(
    status_filter: Optional[str] = Query(None, description="Optional status filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(RFQ)

    if current_user.role == UserRole.BUYER:
        query = query.filter(RFQ.buyer_id == current_user.id)
    else:
        # Supplier sees RFQs they are invited to
        invited_rfq_ids = (
            db.query(RFQInvitation.rfq_id)
            .filter(RFQInvitation.supplier_id == current_user.id)
            .all()
        )
        rfq_id_list = [r[0] for r in invited_rfq_ids]
        query = query.filter(RFQ.id.in_(rfq_id_list))

    if status_filter:
        try:
            status_enum = RFQStatus(status_filter.upper())
            query = query.filter(RFQ.status == status_enum)
        except ValueError:
            pass

    rfqs = query.order_by(RFQ.created_at.desc()).all()

    # Sync statuses and build summary list
    results = []
    now = datetime.utcnow()
    for rfq in rfqs:
        AuctionEngine.sync_auction_status(db, rfq, now)

        # Lowest bid
        lowest_bid = (
            db.query(func.min(Bid.total_amount))
            .filter(Bid.rfq_id == rfq.id)
            .scalar()
        )
        # Total bids count
        bids_count = db.query(Bid).filter(Bid.rfq_id == rfq.id).count()
        # Total unique suppliers who placed bids
        suppliers_count = (
            db.query(func.count(func.distinct(Bid.supplier_id)))
            .filter(Bid.rfq_id == rfq.id)
            .scalar()
        ) or 0

        results.append(RFQListItemResponse(
            id=rfq.id,
            reference_id=rfq.reference_id,
            name=rfq.name,
            service_type=rfq.service_type,
            pickup_location=rfq.pickup_location,
            destination=rfq.destination,
            pickup_at=rfq.pickup_at,
            bid_start_at=rfq.bid_start_at,
            current_close_at=rfq.current_close_at,
            forced_close_at=rfq.forced_close_at,
            status=rfq.status,
            current_lowest_bid=lowest_bid,
            total_bids_count=bids_count,
            total_suppliers_count=suppliers_count,
            created_at=rfq.created_at
        ))

    return results

@router.get("/{rfq_id}", response_model=RFQDetailResponse)
def get_rfq_details(
    rfq_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    # If supplier, verify invitation
    if current_user.role == UserRole.SUPPLIER:
        is_invited = (
            db.query(RFQInvitation)
            .filter(RFQInvitation.rfq_id == rfq_id, RFQInvitation.supplier_id == current_user.id)
            .first()
        )
        if not is_invited:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this RFQ."
            )

    # Sync status
    AuctionEngine.sync_auction_status(db, rfq)

    # Lowest bid
    lowest_bid = (
        db.query(func.min(Bid.total_amount))
        .filter(Bid.rfq_id == rfq.id)
        .scalar()
    )

    # Supplier's own latest bid and rank if supplier
    my_rank = None
    my_latest_bid_amount = None
    if current_user.role == UserRole.SUPPLIER:
        leaderboard = RankingService.calculate_leaderboard(db, rfq.id, current_user.id)
        for entry in leaderboard:
            if entry["supplier_id"] == current_user.id:
                my_rank = entry["rank"]
                my_latest_bid_amount = entry["total_amount"]
                break

    # Build invitations list with carrier names
    invitations_resp = []
    for inv in rfq.invitations:
        sup_user = db.query(User).filter(User.id == inv.supplier_id).first()
        carrier = None
        email = None
        if sup_user:
            email = sup_user.email
            carrier = sup_user.supplier_profile.carrier_name if sup_user.supplier_profile else sup_user.full_name
        
        invitations_resp.append(RFQInvitationResponse(
            id=inv.id,
            supplier_id=inv.supplier_id,
            carrier_name=carrier,
            supplier_email=email,
            invitation_status=inv.invitation_status,
            invited_at=inv.invited_at
        ))

    config_resp = None
    if rfq.auction_config:
        config_resp = AuctionConfigResponse.model_validate(rfq.auction_config)

    return RFQDetailResponse(
        id=rfq.id,
        reference_id=rfq.reference_id,
        buyer_id=rfq.buyer_id,
        buyer_name=rfq.buyer.full_name if rfq.buyer else "Buyer",
        name=rfq.name,
        description=rfq.description,
        service_type=rfq.service_type,
        pickup_location=rfq.pickup_location,
        destination=rfq.destination,
        pickup_at=rfq.pickup_at,
        bid_start_at=rfq.bid_start_at,
        initial_close_at=rfq.initial_close_at,
        current_close_at=rfq.current_close_at,
        forced_close_at=rfq.forced_close_at,
        status=rfq.status,
        created_at=rfq.created_at,
        auction_config=config_resp,
        invitations=invitations_resp,
        current_lowest_bid=lowest_bid,
        my_rank=my_rank,
        my_latest_bid=my_latest_bid_amount
    )

@router.post("/{rfq_id}/publish", response_model=RFQDetailResponse)
def publish_rfq(
    rfq_id: str,
    current_user: User = Depends(require_buyer),
    db: Session = Depends(get_db)
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id, RFQ.buyer_id == current_user.id).first()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    if rfq.status != RFQStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot publish RFQ in '{rfq.status.value}' state."
        )

    now = datetime.utcnow()
    if now >= rfq.bid_start_at:
        rfq.status = RFQStatus.ACTIVE
    else:
        rfq.status = RFQStatus.SCHEDULED

    log = ActivityLog(
        rfq_id=rfq.id,
        actor_id=current_user.id,
        event_type=EventType.AUCTION_ACTIVATED if rfq.status == RFQStatus.ACTIVE else EventType.AUCTION_SCHEDULED,
        description=f"RFQ published by {current_user.full_name}. Status is now {rfq.status.value}.",
        details={"status": rfq.status.value}
    )
    db.add(log)
    db.commit()
    db.refresh(rfq)

    return get_rfq_details(rfq.id, current_user, db)

@router.post("/{rfq_id}/invite")
def invite_suppliers(
    rfq_id: str,
    supplier_ids: List[str],
    current_user: User = Depends(require_buyer),
    db: Session = Depends(get_db)
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id, RFQ.buyer_id == current_user.id).first()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    added_count = 0
    for s_id in supplier_ids:
        existing = (
            db.query(RFQInvitation)
            .filter(RFQInvitation.rfq_id == rfq_id, RFQInvitation.supplier_id == s_id)
            .first()
        )
        if not existing:
            inv = RFQInvitation(
                rfq_id=rfq.id,
                supplier_id=s_id,
                invitation_status=InvitationStatus.INVITED
            )
            db.add(inv)
            added_count += 1

    db.commit()
    return {"message": f"Successfully invited {added_count} suppliers to RFQ."}
