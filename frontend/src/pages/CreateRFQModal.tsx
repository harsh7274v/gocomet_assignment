import React, { useState, useEffect } from 'react';
import { X, Gavel, Calendar, MapPin, Truck, Check, AlertCircle, Clock, CheckCircle2, ShieldAlert, IndianRupee } from 'lucide-react';
import { api } from '../services/api';
import { ExtensionTrigger } from '../types';

interface CreateRFQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Format Date object to local datetime-local string (YYYY-MM-DDTHH:mm)
function formatToLocalDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getInitialTimes() {
  const now = new Date();
  const start = new Date(now.getTime() - 2 * 60 * 1000); // 2 mins ago so auction starts immediately
  const close = new Date(now.getTime() + 25 * 60 * 1000); // 25 mins from now
  const forced = new Date(now.getTime() + 55 * 60 * 1000); // 55 mins from now (+30m after close)
  const pickup = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
  return {
    start: formatToLocalDateTime(start),
    close: formatToLocalDateTime(close),
    forced: formatToLocalDateTime(forced),
    pickup: formatToLocalDateTime(pickup),
  };
}

interface MouseDateTimePickerProps {
  label: string;
  icon?: React.ReactNode;
  value: string; // format: YYYY-MM-DDTHH:mm
  onChange: (val: string) => void;
  helperText?: React.ReactNode;
  presets?: { label: string; onClick: () => void }[];
  containerClassName?: string;
}

const MouseDateTimePicker: React.FC<MouseDateTimePickerProps> = ({
  label,
  icon,
  value,
  onChange,
  helperText,
  presets,
  containerClassName = '',
}) => {
  const [datePart = '', timePart = ''] = (value || '').split('T');

  const handleDateChange = (newDate: string) => {
    const t = timePart || '12:00';
    onChange(`${newDate}T${t}`);
  };

  const handleTimeChange = (newTime: string) => {
    const d = datePart || formatToLocalDateTime(new Date()).split('T')[0];
    onChange(`${d}T${newTime}`);
  };

  return (
    <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${containerClassName}`}>
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center">
          {icon}
          <span className="ml-1">{label}</span>
        </label>

        {/* Date and Time Inputs with Icons */}
        <div className="space-y-2">
          {/* Date Picker (Calendar) */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <input
              type="date"
              required
              value={datePart}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 cursor-pointer"
            />
          </div>

          {/* Time Picker (Clock) */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-brand-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <input
              type="time"
              required
              value={timePart}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 cursor-pointer"
            />
          </div>
        </div>

        {/* Quick Presets */}
        {presets && presets.length > 0 && (
          <div className="flex items-center space-x-1 mt-2.5 flex-wrap gap-y-1">
            <span className="text-[10px] text-slate-400 mr-0.5">Presets:</span>
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={p.onClick}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {helperText && <div className="mt-2 pt-1.5 border-t border-slate-200/60">{helperText}</div>}
    </div>
  );
};

export const CreateRFQModal: React.FC<CreateRFQModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const initTimes = getInitialTimes();

  const [name, setName] = useState('Delhi to Mumbai Express FTL Freight');
  const [description, setDescription] = useState('Full truckload commercial transit with British Auction bidding');
  const [serviceType, setServiceType] = useState('Full Truckload (FTL)');
  const [pickupLocation, setPickupLocation] = useState('Delhi Hub, NH48');
  const [destination, setDestination] = useState('Mumbai Logistics Hub');
  const [targetBudget, setTargetBudget] = useState<number>(60000);
  
  // Synchronous initialization with local time
  const [pickupAt, setPickupAt] = useState(initTimes.pickup);
  const [bidStartAt, setBidStartAt] = useState(initTimes.start);
  const [initialCloseAt, setInitialCloseAt] = useState(initTimes.close);
  const [forcedCloseAt, setForcedCloseAt] = useState(initTimes.forced);

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

  // Refresh available suppliers whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const times = getInitialTimes();
      setBidStartAt(times.start);
      setInitialCloseAt(times.close);
      setForcedCloseAt(times.forced);
      setPickupAt(times.pickup);
      setError(null);

      api.listSuppliers().then((sups) => {
        setAvailableSuppliers(sups);
        setSelectedSupplierIds(sups.map((s) => s.id));
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Real-time timing calculations & validations
  const startTimeMs = bidStartAt ? new Date(bidStartAt).getTime() : 0;
  const closeTimeMs = initialCloseAt ? new Date(initialCloseAt).getTime() : 0;
  const forcedTimeMs = forcedCloseAt ? new Date(forcedCloseAt).getTime() : 0;

  const isStartBeforeClose = closeTimeMs > startTimeMs;
  const isCloseBeforeForced = forcedTimeMs > closeTimeMs;
  const forcedDiffMinutes = closeTimeMs && forcedTimeMs ? Math.round((forcedTimeMs - closeTimeMs) / (60 * 1000)) : 0;

  // Auto-bump helper when close time changes
  const handleCloseTimeChange = (newCloseVal: string) => {
    setInitialCloseAt(newCloseVal);
    const newCloseMs = new Date(newCloseVal).getTime();
    if (!isNaN(newCloseMs)) {
      if (forcedTimeMs <= newCloseMs) {
        const bumpedForced = new Date(newCloseMs + 30 * 60 * 1000);
        setForcedCloseAt(formatToLocalDateTime(bumpedForced));
      }
    }
  };

  // Quick preset helpers
  const applyClosePreset = (minutesFromStart: number) => {
    const base = startTimeMs ? new Date(startTimeMs) : new Date();
    const newClose = new Date(base.getTime() + minutesFromStart * 60 * 1000);
    setInitialCloseAt(formatToLocalDateTime(newClose));
    
    // Auto-set forced close to +30m after new close
    const newForced = new Date(newClose.getTime() + 30 * 60 * 1000);
    setForcedCloseAt(formatToLocalDateTime(newForced));
  };

  const applyStartPreset = (minutesFromNow: number) => {
    const newStart = new Date(Date.now() + minutesFromNow * 60 * 1000);
    setBidStartAt(formatToLocalDateTime(newStart));
  };

  const applyForcedPreset = (minutesAfterClose: number) => {
    const base = closeTimeMs ? new Date(closeTimeMs) : new Date();
    const newForced = new Date(base.getTime() + minutesAfterClose * 60 * 1000);
    setForcedCloseAt(formatToLocalDateTime(newForced));
  };

  const toggleSupplier = (id: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Auto-fill fallback name if empty
    const finalName = name.trim() || `${pickupLocation} to ${destination} Freight`;
    if (!finalName) {
      setError('Please provide an RFQ Name.');
      return;
    }

    // Auto-select all suppliers if none selected
    let finalSupplierIds = selectedSupplierIds;
    if (finalSupplierIds.length === 0 && availableSuppliers.length > 0) {
      finalSupplierIds = availableSuppliers.map((s) => s.id);
      setSelectedSupplierIds(finalSupplierIds);
    }

    if (finalSupplierIds.length === 0) {
      setError('Please select at least one carrier to invite.');
      return;
    }

    // Validate and auto-fix timings if needed
    let startMs = new Date(bidStartAt).getTime();
    let closeMs = new Date(initialCloseAt).getTime();
    let forcedMs = new Date(forcedCloseAt).getTime();

    if (isNaN(startMs) || isNaN(closeMs) || isNaN(forcedMs)) {
      setError('Please enter valid dates and times for auction schedule.');
      return;
    }

    // Auto-fix if close <= start
    if (closeMs <= startMs) {
      closeMs = startMs + 20 * 60 * 1000;
      setInitialCloseAt(formatToLocalDateTime(new Date(closeMs)));
    }

    // Auto-fix if forced <= close
    if (forcedMs <= closeMs) {
      forcedMs = closeMs + 30 * 60 * 1000;
      setForcedCloseAt(formatToLocalDateTime(new Date(forcedMs)));
    }

    setIsSubmitting(true);
    try {
      await api.createRFQ({
        name: finalName,
        description,
        service_type: serviceType,
        pickup_location: pickupLocation || 'Origin Hub',
        destination: destination || 'Destination Hub',
        pickup_at: new Date(pickupAt).toISOString(),
        target_budget: targetBudget > 0 ? targetBudget : undefined,
        bid_start_at: new Date(startMs).toISOString(),
        initial_close_at: new Date(closeMs).toISOString(),
        forced_close_at: new Date(forcedMs).toISOString(),
        enable_british_auction: enableBritishAuction,
        auction_config: enableBritishAuction ? {
          trigger_window_minutes: triggerWindowMinutes,
          extension_duration_minutes: extensionDurationMinutes,
          extension_trigger: extensionTrigger,
        } : undefined,
        invited_supplier_ids: finalSupplierIds,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="relative bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Gavel className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-bold">Create RFQ with British Auction</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex-shrink-0 mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Section 1: Shipment Details */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center">
                <Truck className="w-4 h-4 mr-1.5 text-brand-600" />
                1. Shipment & Service Requirements
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">RFQ Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Delhi to Mumbai Express FTL Freight"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition bg-white"
                  />
                </div>

                {/* Origin and Destination with clean responsive grid and dedicated icons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Origin (Pickup Location) *
                    </label>
                    <div className="relative rounded-lg">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Delhi Hub, NH48"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none transition bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Destination *
                    </label>
                    <div className="relative rounded-lg">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4 text-rose-600" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mumbai Logistics Hub"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none transition bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Service Type</label>
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white transition"
                    >
                      <option value="Full Truckload (FTL)">Full Truckload (FTL)</option>
                      <option value="Less Than Truckload (LTL)">Less Than Truckload (LTL)</option>
                      <option value="Dedicated Fleet">Dedicated Fleet</option>
                      <option value="Cold Chain Freight">Cold Chain Freight</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-brand-600" />
                      Pickup Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={pickupAt.split('T')[0] || ''}
                      onChange={(e) => setPickupAt(`${e.target.value}T10:00`)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none transition bg-white font-medium cursor-pointer"
                    />
                  </div>
                </div>

                {/* Target Budget Ceiling with Dragging Bar */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center">
                      <IndianRupee className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Target Budget Ceiling (Maximum Allowed Bid) *
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs text-slate-500 font-medium">Selected Budget:</span>
                      <span className="font-mono text-base font-extrabold text-emerald-700">
                        ₹{targetBudget.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Range Slider Dragging Bar */}
                  <div className="space-y-1.5">
                    <input
                      type="range"
                      min="10000"
                      max="300000"
                      step="5000"
                      value={targetBudget}
                      onChange={(e) => setTargetBudget(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>₹10,000</span>
                      <span>₹75,000</span>
                      <span>₹1,50,000</span>
                      <span>₹2,25,000</span>
                      <span>₹3,00,000</span>
                    </div>
                  </div>

                  {/* Quick Presets for Budget */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/60 flex-wrap gap-2">
                    <span className="text-[11px] text-slate-500 flex items-center">
                      <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-500" />
                      Suppliers cannot bid higher than this budget.
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {[35000, 50000, 60000, 80000, 100000, 150000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTargetBudget(amt)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition ${
                            targetBudget === amt 
                              ? 'bg-brand-600 text-white shadow-xs' 
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          ₹{(amt / 1000).toFixed(0)}k
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          {/* Section 2: Auction Schedule & Forced Close */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
                <Calendar className="w-4 h-4 mr-1.5 text-brand-600" />
                2. Auction Timings & Hard Ceiling
              </h3>
              <span className="text-[11px] text-slate-400">Select Date & Time with Mouse or Presets</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bid Start Time */}
              <MouseDateTimePicker
                label="Bid Start Time *"
                icon={<Clock className="w-3.5 h-3.5 text-slate-500" />}
                value={bidStartAt}
                onChange={setBidStartAt}
                containerClassName="bg-slate-50/60 border-slate-200"
                presets={[
                  { label: 'Start Now', onClick: () => applyStartPreset(-1) },
                  { label: '+15m', onClick: () => applyStartPreset(15) },
                  { label: '+1h', onClick: () => applyStartPreset(60) },
                ]}
                helperText={<span className="text-[10px] text-slate-500 block">When bidding opens.</span>}
              />

              {/* Bid Close Time */}
              <MouseDateTimePicker
                label="Bid Close Time (Scheduled) *"
                icon={<Clock className="w-3.5 h-3.5 text-brand-600" />}
                value={initialCloseAt}
                onChange={handleCloseTimeChange}
                containerClassName={!isStartBeforeClose ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50/60 border-slate-200'}
                presets={[
                  { label: '+15m', onClick: () => applyClosePreset(15) },
                  { label: '+30m', onClick: () => applyClosePreset(30) },
                  { label: '+1h', onClick: () => applyClosePreset(60) },
                  { label: '+2h', onClick: () => applyClosePreset(120) },
                ]}
                helperText={
                  !isStartBeforeClose ? (
                    <span className="text-[10px] text-amber-600 font-semibold block">⚠️ Must be later than Start Time!</span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1 flex-shrink-0" />
                      Valid close time
                    </span>
                  )
                }
              />

              {/* Forced Close Time */}
              <MouseDateTimePicker
                label="Forced Close Time (Ceiling) *"
                icon={<ShieldAlert className="w-3.5 h-3.5 text-slate-600" />}
                value={forcedCloseAt}
                onChange={setForcedCloseAt}
                containerClassName={!isCloseBeforeForced ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50/60 border-slate-200'}
                presets={[
                  { label: '+15m', onClick: () => applyForcedPreset(15) },
                  { label: '+30m', onClick: () => applyForcedPreset(30) },
                  { label: '+1h', onClick: () => applyForcedPreset(60) },
                ]}
                helperText={
                  isCloseBeforeForced ? (
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 flex-shrink-0" />
                      Valid (+{forcedDiffMinutes}m buffer for extensions)
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600 font-bold block">
                      ⚠️ Must be later than Scheduled Close Time!
                    </span>
                  )
                }
              />
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

          </div>

          {/* Sticky Footer Actions */}
          <div className="flex-shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {isSubmitting ? 'Creating & Publishing RFQ...' : 'Create & Publish RFQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
