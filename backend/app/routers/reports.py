import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.rfq import RFQ, RFQStatus
from app.models.user import User, UserRole, SupplierProfile
from app.models.activity_log import ActivityLog, EventType
from app.models.bid import Bid
from app.routers.deps import get_current_user, require_buyer
from app.services.ranking_service import RankingService
from app.websockets.connection_manager import ws_manager

router = APIRouter(prefix="/rfqs", tags=["Auction Reports & Awarding"])

@router.get("/{rfq_id}/export-csv")
def export_rfq_bids_csv(
    rfq_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exports all submitted quotations and bids for this RFQ as a downloadable CSV report.
    """
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    bids = (
        db.query(Bid)
        .filter(Bid.rfq_id == rfq_id)
        .order_by(Bid.total_amount.asc(), Bid.submitted_at.asc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Write Header
    writer.writerow([
        "RFQ Reference ID",
        "RFQ Name",
        "Carrier Name",
        "Total Amount (INR)",
        "Freight Charges (INR)",
        "Origin Charges (INR)",
        "Destination Charges (INR)",
        "Transit Days",
        "Validity Days",
        "Submitted At (UTC)"
    ])

    # Fetch carrier names
    supplier_ids = list(set(b.supplier_id for b in bids))
    profiles = db.query(SupplierProfile).filter(SupplierProfile.user_id.in_(supplier_ids)).all()
    carrier_map = {p.user_id: p.carrier_name for p in profiles}

    for b in bids:
        carrier = carrier_map.get(b.supplier_id, "Unknown Carrier")
        writer.writerow([
            rfq.reference_id,
            rfq.name,
            carrier,
            f"{b.total_amount:.2f}",
            f"{b.freight_charges:.2f}",
            f"{b.origin_charges:.2f}",
            f"{b.destination_charges:.2f}",
            b.transit_days,
            b.validity_days,
            b.submitted_at.isoformat()
        ])

    csv_data = output.getvalue()
    filename = f"RFQ_{rfq.reference_id}_Bids_Report.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/{rfq_id}/award")
async def award_contract(
    rfq_id: str,
    supplier_id: str,
    notes: str = "",
    current_user: User = Depends(require_buyer),
    db: Session = Depends(get_db)
):
    """
    Allows the Buyer to officially award the freight contract to a selected carrier.
    """
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id, RFQ.buyer_id == current_user.id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    supplier = db.query(User).filter(User.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Selected supplier not found")

    carrier_name = supplier.supplier_profile.carrier_name if supplier.supplier_profile else supplier.full_name

    # Check latest bid of this supplier
    leaderboard = RankingService.calculate_leaderboard(db, rfq_id)
    supplier_entry = next((e for e in leaderboard if e["supplier_id"] == supplier_id), None)
    awarded_amount = supplier_entry["total_amount"] if supplier_entry else 0.0

    # Ensure RFQ is closed
    if rfq.status not in (RFQStatus.CLOSED, RFQStatus.FORCE_CLOSED):
        rfq.status = RFQStatus.CLOSED
        rfq.current_close_at = datetime.utcnow()

    # Log award activity
    log = ActivityLog(
        rfq_id=rfq.id,
        actor_id=current_user.id,
        event_type=EventType.AUCTION_CLOSED,
        description=f"CONTRACT OFFICIALLY AWARDED to {carrier_name} at final price of ₹{awarded_amount:,.2f} by Buyer {current_user.full_name}.",
        details={
            "awarded_supplier_id": supplier_id,
            "carrier_name": carrier_name,
            "awarded_amount": awarded_amount,
            "notes": notes
        }
    )
    db.add(log)
    db.commit()

    # Broadcast contract award
    await ws_manager.broadcast_to_room(rfq.id, {
        "type": "CONTRACT_AWARDED",
        "rfq_id": rfq.id,
        "winner": carrier_name,
        "amount": awarded_amount,
        "awarded_by": current_user.full_name
    })

    return {
        "status": "success",
        "message": f"Contract successfully awarded to {carrier_name}",
        "awarded_amount": awarded_amount
    }
