import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Gavel, 
  Calendar, 
  MapPin, 
  Wifi, 
  WifiOff, 
  ShieldAlert, 
  Sliders, 
  TrendingDown, 
  CheckCircle2,
  RefreshCw,
  IndianRupee
} from 'lucide-react';
import { api } from '../services/api';
import { RFQDetail, LeaderboardResponse, ActivityLog } from '../types';
import { AuctionCountdown, formatTimeLocal } from '../components/AuctionCountdown';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { ActivityLogList } from '../components/ActivityLogList';
import { ExtensionBanner } from '../components/ExtensionBanner';
import { useAuctionSocket } from '../hooks/useAuctionSocket';
import { useAuth } from '../context/AuthContext';

interface AuctionDetailsPageProps {
  rfqId: string;
  onBack: () => void;
}

export const AuctionDetailsPage: React.FC<AuctionDetailsPageProps> = ({ rfqId, onBack }) => {
  const { user } = useAuth();
  const [rfq, setRfq] = useState<RFQDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time WebSocket connection hook
  const { isConnected, latestEvent, extensionNotice, dismissNotice } = useAuctionSocket(rfqId);

  const fetchFullState = async () => {
    try {
      const [rfqData, lbData, logsData] = await Promise.all([
        api.getRFQ(rfqId),
        api.getLeaderboard(rfqId),
        api.getActivityLogs(rfqId),
      ]);
      setRfq(rfqData);
      setLeaderboard(lbData);
      setActivityLogs(logsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchFullState();
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFullState();
  }, [rfqId]);

  // When WebSocket pushes an event, update live state
  useEffect(() => {
    if (latestEvent) {
      if (latestEvent.current_close_at && rfq) {
        setRfq((prev) => prev ? { ...prev, current_close_at: latestEvent.current_close_at! } : null);
      }
      // Re-fetch leaderboard and activity logs on any bid or extension
      api.getLeaderboard(rfqId).then(setLeaderboard).catch(console.error);
      api.getActivityLogs(rfqId).then(setActivityLogs).catch(console.error);
    }
  }, [latestEvent, rfqId]);

  if (isLoading || !rfq) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
          <span>Loading auction data...</span>
        </div>
      </div>
    );
  }

  const triggerDescriptions = {
    bid_received: 'Option A: Any bid submitted in the last X minutes triggers extension.',
    any_rank_change: 'Option B: Any change in supplier ranking in the last X minutes triggers extension.',
    l1_change: 'Option C: Change in the lowest bidder (L1) in the last X minutes triggers extension.',
  };

  return (
    <div className="space-y-6">
      {/* Extension Notification Banner */}
      <ExtensionBanner notice={extensionNotice} onDismiss={dismissNotice} />

      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-[#d8d8d6] bg-white hover:bg-neutral-100 text-neutral-800 transition shadow-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                {rfq.reference_id}
              </span>
              <span className="text-xs text-neutral-400">•</span>
              <span className="text-xs font-semibold text-neutral-500 uppercase">{rfq.service_type}</span>
            </div>
            <h1 className="text-xl font-extrabold text-neutral-900 mt-0.5">
              {rfq.name}
            </h1>
          </div>
        </div>

        {/* Live WebSocket Status Indicator */}
        <div className="flex items-center space-x-3">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-neutral-100 text-neutral-600 border-neutral-300'
          }`}>
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-ping"></span>
                <span>Live WebSocket Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 mr-1.5 text-neutral-400" />
                <span>Syncing via Polling</span>
              </>
            )}
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Refresh Live Data"
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-[#d8d8d6] bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-semibold shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-neutral-900' : 'text-neutral-700'}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Shipment & Route Overview Card */}
      <div className="bg-[#fdfdfd] rounded-2xl border border-[#e5e5e3] p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-800 mt-0.5">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Route</div>
            <div className="text-sm font-bold text-slate-900">
              {rfq.pickup_location} → {rfq.destination}
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 mt-0.5">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Pickup Date</div>
            <div className="text-sm font-bold text-slate-900">
              {new Date(rfq.pickup_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 mt-0.5">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Target Budget Ceiling</div>
            <div className="text-base font-mono font-extrabold text-slate-900">
              {rfq.target_budget ? (
                `₹${rfq.target_budget.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
              ) : (
                'No Ceiling'
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              {rfq.target_budget ? 'Max acceptable bid limit' : 'Open target budget'}
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 mt-0.5">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Current Lowest Bid (L1)</div>
            <div className="text-base font-mono font-extrabold text-slate-900">
              {leaderboard?.lowest_bid_amount ? (
                `₹${leaderboard.lowest_bid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              ) : (
                'No bids yet'
              )}
            </div>
            {leaderboard?.winning_supplier && (
              <div className="text-[11px] text-slate-500">Held by {leaderboard.winning_supplier}</div>
            )}
          </div>
        </div>
      </div>

      {/* Countdown and British Auction Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AuctionCountdown
            currentCloseAt={rfq.current_close_at}
            forcedCloseAt={rfq.forced_close_at}
            status={rfq.status}
            triggerWindowMinutes={rfq.auction_config?.trigger_window_minutes || 10}
          />
        </div>

        {/* Configuration Card */}
        <div className="bg-[#fdfdfd] rounded-2xl border border-[#e5e5e3] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-[#e5e5e3]">
              <Sliders className="w-4 h-4 text-neutral-800" />
              <h3 className="font-semibold text-neutral-800 text-xs uppercase tracking-wide">
                British Auction Rules
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Trigger Window (X):</span>
                <span className="font-bold text-slate-900 font-mono">
                  {rfq.auction_config?.trigger_window_minutes || 10} Minutes
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Extension Duration (Y):</span>
                <span className="font-bold text-slate-900 font-mono">
                  +{rfq.auction_config?.extension_duration_minutes || 5} Minutes
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-medium block mb-1">Extension Trigger:</span>
                <span className="font-bold text-brand-700 block bg-brand-50 p-2 rounded-lg border border-brand-200">
                  {triggerDescriptions[rfq.auction_config?.extension_trigger || 'l1_change']}
                </span>
              </div>

              <div className="text-[11px] text-rose-700 bg-rose-50/60 p-2 rounded-lg border border-rose-200 flex items-start space-x-1.5">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>
                  <strong>Forced Close Rule:</strong> All extensions are strictly capped at{' '}
                  <span className="font-mono font-bold">
                    {formatTimeLocal(rfq.forced_close_at)}
                  </span>.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Invited Carriers:</span>
            <span className="font-bold text-slate-800">{rfq.invitations.length} Partners</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <LeaderboardTable
        entries={leaderboard?.entries || []}
        currentUserId={user?.id}
        isBuyer={user?.role === 'BUYER'}
      />

      {/* Activity Logs & Audit History */}
      <ActivityLogList logs={activityLogs} />
    </div>
  );
};
