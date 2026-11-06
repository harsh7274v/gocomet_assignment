import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Gavel, UserCheck, LogOut, ShieldAlert, ArrowLeftRight } from 'lucide-react';

interface NavbarProps {
  currentView?: string;
  onNavigateHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigateHome }) => {
  const { user, logout, switchDemoUser } = useAuth();

  return (
    <header className="bg-[#121316] border-b border-white/10 text-white sticky top-0 z-40 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onNavigateHome}>
            <div className="bg-black border border-white/20 p-2 rounded-xl text-white shadow-md">
              <Gavel className="w-5 h-5 text-neutral-100" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white font-sans">
                GoComet RFQ
              </span>
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-neutral-200 border border-white/10 font-mono uppercase tracking-wider">
                British Auction
              </span>
            </div>
          </div>

          {/* Quick Demo Switcher Bar */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-black/60 px-3 py-1.5 rounded-full border border-white/10 text-xs">
            <span className="text-neutral-400 font-medium flex items-center mr-1 text-[11px]">
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1 text-neutral-400" />
              Switch:
            </span>
            <button
              onClick={() => switchDemoUser('buyer')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                user?.role === 'BUYER'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Buyer (Acme)
            </button>
            <button
              onClick={() => switchDemoUser('bluedart')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                user?.supplier_profile?.carrier_name?.includes('Blue Dart')
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Blue Dart (L1)
            </button>
            <button
              onClick={() => switchDemoUser('dhl')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                user?.supplier_profile?.carrier_name?.includes('DHL')
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              DHL (L2)
            </button>
            <button
              onClick={() => switchDemoUser('fedex')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                user?.supplier_profile?.carrier_name?.includes('FedEx')
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              FedEx (L3)
            </button>
            <button
              onClick={() => switchDemoUser('delhivery')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                user?.supplier_profile?.carrier_name?.includes('Delhivery')
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Delhivery
            </button>
          </div>

          {/* User Profile & Actions */}
          {user && (
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-white leading-tight">
                  {user.supplier_profile?.carrier_name || user.full_name}
                </div>
                <div className="text-xs text-slate-400 flex items-center justify-end space-x-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${user.role === 'BUYER' ? 'bg-indigo-400' : 'bg-emerald-400'}`}></span>
                  <span>{user.role === 'BUYER' ? 'Enterprise Buyer' : 'Freight Carrier'}</span>
                </div>
              </div>

              <button
                onClick={logout}
                title="Log out"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

