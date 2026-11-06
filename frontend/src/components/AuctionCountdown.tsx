import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, AlertTriangle } from 'lucide-react';
import { RFQStatus } from '../types';

interface AuctionCountdownProps {
  currentCloseAt: string;
  forcedCloseAt: string;
  status: RFQStatus;
  triggerWindowMinutes?: number;
}

// Safely parse date strings from backend as UTC
export function parseAsUTC(dateStr: string): number {
  if (!dateStr) return 0;
  const hasTimezone = dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr);
  const normalized = hasTimezone ? dateStr : `${dateStr}Z`;
  return new Date(normalized).getTime();
}

export function formatTimeLocal(dateStr: string): string {
  if (!dateStr) return '--:--';
  const timestamp = parseAsUTC(dateStr);
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const AuctionCountdown: React.FC<AuctionCountdownProps> = ({
  currentCloseAt,
  forcedCloseAt,
  status,
  triggerWindowMinutes = 10,
}) => {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [forcedTimeLeftMs, setForcedTimeLeftMs] = useState<number>(0);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const closeTime = parseAsUTC(currentCloseAt);
      const forcedTime = parseAsUTC(forcedCloseAt);

      setTimeLeftMs(Math.max(0, closeTime - now));
      setForcedTimeLeftMs(Math.max(0, forcedTime - now));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [currentCloseAt, forcedCloseAt]);

  const formatDuration = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isClosed = status === 'CLOSED' || status === 'FORCE_CLOSED' || timeLeftMs <= 0;
  const isInsideTriggerWindow = !isClosed && timeLeftMs <= triggerWindowMinutes * 60 * 1000;
  const isUrgent = !isClosed && timeLeftMs <= 2 * 60 * 1000;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Clock className={`w-5 h-5 ${isUrgent ? 'text-rose-600 animate-pulse' : isInsideTriggerWindow ? 'text-amber-500' : 'text-brand-600'}`} />
          <h3 className="font-semibold text-slate-800 text-sm tracking-wide uppercase">
            Auction Countdown
          </h3>
        </div>
        {isClosed ? (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {status === 'FORCE_CLOSED' ? 'FORCE CLOSED' : 'CLOSED'}
          </span>
        ) : isInsideTriggerWindow ? (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-300 flex items-center space-x-1 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            <span>TRIGGER WINDOW ACTIVE ({triggerWindowMinutes}m)</span>
          </span>
        ) : (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            ACTIVE
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scheduled Close Countdown */}
        <div className={`p-4 rounded-xl border transition ${
          isClosed 
            ? 'bg-slate-50 border-slate-200' 
            : isUrgent 
              ? 'bg-rose-50 border-rose-300 text-rose-900' 
              : isInsideTriggerWindow 
                ? 'bg-amber-50/60 border-amber-300 text-amber-900' 
                : 'bg-brand-50/50 border-brand-200 text-brand-900'
        }`}>
          <div className="text-xs font-medium text-slate-500 mb-1">
            Current Bid Close Deadline
          </div>
          <div className="font-mono text-3xl font-extrabold tracking-tight">
            {isClosed ? '00:00:00' : formatDuration(timeLeftMs)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>Closes at:</span>
            <span className="font-medium text-slate-700 font-mono">
              {formatTimeLocal(currentCloseAt)}
            </span>
          </div>
        </div>

        {/* Forced Close Hard Ceiling */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80">
          <div className="text-xs font-medium text-slate-500 mb-1 flex items-center">
            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Forced Close Hard Ceiling
          </div>
          <div className="font-mono text-3xl font-bold text-slate-700 tracking-tight">
            {formatDuration(forcedTimeLeftMs)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>Hard Deadline:</span>
            <span className="font-medium text-slate-700 font-mono">
              {formatTimeLocal(forcedCloseAt)}
            </span>
          </div>
        </div>
      </div>

      {isInsideTriggerWindow && !isClosed && (
        <div className="mt-3 text-xs text-amber-800 bg-amber-50 rounded-lg p-2.5 border border-amber-200/80 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Extension Monitoring Active:</strong> Any qualifying bidding activity in this window will automatically extend the closing time by configured extra minutes (capped at the hard deadline).
          </span>
        </div>
      )}
    </div>
  );
};
