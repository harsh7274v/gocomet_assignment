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
    <header className="bg-white/95 border-b border-[#e5e5e3] text-neutral-900 sticky top-0 z-40 shadow-xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onNavigateHome}>
            <div className="bg-black p-2 rounded-xl text-white shadow-xs">
              <Gavel className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-neutral-900 font-sans">
                GoComet RFQ
              </span>
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f0f0ee] text-neutral-800 border border-[#e2e2e0] font-mono uppercase tracking-wider">
                British Auction
              </span>
            </div>
          </div>

          {/* Quick Demo Switcher Bar */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-[#f4f4f2] px-3 py-1.5 rounded-full border border-[#e2e2e0] text-xs">
            <span className="text-neutral-500 font-medium flex items-center mr-1 text-[11px]">
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1 text-neutral-500" />
              Switch:
            </span>
            <button
              onClick={() => switchDemoUser('buyer')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                user?.role === 'BUYER'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
              }`}
            >
              Buyer (Acme)
            </button>
            <button
              onClick={() => switchDemoUser('bluedart')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                user?.supplier_profile?.carrier_name?.includes('Blue Dart')
                  ? 'bg-black text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
              }`}
            >
              Blue Dart (L1)
            </button>
            <button
              onClick={() => switchDemoUser('dhl')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                user?.supplier_profile?.carrier_name?.includes('DHL')
                  ? 'bg-black text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
              }`}
            >
              DHL (L2)
            </button>
            <button
              onClick={() => switchDemoUser('fedex')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                user?.supplier_profile?.carrier_name?.includes('FedEx')
                  ? 'bg-black text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
              }`}
            >
              FedEx (L3)
            </button>
            <button
              onClick={() => switchDemoUser('delhivery')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                user?.supplier_profile?.carrier_name?.includes('Delhivery')
                  ? 'bg-black text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
              }`}
            >
              Delhivery
            </button>
          </div>

          {/* User Profile & Actions */}
          {user && (
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-neutral-900 leading-tight">
                  {user.supplier_profile?.carrier_name || user.full_name}
                </div>
                <div className="text-xs text-neutral-500 flex items-center justify-end space-x-1 font-medium">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${user.role === 'BUYER' ? 'bg-neutral-900' : 'bg-emerald-500'}`}></span>
                  <span>{user.role === 'BUYER' ? 'Enterprise Buyer' : 'Freight Carrier'}</span>
                </div>
              </div>

              <button
                onClick={logout}
                title="Log out"
                className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-[#f0f0ee] rounded-xl transition"
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

