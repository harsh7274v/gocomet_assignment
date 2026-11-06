from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.bid import Bid
from app.models.user import User, SupplierProfile

class RankingService:
    @staticmethod
    def get_latest_bids_for_rfq(db: Session, rfq_id: str) -> List[Bid]:
        """
        Retrieves the single latest bid submitted by each unique supplier for a given RFQ.
        """
        # Subquery for maximum submitted_at per supplier for this RFQ
        subquery = (
            db.query(
                Bid.supplier_id,
                func.max(Bid.submitted_at).label("max_submitted")
            )
            .filter(Bid.rfq_id == rfq_id)
            .group_by(Bid.supplier_id)
            .subquery()
        )

        # Join to fetch full Bid rows matching the latest submission
        latest_bids = (
            db.query(Bid)
            .join(
                subquery,
                (Bid.supplier_id == subquery.c.supplier_id) &
                (Bid.submitted_at == subquery.c.max_submitted)
            )
            .filter(Bid.rfq_id == rfq_id)
            .all()
        )

        return latest_bids

    @classmethod
    def calculate_leaderboard(
        cls, 
        db: Session, 
        rfq_id: str, 
        current_user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Calculates sorted leaderboard rankings (L1, L2, L3...) based on lowest total_amount,
        tie-breaking with earlier submission time.
        """
        latest_bids = cls.get_latest_bids_for_rfq(db, rfq_id)
        if not latest_bids:
            return []

        # Sort: total_amount ASC, submitted_at ASC, id ASC
        sorted_bids = sorted(
            latest_bids,
            key=lambda b: (b.total_amount, b.submitted_at, b.id)
        )

        # Pre-fetch carrier names
        supplier_ids = [b.supplier_id for b in sorted_bids]
        profiles = (
            db.query(SupplierProfile)
            .filter(SupplierProfile.user_id.in_(supplier_ids))
            .all()
        )
        carrier_map = {p.user_id: p.carrier_name for p in profiles}

        users = db.query(User).filter(User.id.in_(supplier_ids)).all()
        user_map = {u.id: u.full_name for u in users}

        leaderboard = []
        for index, bid in enumerate(sorted_bids, start=1):
            carrier_name = carrier_map.get(
                bid.supplier_id,
                user_map.get(bid.supplier_id, f"Supplier {index}")
            )
            leaderboard.append({
                "rank": f"L{index}",
                "rank_number": index,
                "supplier_id": bid.supplier_id,
                "carrier_name": carrier_name,
                "total_amount": bid.total_amount,
                "freight_charges": bid.freight_charges,
                "origin_charges": bid.origin_charges,
                "destination_charges": bid.destination_charges,
                "transit_days": bid.transit_days,
                "validity_days": bid.validity_days,
                "submitted_at": bid.submitted_at,
                "is_own_bid": (bid.supplier_id == current_user_id) if current_user_id else False,
            })

        return leaderboard

