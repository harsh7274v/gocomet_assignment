from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from app.models.rfq import RFQ
from app.models.auction_config import AuctionConfiguration, ExtensionTrigger

class ExtensionEvaluationResult:
    def __init__(
        self,
        should_extend: bool,
        previous_close_at: datetime,
        new_close_at: datetime,
        extended_minutes: int,
        reason: str,
        was_clamped_to_forced_close: bool = False
    ):
        self.should_extend = should_extend
        self.previous_close_at = previous_close_at
        self.new_close_at = new_close_at
        self.extended_minutes = extended_minutes
        self.reason = reason
        self.was_clamped_to_forced_close = was_clamped_to_forced_close

    def to_dict(self) -> Dict[str, Any]:
        return {
            "should_extend": self.should_extend,
            "previous_close_at": self.previous_close_at.isoformat() if self.previous_close_at else None,
            "new_close_at": self.new_close_at.isoformat() if self.new_close_at else None,
            "extended_minutes": self.extended_minutes,
            "reason": self.reason,
            "was_clamped_to_forced_close": self.was_clamped_to_forced_close
        }

class ExtensionService:
    @classmethod
    def evaluate_bid_extension(
        cls,
        rfq: RFQ,
        config: Optional[AuctionConfiguration],
        bid_timestamp: datetime,
        old_leaderboard: List[Dict[str, Any]],
        new_leaderboard: List[Dict[str, Any]],
        bidder_carrier_name: str
    ) -> ExtensionEvaluationResult:
        """
        Evaluates whether an incoming bid warrants extending the auction closing time
        based on Trigger Window (X), Extension Duration (Y), and the selected trigger rule.
        """
        if not config:
            return ExtensionEvaluationResult(False, rfq.current_close_at, rfq.current_close_at, 0, "British Auction not configured")

        X_minutes = config.trigger_window_minutes
        Y_minutes = config.extension_duration_minutes
        trigger_mode = config.extension_trigger

        current_close = rfq.current_close_at
        forced_close = rfq.forced_close_at

        # 1. Trigger Window Check
        # Window start = current_close - X minutes
        window_start = current_close - timedelta(minutes=X_minutes)

        if not (window_start <= bid_timestamp < current_close):
            return ExtensionEvaluationResult(
                False, 
                current_close, 
                current_close, 
                0, 
                f"Bid placed outside the trigger window of last {X_minutes} minutes"
            )

        # 2. Check if already reached forced close
        if current_close >= forced_close:
            return ExtensionEvaluationResult(
                False, 
                current_close, 
                current_close, 
                0, 
                "Auction already at Forced Close deadline; no further extensions permitted"
            )

        # 3. Evaluate specific trigger conditions
        triggered = False
        trigger_reason = ""

        if trigger_mode == ExtensionTrigger.BID_RECEIVED:
            # Condition A: Any qualifying bid received in the last X minutes
            triggered = True
            trigger_reason = f"Bid received from {bidder_carrier_name} in the last {X_minutes} minutes"

        elif trigger_mode == ExtensionTrigger.ANY_RANK_CHANGE:
            # Condition B: Any supplier ranking change in last X minutes
            # Compare the order of supplier_ids between old and new leaderboards
            old_order = [entry["supplier_id"] for entry in old_leaderboard]
            new_order = [entry["supplier_id"] for entry in new_leaderboard]

            if old_order != new_order:
                triggered = True
                trigger_reason = f"Supplier rank shift caused by {bidder_carrier_name}'s bid in the last {X_minutes} minutes"
            else:
                return ExtensionEvaluationResult(
                    False, 
                    current_close, 
                    current_close, 
                    0, 
                    "No supplier ranking changed; extension condition not met"
                )

        elif trigger_mode == ExtensionTrigger.L1_CHANGE:
            # Condition C: Lowest Bidder (L1) rank change in last X minutes
            old_l1_supplier = old_leaderboard[0]["supplier_id"] if old_leaderboard else None
            new_l1_supplier = new_leaderboard[0]["supplier_id"] if new_leaderboard else None

            if new_l1_supplier and (new_l1_supplier != old_l1_supplier):
                triggered = True
                trigger_reason = f"New L1 lowest bidder ({bidder_carrier_name}) emerged in the last {X_minutes} minutes"
            else:
                return ExtensionEvaluationResult(
                    False, 
                    current_close, 
                    current_close, 
                    0, 
                    "L1 lowest bidder did not change; extension condition not met"
                )

        if not triggered:
            return ExtensionEvaluationResult(False, current_close, current_close, 0, "Trigger condition not met")

        # 4. Calculate New Close Time: min(current_close + Y, forced_close)
        tentative_close = current_close + timedelta(minutes=Y_minutes)
        was_clamped = False

        if tentative_close >= forced_close:
            new_close = forced_close
            was_clamped = True
            actual_added_seconds = int((forced_close - current_close).total_seconds())
            actual_added_minutes = max(1, actual_added_seconds // 60)
            trigger_reason += f" (Extended to Forced Close ceiling of {forced_close.strftime('%H:%M:%S UTC')})"
        else:
            new_close = tentative_close
            actual_added_minutes = Y_minutes
            trigger_reason += f" (Extended by {Y_minutes} minutes to {new_close.strftime('%H:%M:%S UTC')})"

        return ExtensionEvaluationResult(
            should_extend=True,
            previous_close_at=current_close,
            new_close_at=new_close,
            extended_minutes=actual_added_minutes,
            reason=trigger_reason,
            was_clamped_to_forced_close=was_clamped
        )

