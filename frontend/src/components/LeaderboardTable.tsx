import React from 'react';
import { Trophy, Award, Truck, CheckCircle2 } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  isBuyer?: boolean;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  currentUserId,
  isBuyer = false,
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-slate-800 text-sm">
            Supplier Leaderboard & Pricing Breakdown
          </h3>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {entries.length} {entries.length === 1 ? 'Supplier' : 'Suppliers'} Competing
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Rank</th>
              <th className="px-5 py-3.5">Carrier / Supplier</th>
              <th className="px-5 py-3.5">Total Quote</th>
              <th className="px-5 py-3.5">Freight</th>
              <th className="px-5 py-3.5">Origin / Dest</th>
              <th className="px-5 py-3.5">Transit</th>
              <th className="px-5 py-3.5">Validity</th>
              <th className="px-5 py-3.5 text-right">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const isMe = entry.supplier_id === currentUserId;
              return (
                <tr
                  key={entry.supplier_id}
                  className={`transition ${
                    isMe
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
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-600 text-white">
                          You
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
