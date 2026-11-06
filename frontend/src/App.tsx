import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { BuyerDashboard } from './pages/BuyerDashboard';
import { AuctionDetailsPage } from './pages/AuctionDetailsPage';
import { SupplierDashboard } from './pages/SupplierDashboard';
import { SupplierBiddingPage } from './pages/SupplierBiddingPage';
import { RefreshCw } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-brand-400 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Initializing British Auction Platform...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar onNavigateHome={() => setSelectedRfqId(null)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.role === 'BUYER' ? (
          selectedRfqId ? (
            <AuctionDetailsPage
              rfqId={selectedRfqId}
              onBack={() => setSelectedRfqId(null)}
            />
          ) : (
            <BuyerDashboard onSelectRFQ={setSelectedRfqId} />
          )
        ) : (
          selectedRfqId ? (
            <SupplierBiddingPage
              rfqId={selectedRfqId}
              onBack={() => setSelectedRfqId(null)}
            />
          ) : (
            <SupplierDashboard onSelectRFQ={setSelectedRfqId} />
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        British Auction in RFQ System • Powered by FastAPI & React • Reverse Procurement Engine
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
