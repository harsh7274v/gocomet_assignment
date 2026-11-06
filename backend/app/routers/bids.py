from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User, UserRole, SupplierProfile
from app.models.bid import Bid
from app.models.rfq import RFQ
from app.schemas.bid import BidSubmitRequest, BidResponse
from app.routers.deps import get_current_user, require_supplier
from app.services.auction_engine import AuctionEngine

router = APIRouter(prefix="/rfqs", tags=["Bidding"])

@router.post("/{rfq_id}/bids", response_model=BidResponse)
async def submit_bid(
    rfq_id: str,
    bid_in: BidSubmitRequest,
    current_user: User = Depends(require_supplier),
    db: Session = Depends(get_db)
):
    """
    Submits a new quotation or a rebid for an active British Auction RFQ.
    Validates downside pricing, checks extension triggers, logs activities,
    and broadcasts updates to all connected participants over WebSockets.
    """
    new_bid, extension_result, meta = await AuctionEngine.process_bid(
        db=db,
        rfq_id=rfq_id,
        supplier_user=current_user,
        bid_in=bid_in
    )

    carrier = current_user.supplier_profile.carrier_name if current_user.supplier_profile else current_user.full_name
    return BidResponse(
        id=new_bid.id,
        rfq_id=new_bid.rfq_id,
        supplier_id=new_bid.supplier_id,
        carrier_name=carrier,
        freight_charges=new_bid.freight_charges,
        origin_charges=new_bid.origin_charges,
        destination_charges=new_bid.destination_charges,
        total_amount=new_bid.total_amount,
        transit_days=new_bid.transit_days,
        validity_days=new_bid.validity_days,
        submitted_at=new_bid.submitted_at
    )

@router.get("/{rfq_id}/bids", response_model=List[BidResponse])
def get_rfq_bids(
    rfq_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves full bid history. Buyers can see all bids. Suppliers can only see their own bids.
    """
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    query = db.query(Bid).filter(Bid.rfq_id == rfq_id)
    if current_user.role == UserRole.SUPPLIER:
        query = query.filter(Bid.supplier_id == current_user.id)

    bids = query.order_by(Bid.submitted_at.desc()).all()

    # Preload carriers
    supplier_ids = list(set(b.supplier_id for b in bids))
    profiles = db.query(SupplierProfile).filter(SupplierProfile.user_id.in_(supplier_ids)).all()
    carrier_map = {p.user_id: p.carrier_name for p in profiles}

    results = []
    for b in bids:
        carrier = carrier_map.get(b.supplier_id, "Carrier")
        results.append(BidResponse(
            id=b.id,
            rfq_id=b.rfq_id,
            supplier_id=b.supplier_id,
            carrier_name=carrier,
            freight_charges=b.freight_charges,
            origin_charges=b.origin_charges,
            destination_charges=b.destination_charges,
            total_amount=b.total_amount,
            transit_days=b.transit_days,
            validity_days=b.validity_days,
            submitted_at=b.submitted_at
        ))
    return results

@router.get("/{rfq_id}/my-bids", response_model=List[BidResponse])
def get_my_bids(
    rfq_id: str,
    current_user: User = Depends(require_supplier),
    db: Session = Depends(get_db)
):
    """
    Retrieves only the authenticated supplier's bids for this RFQ.
    """
    bids = (
        db.query(Bid)
        .filter(Bid.rfq_id == rfq_id, Bid.supplier_id == current_user.id)
        .order_by(Bid.submitted_at.desc())
        .all()
    )
    carrier = current_user.supplier_profile.carrier_name if current_user.supplier_profile else current_user.full_name
    return [
        BidResponse(
            id=b.id,
            rfq_id=b.rfq_id,
            supplier_id=b.supplier_id,
            carrier_name=carrier,
            freight_charges=b.freight_charges,
            origin_charges=b.origin_charges,
            destination_charges=b.destination_charges,
            total_amount=b.total_amount,
            transit_days=b.transit_days,
            validity_days=b.validity_days,
            submitted_at=b.submitted_at
        )
        for b in bids
    ]

