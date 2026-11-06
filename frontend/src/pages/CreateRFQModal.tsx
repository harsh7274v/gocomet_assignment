import React, { useState, useEffect } from 'react';
import { X, Gavel, Calendar, MapPin, Truck, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { ExtensionTrigger } from '../types';

interface CreateRFQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRFQModal: React.FC<CreateRFQModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [serviceType, setServiceType] = useState('Full Truckload (FTL)');
  const [pickupLocation, setPickupLocation] = useState('Delhi Hub, NH48');
  const [destination, setDestination] = useState('Mumbai Logistics Hub');
  
  // Timings: Default start now, close in 2 hours, forced in 3 hours
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString().slice(0, 16);
  const defaultClose = new Date(now.getTime() + 15 * 60 * 1000).toISOString().slice(0, 16);
  const defaultForced = new Date(now.getTime() + 45 * 60 * 1000).toISOString().slice(0, 16);
  const defaultPickup = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const [pickupAt, setPickupAt] = useState(defaultPickup);
  const [bidStartAt, setBidStartAt] = useState(defaultStart);
  const [initialCloseAt, setInitialCloseAt] = useState(defaultClose);
  const [forcedCloseAt, setForcedCloseAt] = useState(defaultForced);

  // British Auction Config
  const [enableBritishAuction, setEnableBritishAuction] = useState(true);
  const [triggerWindowMinutes, setTriggerWindowMinutes] = useState(10);
  const [extensionDurationMinutes, setExtensionDurationMinutes] = useState(5);
  const [extensionTrigger, setExtensionTrigger] = useState<ExtensionTrigger>('l1_change');

  // Suppliers
  const [availableSuppliers, setAvailableSuppliers] = useState<{ id: string; carrier_name: string; email: string }[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.listSuppliers().then((sups) => {
        setAvailableSuppliers(sups);
        // Default select all available suppliers
        setSelectedSupplierIds(sups.map((s) => s.id));
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSupplier = (id: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const start = new Date(bidStartAt).getTime();
    const close = new Date(initialCloseAt).getTime();
    const forced = new Date(forcedCloseAt).getTime();

    if (start >= close) {
      setError('Bid Close Time must be strictly later than Bid Start Time.');
      return;
    }
    if (close >= forced) {
      setError('Forced Bid Close Time must be strictly later than Bid Close Time.');
      return;
    }
    if (selectedSupplierIds.length === 0) {
      setError('Please invite at least one supplier to participate in this RFQ.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createRFQ({
        name,
        description,
        service_type: serviceType,
        pickup_location: pickupLocation,
        destination,
        pickup_at: new Date(pickupAt).toISOString(),
        bid_start_at: new Date(bidStartAt).toISOString(),
        initial_close_at: new Date(initialCloseAt).toISOString(),
        forced_close_at: new Date(forcedCloseAt).toISOString(),
        enable_british_auction: enableBritishAuction,
        auction_config: enableBritishAuction ? {
          trigger_window_minutes: triggerWindowMinutes,
          extension_duration_minutes: extensionDurationMinutes,
          extension_trigger: extensionTrigger,
        } : undefined,
        invited_supplier_ids: selectedSupplierIds,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create RFQ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Gavel className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-bold">Create RFQ with British Auction</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1: Shipment Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center">
              <Truck className="w-4 h-4 mr-1.5 text-brand-600" />
              1. Shipment & Service Requirements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">RFQ Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi to Mumbai Express Freight"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Origin (Pickup Location) *</label>
                <input
                  type="text"
                  required
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destination *</label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Type</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                >
                  <option value="Full Truckload (FTL)">Full Truckload (FTL)</option>
                  <option value="Less Than Truckload (LTL)">Less Than Truckload (LTL)</option>
                  <option value="Dedicated Fleet">Dedicated Fleet</option>
                  <option value="Cold Chain Freight">Cold Chain Freight</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pickup / Service Date *</label>
                <input
                  type="datetime-local"
                  required
                  value={pickupAt}
                  onChange={(e) => setPickupAt(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Auction Schedule & Forced Close */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-1.5 text-brand-600" />
              2. Auction Timings & Hard Ceiling
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bid Start Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={bidStartAt}
                  onChange={(e) => setBidStartAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bid Close Time (Scheduled) *</label>
                <input
                  type="datetime-local"
                  required
                  value={initialCloseAt}
                  onChange={(e) => setInitialCloseAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-700 mb-1">Forced Close Time (Hard Ceiling) *</label>
                <input
                  type="datetime-local"
                  required
                  value={forcedCloseAt}
                  onChange={(e) => setForcedCloseAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-2 focus:ring-rose-500 outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Must be later than Bid Close Time.</span>
              </div>
            </div>
          </div>

          {/* Section 3: British Auction Engine Configuration */}
          <div className="pt-4 border-t border-slate-200 bg-slate-50 p-4 rounded-xl border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Gavel className="w-4 h-4 text-brand-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  3. British Auction Configuration
                </h3>
              </div>
              <label className="flex items-center cursor-pointer space-x-2">
                <input
                  type="checkbox"
                  checked={enableBritishAuction}
                  onChange={(e) => setEnableBritishAuction(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-700">Enable Dynamic Extensions</span>
              </label>
            </div>

            {enableBritishAuction && (
              <div className="space-y-4 mt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Trigger Window (X Minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={triggerWindowMinutes}
                      onChange={(e) => setTriggerWindowMinutes(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    />
                    <span className="text-[10px] text-slate-500">Monitors bidding activity in the final X mins before close.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Extension Duration (Y Minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={extensionDurationMinutes}
                      onChange={(e) => setExtensionDurationMinutes(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    />
                    <span className="text-[10px] text-slate-500">Extra minutes added when a trigger condition occurs.</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Extension Trigger Condition
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-start p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                      <input
                        type="radio"
                        name="extensionTrigger"
                        value="bid_received"
                        checked={extensionTrigger === 'bid_received'}
                        onChange={() => setExtensionTrigger('bid_received')}
                        className="mt-0.5 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="ml-3">
                        <span className="block text-xs font-bold text-slate-900">
                          Option A: Bid Received in Last X Minutes
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          Any qualifying bid received in the trigger window extends the auction by Y minutes.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                      <input
                        type="radio"
                        name="extensionTrigger"
                        value="any_rank_change"
                        checked={extensionTrigger === 'any_rank_change'}
                        onChange={() => setExtensionTrigger('any_rank_change')}
                        className="mt-0.5 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="ml-3">
                        <span className="block text-xs font-bold text-slate-900">
                          Option B: Any Supplier Rank Change in Last X Minutes
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          Auction extends only if any supplier rank (e.g. L3 to L2 or L2 to L1) shifts.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                      <input
                        type="radio"
                        name="extensionTrigger"
                        value="l1_change"
                        checked={extensionTrigger === 'l1_change'}
                        onChange={() => setExtensionTrigger('l1_change')}
                        className="mt-0.5 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="ml-3">
                        <span className="block text-xs font-bold text-slate-900">
                          Option C: Lowest Bidder (L1) Rank Change in Last X Minutes (Recommended)
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          Auction extends only when the overall lowest-priced leader (L1) changes.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Supplier Invitations */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              4. Invite Carrier Partners
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableSuppliers.map((sup) => {
                const isSelected = selectedSupplierIds.includes(sup.id);
                return (
                  <div
                    key={sup.id}
                    onClick={() => toggleSupplier(sup.id)}
                    className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/40 text-brand-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{sup.carrier_name}</div>
                      <div className="text-[10px] text-slate-500">{sup.email}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Creating RFQ...' : 'Create & Publish RFQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

