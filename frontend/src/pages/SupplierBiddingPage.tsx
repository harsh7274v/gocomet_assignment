import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Trophy, 
  Award, 
  Send, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert,
  Wifi,
  WifiOff,
  RefreshCw,
  Info,
  IndianRupee
} from 'lucide-react';
import { api } from '../services/api';
import { RFQDetail, LeaderboardResponse, ActivityLog, Bid } from '../types';
import { AuctionCountdown } from '../components/AuctionCountdown';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { ActivityLogList } from '../components/ActivityLogList';
import { ExtensionBanner } from '../components/ExtensionBanner';
import { useAuctionSocket } from '../hooks/useAuctionSocket';
import { useAuth } from '../context/AuthContext';
import { submitBidInputSchema } from '../schemas';

interface SupplierBiddingPageProps {
  rfqId: string;
  onBack: () => void;
}

export const SupplierBiddingPage: React.FC<SupplierBiddingPageProps> = ({ rfqId, onBack }) => {
  const { user } = useAuth();
  const [rfq, setRfq] = useState<RFQDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form Inputs
  const [freightCharges, setFreightCharges] = useState<number>(40000);
  const [originCharges, setOriginCharges] = useState<number>(2000);
  const [destinationCharges, setDestinationCharges] = useState<number>(3000);
  const [transitDays, setTransitDays] = useState<number>(2);
  const [validityDays, setValidityDays] = useState<number>(15);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Real-time WebSockets
  const { isConnected, latestEvent, extensionNotice, dismissNotice } = useAuctionSocket(rfqId);

  const calculatedTotal = Number(freightCharges || 0) + Number(originCharges || 0) + Number(destinationCharges || 0);

  const fetchFullState = async () => {
    try {
      const [rfqData, lbData, myBidsData, logsData] = await Promise.all([
        api.getRFQ(rfqId),
        api.getLeaderboard(rfqId),
        api.getMyBids(rfqId),
        api.getActivityLogs(rfqId),
      ]);
      setRfq(rfqData);
      setLeaderboard(lbData);
      setMyBids(myBidsData);
      setActivityLogs(logsData);

      // Pre-fill rebid inputs with a suggested lower bid
      const marketLowest = lbData.lowest_bid_amount || null;
      if (myBidsData.length > 0) {
        const last = myBidsData[0];
        const target = marketLowest 
          ? Math.min(last.total_amount - 1000, marketLowest - 500)
          : last.total_amount - 1000;
        const suggestedFreight = Math.max(1000, target - last.origin_charges - last.destination_charges);
        setFreightCharges(suggestedFreight);
        setOriginCharges(last.origin_charges);
        setDestinationCharges(last.destination_charges);
        setTransitDays(last.transit_days);
        setValidityDays(last.validity_days);
      } else if (marketLowest) {
        // First bid by this carrier, but market already has a lowest quote: suggest undercutting market L1
        const target = Math.max(1000, marketLowest - 1000);
        const suggestedFreight = Math.max(1000, target - 2000 - 3000);
        setFreightCharges(suggestedFreight);
        setOriginCharges(2000);
        setDestinationCharges(3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFullState();
  }, [rfqId]);

  // Handle WebSocket updates
  useEffect(() => {
    if (latestEvent) {
      if (latestEvent.current_close_at && rfq) {
        setRfq((prev) => prev ? { ...prev, current_close_at: latestEvent.current_close_at! } : null);
      }
      api.getLeaderboard(rfqId).then(setLeaderboard).catch(console.error);
      api.getActivityLogs(rfqId).then(setActivityLogs).catch(console.error);
      api.getMyBids(rfqId).then(setMyBids).catch(console.error);
    }
  }, [latestEvent, rfqId]);

  // Supplier's current personal rank and market lowest
  const myEntry = leaderboard?.entries.find((e) => e.supplier_id === user?.id);
  const myRank = myEntry?.rank || 'Unranked';
  const myLatestBidAmount = myBids.length > 0 ? myBids[0].total_amount : null;
  const currentLowestOfAll = leaderboard?.lowest_bid_amount ?? null;
  const isL1 = myRank === 'L1';

  // Comparative status against current market lowest
  const isLowerThanLowest = currentLowestOfAll === null || calculatedTotal < currentLowestOfAll;
  const isEqualLowest = currentLowestOfAll !== null && calculatedTotal === currentLowestOfAll;
  const isHigherThanLowest = currentLowestOfAll !== null && calculatedTotal > currentLowestOfAll;
  const isExceedingBudget = rfq?.target_budget !== undefined && rfq?.target_budget !== null && calculatedTotal > rfq.target_budget;

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Zod Schema Validation
    const validation = submitBidInputSchema.safeParse({
      freight_charges: Number(freightCharges),
      origin_charges: Number(originCharges),
      destination_charges: Number(destinationCharges),
      validity_days: Number(validityDays),
    });

    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message || 'Please check the bid amounts entered.');
      return;
    }

    if (calculatedTotal <= 0) {
      setErrorMessage('Total quotation must be greater than zero.');
      return;
    }

    if (isExceedingBudget) {
      setErrorMessage(`Budget Ceiling Violation: Your quotation (₹${calculatedTotal.toLocaleString()}) exceeds the buyer's maximum target budget of ₹${rfq?.target_budget?.toLocaleString()}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const bidRes = await api.submitBid(rfqId, {
        freight_charges: validation.data.freight_charges,
        origin_charges: validation.data.origin_charges,
        destination_charges: validation.data.destination_charges,
        transit_days: Number(transitDays),
        validity_days: validation.data.validity_days,
      });

      setSuccessMessage(`Bid of ₹${bidRes.total_amount.toLocaleString()} submitted successfully!`);
      await fetchFullState();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit bid.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !rfq) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
          <span>Loading bidding terminal...</span>
        </div>
      </div>
    );
  }

  const isAuctionClosed = rfq.status === 'CLOSED' || rfq.status === 'FORCE_CLOSED';

  return (
    <div className="space-y-6">
      <ExtensionBanner notice={extensionNotice} onDismiss={dismissNotice} />

      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {rfq.reference_id}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 uppercase font-semibold">{rfq.service_type}</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">
              {rfq.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-slate-100 text-slate-600 border-slate-300'
          }`}>
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-ping"></span>
                <span>Live Bidding Stream</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <span>Polling</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Carrier Rank & Market Cockpit Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Your Current Rank Card */}
        <div className={`p-5 rounded-2xl border transition ${
          isL1
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md'
            : myRank !== 'Unranked'
            ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-md'
            : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider opacity-90">
              Your Current Rank
            </span>
            {isL1 ? (
              <Trophy className="w-6 h-6 text-amber-200" />
            ) : (
              <Award className="w-6 h-6 opacity-80" />
            )}
          </div>
          <div className="text-4xl font-extrabold mt-2 font-mono">
            {myRank}
          </div>
          <div className="text-xs mt-2 opacity-95">
            {isL1
              ? '★ You are currently L1 (Lowest Bidder)!'
              : myRank !== 'Unranked'
              ? 'Behind leader. Place lower bid to capture L1!'
              : 'Submit initial quotation below to enter competition.'}
          </div>
        </div>

        {/* Current Lowest Market Bid (L1) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">
              Current Lowest Market Price (L1)
            </div>
            <div className="text-3xl font-mono font-extrabold text-slate-900 mt-2">
              {leaderboard?.lowest_bid_amount ? (
                `₹${leaderboard.lowest_bid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              ) : (
                'No bids yet'
              )}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Winning Carrier:</span>
            <span className="font-semibold text-slate-800">
              {leaderboard?.winning_supplier || 'None'}
            </span>
          </div>
        </div>

        {/* Your Previous Bid */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">
              Your Best Submitted Quote
            </div>
            <div className="text-3xl font-mono font-extrabold text-slate-900 mt-2">
              {myLatestBidAmount ? (
                `₹${myLatestBidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              ) : (
                'None yet'
              )}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Market Lowest (L1):</span>
            <span className="text-[11px] font-semibold text-brand-600">
              {currentLowestOfAll !== null
                ? `₹${currentLowestOfAll.toLocaleString()} (Leader)`
                : 'No bids yet (Open lead)'}
            </span>
          </div>
        </div>

        {/* Target Budget Ceiling */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase flex items-center justify-between">
              <span>Buyer Budget Ceiling</span>
              <IndianRupee className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-mono font-extrabold text-slate-900 mt-2">
              {rfq?.target_budget ? (
                `₹${rfq.target_budget.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
              ) : (
                'No Limit'
              )}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Hard Cap:</span>
            <span className={`text-[11px] font-semibold ${rfq?.target_budget ? 'text-rose-600' : 'text-slate-600'}`}>
              {rfq?.target_budget ? 'Bids above cap blocked' : 'Open target budget'}
            </span>
          </div>
        </div>
      </div>

      {/* Countdown Timer */}
      <AuctionCountdown
        currentCloseAt={rfq.current_close_at}
        forcedCloseAt={rfq.forced_close_at}
        status={rfq.status}
        triggerWindowMinutes={rfq.auction_config?.trigger_window_minutes || 10}
      />

      {/* Bidding Cockpit & Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">
              {myBids.length === 0 ? 'Submit Initial Quotation' : 'Submit Lower Counter-Bid'}
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            British Auction Rules Apply
          </span>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleBidSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Freight Charges (₹) *
              </label>
              <input
                type="number"
                required
                min="100"
                step="100"
                disabled={isAuctionClosed}
                value={freightCharges}
                onChange={(e) => setFreightCharges(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Origin Handling Charges (₹)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                disabled={isAuctionClosed}
                value={originCharges}
                onChange={(e) => setOriginCharges(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination Charges (₹)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                disabled={isAuctionClosed}
                value={destinationCharges}
                onChange={(e) => setDestinationCharges(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Committed Transit Time (Days) *
              </label>
              <input
                type="number"
                required
                min="1"
                max="60"
                disabled={isAuctionClosed}
                value={transitDays}
                onChange={(e) => setTransitDays(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quote Validity Period (Days) *
              </label>
              <input
                type="number"
                required
                min="1"
                max="365"
                disabled={isAuctionClosed}
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          {/* Real-Time Total & Action Bar */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="text-xs font-medium text-slate-500">
                Calculated Total Quotation (Freight + Origin + Destination):
              </div>
              <div className={`font-mono text-2xl font-extrabold ${
                isLowerThanLowest 
                  ? 'text-emerald-700' 
                  : isEqualLowest 
                  ? 'text-amber-600' 
                  : 'text-orange-600'
              }`}>
                ₹{calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>

              {/* Target Budget Ceiling Exceeded Warning */}
              {isExceedingBudget && (
                <div className="text-[11px] text-rose-800 font-bold flex items-center mt-1.5 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-300">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-rose-600 flex-shrink-0" />
                  <span>Budget Limit Exceeded: Your quote of ₹{calculatedTotal.toLocaleString()} exceeds the buyer's maximum ceiling budget of ₹{rfq?.target_budget?.toLocaleString()}. You must lower your quote to submit.</span>
                </div>
              )}

              {/* Dynamic Win-Probability & Bidding Guidance */}
              {!isExceedingBudget && currentLowestOfAll !== null && isLowerThanLowest && (
                <div className="text-[11px] text-emerald-800 font-semibold flex items-center mt-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 flex-shrink-0" />
                  <span>Strong Win Chance (L1): This quote beats the current lowest bid by ₹{(currentLowestOfAll - calculatedTotal).toLocaleString()}! You will capture the #1 leader rank.</span>
                </div>
              )}

              {!isExceedingBudget && currentLowestOfAll !== null && isEqualLowest && (
                <div className="text-[11px] text-amber-800 font-semibold flex items-center mt-1.5 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600 flex-shrink-0" />
                  <span>Tied with Leader: Your quote matches the lowest price (₹{currentLowestOfAll.toLocaleString()}). Tie-breaks favor earlier submissions. Reduce slightly to take the lead.</span>
                </div>
              )}

              {!isExceedingBudget && currentLowestOfAll !== null && isHigherThanLowest && (
                <div className="text-[11px] text-orange-800 font-semibold flex items-center mt-1.5 bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-200">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-orange-600 flex-shrink-0" />
                  <span>Low Winning Chances Guide: Your quote is ₹{(calculatedTotal - currentLowestOfAll).toLocaleString()} higher than the lowest market bid (₹{currentLowestOfAll.toLocaleString()}). In reverse British Auctions, buyers favor lower rates. You can still submit this quote, but lowering your price increases your win probability.</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || calculatedTotal <= 0 || isAuctionClosed || isExceedingBudget}
              className={`inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                isExceedingBudget
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : isLowerThanLowest 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : isHigherThanLowest 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                  : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {isAuctionClosed
                  ? 'Auction Closed'
                  : isExceedingBudget
                  ? 'Exceeds Budget Limit'
                  : isSubmitting
                  ? 'Transmitting Bid...'
                  : myBids.length === 0
                  ? 'Submit Initial Quote'
                  : 'Submit Counter-Bid'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Leaderboard */}
      <LeaderboardTable
        entries={leaderboard?.entries || []}
        currentUserId={user?.id}
        isBuyer={false}
      />

      {/* Activity Log */}
      <ActivityLogList logs={activityLogs} />
    </div>
  );
};

