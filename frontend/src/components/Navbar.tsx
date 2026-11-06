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
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onNavigateHome}>
            <div className="bg-brand-600 p-2 rounded-lg text-white shadow-md">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                GoComet RFQ
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                British Auction
              </span>
            </div>
          </div>

          {/* Quick Demo Switcher Bar */}
          <div className="hidden lg:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60 text-xs">
            <span className="text-slate-400 font-medium flex items-center mr-1">
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Demo Switch:
            </span>
            <button
              onClick={() => switchDemoUser('buyer')}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                user?.role === 'BUYER'
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Buyer (Acme)
            </button>
            <button
              onClick={() => switchDemoUser('bluedart')}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                user?.supplier_profile?.carrier_name?.includes('Blue Dart')
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Blue Dart (L1)
            </button>
            <button
              onClick={() => switchDemoUser('dhl')}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                user?.supplier_profile?.carrier_name?.includes('DHL')
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              DHL (L2)
            </button>
            <button
              onClick={() => switchDemoUser('fedex')}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                user?.supplier_profile?.carrier_name?.includes('FedEx')
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              FedEx (L3)
            </button>
            <button
              onClick={() => switchDemoUser('delhivery')}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                user?.supplier_profile?.carrier_name?.includes('Delhivery')
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:bg-slate-700'
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

