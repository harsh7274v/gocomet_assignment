import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Gavel, 
  Clock, 
  CheckCircle2, 
  Users, 
  ArrowRight, 
  Filter, 
  Search, 
  AlertCircle,
  Truck,
  ShieldAlert,
  Ban,
  XCircle,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { RFQListItem, RFQStatus } from '../types';
import { CreateRFQModal } from './CreateRFQModal';
import { formatTimeLocal } from '../components/AuctionCountdown';

interface BuyerDashboardProps {
  onSelectRFQ: (rfqId: string) => void;
}

export const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ onSelectRFQ }) => {
  const [allRfqs, setAllRfqs] = useState<RFQListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Always load all database records for this buyer to guarantee accurate live KPIs
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.listRFQs();
      setAllRfqs(data);
    } catch (err) {
      console.error('Failed to load RFQs from DB:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRFQ = async (rfqId: string, rfqName: string) => {
    const confirmed = window.confirm(`Are you sure you want to cancel the auction "${rfqName}"? This will immediately halt bidding and notify all invited carriers.`);
    if (!confirmed) return;

    setCancellingId(rfqId);
    try {
      await api.cancelRFQ(rfqId);
      await loadData();
    } catch (err: any) {
      alert(`Failed to cancel auction: ${err.message || 'Unknown error'}`);
    } finally {
      setCancellingId(null);
    }
  };

  const handleDeleteRFQ = async (rfqId: string, rfqName: string) => {
    const confirmed = window.confirm(`Delete auction "${rfqName}" permanently from the database?`);
    if (!confirmed) return;

    try {
      await api.deleteRFQ(rfqId);
      await loadData();
    } catch (err: any) {
      alert(`Failed to delete RFQ: ${err.message || 'Unknown error'}`);
    }
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm('Are you sure you want to delete ALL your RFQs from the database? This cannot be undone.');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await api.clearAllRFQs();
      await loadData();
    } catch (err: any) {
      alert(`Failed to clear RFQs: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Compute live aggregates directly from database records
  const totalCount = allRfqs.length;
  const activeCount = allRfqs.filter((r) => r.status === 'ACTIVE').length;
  const closedCount = allRfqs.filter((r) => r.status === 'CLOSED' || r.status === 'FORCE_CLOSED').length;
  const totalBids = allRfqs.reduce((acc, curr) => acc + curr.total_bids_count, 0);

  // Apply status and search filters for presentation
  const filteredRfqs = allRfqs.filter((rfq) => {
    const matchesStatus = statusFilter === 'ALL' || rfq.status === statusFilter;
    const matchesSearch = 
      rfq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.reference_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.pickup_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.destination.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: RFQStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            ACTIVE
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            SCHEDULED
          </span>
        );
      case 'FORCE_CLOSED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3 h-3 mr-1" />
            FORCE CLOSED
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            CLOSED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1" />
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Procurement Auctions Studio
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage live reverse British Auctions with dynamic trigger extensions and forced close rules.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {totalCount > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isDeleting}
              className="inline-flex items-center justify-center px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition space-x-1.5"
              title="Delete all auctions from database"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Clearing...' : 'Clear All'}</span>
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create British Auction RFQ</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total RFQs</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Gavel className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Active Auctions</div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Closed Auctions</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{closedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Total Bids Placed</div>
            <div className="text-2xl font-extrabold text-brand-700 mt-1">{totalBids}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs and Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
            {['ALL', 'ACTIVE', 'SCHEDULED', 'CLOSED', 'CANCELLED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All Auctions' : tab}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search RFQs or routes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">RFQ / Reference ID</th>
                <th className="px-5 py-3.5">Route</th>
                <th className="px-5 py-3.5">Lowest Bid (L1)</th>
                <th className="px-5 py-3.5">Close Deadline</th>
                <th className="px-5 py-3.5">Forced Close</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRfqs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-xs">
                    No RFQs match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRfqs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{rfq.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{rfq.reference_id}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-1.5 text-xs text-slate-700">
                        <span className="font-semibold">{rfq.pickup_location}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-semibold">{rfq.destination}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{rfq.service_type}</div>
                    </td>
                    <td className="px-5 py-4">
                      {rfq.current_lowest_bid ? (
                        <div>
                          <div className="font-mono font-extrabold text-base text-slate-900">
                            ₹{rfq.current_lowest_bid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {rfq.total_bids_count} bids from {rfq.total_suppliers_count} suppliers
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No quotes yet</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-slate-700">
                      {formatTimeLocal(rfq.current_close_at)}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-rose-700 font-semibold">
                      {formatTimeLocal(rfq.forced_close_at)}
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(rfq.status)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {(rfq.status === 'ACTIVE' || rfq.status === 'SCHEDULED') && (
                          <button
                            onClick={() => handleCancelRFQ(rfq.id, rfq.name)}
                            disabled={cancellingId === rfq.id}
                            title="Cancel this Auction"
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{cancellingId === rfq.id ? 'Cancelling...' : 'Cancel'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => onSelectRFQ(rfq.id)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 transition"
                        >
                          <span>Monitor Live</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRFQ(rfq.id, rfq.name)}
                          title="Delete Auction"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateRFQModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};

