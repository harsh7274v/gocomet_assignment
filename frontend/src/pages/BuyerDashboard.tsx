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
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { RFQListItem, RFQStatus } from '../types';
import { CreateRFQModal } from './CreateRFQModal';

interface BuyerDashboardProps {
  onSelectRFQ: (rfqId: string) => void;
}

export const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ onSelectRFQ }) => {
  const [rfqs, setRfqs] = useState<RFQListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.listRFQs(statusFilter === 'ALL' ? undefined : statusFilter);
      setRfqs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const activeCount = rfqs.filter((r) => r.status === 'ACTIVE').length;
  const closedCount = rfqs.filter((r) => r.status === 'CLOSED' || r.status === 'FORCE_CLOSED').length;
  const totalBids = rfqs.reduce((acc, curr) => acc + curr.total_bids_count, 0);

  const filteredRfqs = rfqs.filter((rfq) => {
    const matchesSearch = 
      rfq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.reference_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.pickup_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.destination.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create British Auction RFQ</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total RFQs</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{rfqs.length}</div>
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
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {['ALL', 'ACTIVE', 'SCHEDULED', 'CLOSED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg transition ${
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
                      {new Date(rfq.current_close_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-rose-700 font-semibold">
                      {new Date(rfq.forced_close_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(rfq.status)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => onSelectRFQ(rfq.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 transition"
                      >
                        <span>Monitor Live</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
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
