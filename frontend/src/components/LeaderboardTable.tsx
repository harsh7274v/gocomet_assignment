import React from 'react';
import { Trophy, Award, Truck, CheckCircle2, ShieldCheck } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  isBuyer?: boolean;
  onAwardContract?: (supplierId: string, carrierName: string, amount: number) => void;
  awardedSupplierId?: string | null;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  currentUserId,
  isBuyer = false,
  onAwardContract,
  awardedSupplierId,
}) => {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-slate-700">No quotes received yet</h4>
        <p className="text-xs text-slate-500 mt-1">
          Invited carriers have not yet submitted initial quotations for this RFQ.
        </p>
      </div>
    );
  }

  const getRankBadge = (rank: string, rankNumber: number) => {
    if (rankNumber === 1) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
          <Trophy className="w-3.5 h-3.5 mr-1 text-amber-600" />
          L1 (Lowest)
        </span>
      );
    }
    if (rankNumber === 2) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          <Award className="w-3.5 h-3.5 mr-1 text-slate-500" />
          L2
        </span>
      );
    }
    if (rankNumber === 3) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Award className="w-3.5 h-3.5 mr-1 text-amber-700" />
          L3
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
        {rank}
      </span>
    );
  };

  return (
    <div className="bg-[#fdfdfd] rounded-2xl border border-[#e5e5e3] shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-[#e5e5e3] flex items-center justify-between bg-[#fafaf9]">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-neutral-800" />
          <h3 className="font-bold text-neutral-900 text-sm">
            Supplier Leaderboard & Pricing Breakdown
          </h3>
        </div>
        <span className="text-xs font-medium text-neutral-500">
          {entries.length} {entries.length === 1 ? 'Supplier' : 'Suppliers'} Competing
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#fafaf9] text-neutral-600 text-xs font-semibold uppercase tracking-wider border-b border-[#e5e5e3]">
            <tr>
              <th className="px-5 py-3.5">Rank</th>
              <th className="px-5 py-3.5">Carrier / Supplier</th>
              <th className="px-5 py-3.5">Total Quote</th>
              <th className="px-5 py-3.5">Freight</th>
              <th className="px-5 py-3.5">Origin / Dest</th>
              <th className="px-5 py-3.5">Transit</th>
              <th className="px-5 py-3.5">Validity</th>
              <th className="px-5 py-3.5 text-right">Submitted</th>
              {isBuyer && onAwardContract && (
                <th className="px-5 py-3.5 text-right">Procurement Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const isMe = entry.supplier_id === currentUserId;
              const isAwarded = awardedSupplierId === entry.supplier_id;
              return (
                <tr
                  key={entry.supplier_id}
                  className={`transition ${
                    isAwarded
                      ? 'bg-emerald-50/90 font-medium'
                      : isMe
                      ? 'bg-brand-50/70 font-medium'
                      : entry.rank_number === 1
                      ? 'bg-amber-50/30'
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {getRankBadge(entry.rank, entry.rank_number)}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-slate-900">
                        {entry.carrier_name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-black text-white font-mono">
                          You
                        </span>
                      )}
                      {isAwarded && (
                        <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          AWARDED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="font-mono font-bold text-base text-slate-900">
                      ₹{entry.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-600 text-xs">
                    ₹{entry.freight_charges.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-600 text-xs">
                    ₹{entry.origin_charges.toLocaleString('en-IN')} / ₹{entry.destination_charges.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 text-xs">
                    {entry.transit_days} {entry.transit_days === 1 ? 'Day' : 'Days'}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 text-xs">
                    {entry.validity_days} Days
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs text-slate-500 font-mono">
                    {new Date(entry.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  {isBuyer && onAwardContract && (
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      {isAwarded ? (
                        <span className="text-xs font-bold text-emerald-700 flex items-center justify-end">
                          <ShieldCheck className="w-4 h-4 mr-1" /> Contract Awarded
                        </span>
                      ) : (
                        <button
                          onClick={() => onAwardContract(entry.supplier_id, entry.carrier_name, entry.total_amount)}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-black hover:bg-neutral-800 text-white shadow-xs transition border border-black active:scale-[0.98]"
                        >
                          Award Contract
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
