import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Gavel, 
  Trophy, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  TrendingDown
} from 'lucide-react';
import { api } from '../services/api';
import { RFQListItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatTimeLocal } from '../components/AuctionCountdown';

interface SupplierDashboardProps {
  onSelectRFQ: (rfqId: string) => void;
}

export const SupplierDashboard: React.FC<SupplierDashboardProps> = ({ onSelectRFQ }) => {
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState<RFQListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRFQs = async () => {
    setIsLoading(true);
    try {
      const data = await api.listRFQs();
      setRfqs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRFQs();
    const interval = setInterval(loadRFQs, 10000);
    return () => clearInterval(interval);
  }, []);

  const carrierName = user?.supplier_profile?.carrier_name || user?.full_name || 'Carrier';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#fdfdfd] text-neutral-900 rounded-3xl p-6 shadow-xs border border-[#e5e5e3] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#f0f0ee] text-neutral-800 text-xs font-semibold border border-[#e2e2e0] mb-2 font-mono">
            <Truck className="w-3.5 h-3.5 mr-1" />
            <span>Carrier Bidding Terminal</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Welcome, {carrierName}
          </h1>
          <p className="text-xs text-neutral-500 mt-1 max-w-xl leading-relaxed">
            You are invited to compete in live reverse British Auctions. Submit quotations and counter-bids before closing deadlines to capture the lowest rate position (L1).
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-white p-3.5 rounded-2xl border border-[#e2e2e0] shadow-xs">
          <Trophy className="w-6 h-6 text-neutral-800" />
          <div>
            <div className="text-[11px] text-neutral-500 uppercase font-semibold">Your Strategy</div>
            <div className="text-xs font-bold text-neutral-900">Capture & Defend L1 Rank</div>
          </div>
        </div>
      </div>

      {/* Available RFQs List */}
      <div className="bg-[#fdfdfd] rounded-2xl border border-[#e5e5e3] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e5e5e3] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center space-x-2">
            <Gavel className="w-5 h-5 text-neutral-800" />
            <h2 className="text-sm font-bold text-neutral-900">
              Invited British Auctions ({rfqs.length})
            </h2>
          </div>
          <span className="text-xs text-neutral-500 font-medium">Live reverse bidding active</span>
        </div>

        <div className="divide-y divide-[#ececeb]">
          {rfqs.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 text-xs">
              No RFQs found for your carrier profile.
            </div>
          ) : (
            rfqs.map((rfq) => (
              <div
                key={rfq.id}
                className="p-5 hover:bg-[#fafaf9] transition flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                      {rfq.reference_id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      rfq.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {rfq.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-neutral-900 text-base">{rfq.name}</h3>
                  <div className="text-xs text-neutral-500 flex items-center space-x-2">
                    <span>{rfq.pickup_location} → {rfq.destination}</span>
                    <span>•</span>
                    <span>{rfq.service_type}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  {/* Target budget ceiling */}
                  {rfq.target_budget && (
                    <div>
                      <div className="text-[11px] font-semibold text-neutral-400 uppercase">
                        Budget Ceiling
                      </div>
                      <div className="text-base font-mono font-bold text-neutral-900">
                        ₹{rfq.target_budget.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </div>
                    </div>
                  )}

                  {/* Current lowest price */}
                  <div>
                    <div className="text-[11px] font-semibold text-neutral-400 uppercase">
                      Current L1 Price
                    </div>
                    <div className="text-base font-mono font-extrabold text-neutral-900">
                      {rfq.current_lowest_bid ? (
                        `₹${rfq.current_lowest_bid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-neutral-400 text-xs italic">No bids placed</span>
                      )}
                    </div>
                  </div>

                  {/* Close deadline */}
                  <div>
                    <div className="text-[11px] font-semibold text-neutral-400 uppercase">
                      Close Deadline
                    </div>
                    <div className="text-xs font-mono font-medium text-neutral-700">
                      {formatTimeLocal(rfq.current_close_at)}
                    </div>
                  </div>

                  {/* Black Action Button */}
                  <button
                    onClick={() => onSelectRFQ(rfq.id)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition shadow-xs border border-black active:scale-[0.98]"
                  >
                    <span>Enter Bidding Terminal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

