import React from 'react';
import { History, Clock, ArrowUpRight, TrendingDown, ShieldAlert, CheckCircle, AlertCircle } from 'lucide-react';
import { ActivityLog, EventType } from '../types';

interface ActivityLogListProps {
  logs: ActivityLog[];
}

export const ActivityLogList: React.FC<ActivityLogListProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 text-xs">
        No auction activity recorded yet.
      </div>
    );
  }

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'AUCTION_EXTENDED':
        return (
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
            <Clock className="w-4 h-4 animate-spin-slow" />
          </div>
        );
      case 'BID_SUBMITTED':
        return (
          <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
            <TrendingDown className="w-4 h-4" />
          </div>
        );
      case 'RANKING_CHANGED':
        return (
          <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        );
      case 'AUCTION_FORCE_CLOSED':
        return (
          <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
            <ShieldAlert className="w-4 h-4" />
          </div>
        );
      case 'AUCTION_CLOSED':
        return (
          <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
            <CheckCircle className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-slate-100">
        <History className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-800 text-sm">
          Live Auction Audit Log & Extension History
        </h3>
      </div>

      <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
        {logs.map((log) => {
          const isExtension = log.event_type === 'AUCTION_EXTENDED';
          return (
            <div
              key={log.id}
              className={`flex items-start space-x-3 p-3 rounded-lg border transition ${
                isExtension
                  ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                  : 'bg-slate-50/50 border-slate-100'
              }`}
            >
              {getEventIcon(log.event_type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    isExtension ? 'text-amber-800' : 'text-slate-600'
                  }`}>
                    {log.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isExtension ? 'font-medium text-amber-950' : 'text-slate-700'}`}>
                  {log.description}
                </p>
                {log.details?.reason && (
                  <div className="mt-1.5 inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-amber-100/90 text-amber-900 border border-amber-300">
                    Trigger Reason: {log.details.reason}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
