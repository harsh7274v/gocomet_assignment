import React from 'react';
import { Clock, X, AlertTriangle } from 'lucide-react';

interface ExtensionBannerProps {
  notice: {
    extended_minutes: number;
    reason: string;
    new_close_at: string;
    was_clamped_to_forced_close: boolean;
  } | null;
  onDismiss: () => void;
}

export const ExtensionBanner: React.FC<ExtensionBannerProps> = ({ notice, onDismiss }) => {
  if (!notice) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white p-4 shadow-lg sticky top-16 z-30 animate-bounce-short">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Clock className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm uppercase tracking-wide bg-white/20 px-2 py-0.5 rounded text-white">
                AUCTION AUTOMATICALLY EXTENDED
              </span>
              <span className="font-bold text-sm text-amber-100">
                +{notice.extended_minutes} Minutes Added!
              </span>
            </div>
            <p className="text-xs text-amber-50 mt-0.5">
              {notice.reason}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right text-xs hidden sm:block">
            <div className="text-amber-100 font-medium">New Bid Close Time:</div>
            <div className="font-mono font-bold text-white text-sm">
              {new Date(notice.new_close_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

