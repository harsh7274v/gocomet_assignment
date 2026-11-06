import React, { useState } from 'react';
import { Gavel, Truck, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, AlertCircle, Compass, Box } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginInputSchema } from '../schemas';
import { LogisticsCanvasMotion } from '../components/LogisticsCanvasMotion';

export const Login: React.FC = () => {
  const { login, switchDemoUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Zod Schema Validation
    const validation = loginInputSchema.safeParse({ email, password });
    if (!validation.success) {
      const errMap: { email?: string; password?: string } = {};
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as 'email' | 'password';
        if (fieldName && !errMap[fieldName]) {
          errMap[fieldName] = issue.message;
        }
      }
      setFieldErrors(errMap);
      setError(validation.error.issues[0]?.message || 'Please correct the highlighted errors.');
      return;
    }

    setIsLoading(true);
    try {
      await login(validation.data.email, validation.data.password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f7f7f6] overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-neutral-900 selection:text-white">
      {/* Interactive Logistics Canvas Motion (Light Theme) */}
      <LogisticsCanvasMotion />

      {/* Subtle overlay gradient to blend with dusky white background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f7f7f6]/40 via-transparent to-[#f7f7f6]/70 pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT SIDE: Brand, Overview & 1-Click Demo Personas */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white border border-[#e2e2e0] shadow-xs mb-4 text-xs font-mono text-neutral-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>GLOBAL FREIGHT PROCUREMENT ENGINE</span>
              </div>

              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-black text-white rounded-2xl border border-black shadow-lg">
                  <Gavel className="w-7 h-7" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-sans">
                  GoComet British Auction
                </h1>
              </div>

              <p className="text-sm text-neutral-600 max-w-xl leading-relaxed">
                Dynamic reverse procurement platform with automated trigger extensions, live rankings, and forced close ceilings.
              </p>
            </div>

            {/* 1-Click Demo Personas Section */}
            <div className="bg-white/85 backdrop-blur-md border border-[#e2e2e0] rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f0f0ee]">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-neutral-800" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                    1-CLICK DEMO PERSONAS
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-medium text-neutral-500 bg-[#f4f4f2] px-2 py-0.5 rounded-full">
                  Pre-authenticated
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Acme Corp - Buyer */}
                <button
                  type="button"
                  onClick={() => switchDemoUser('buyer')}
                  className="p-3.5 rounded-2xl bg-[#fafaf9] hover:bg-white text-left border border-[#e2e2e0] hover:border-black hover:shadow-md transition text-xs group active:scale-[0.98]"
                >
                  <div className="font-bold text-neutral-900 flex items-center justify-between">
                    <span className="text-sm">Acme Corp</span>
                    <span className="text-[10px] bg-neutral-900 text-white px-2 py-0.5 rounded-full font-mono font-semibold">
                      BUYER
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1 font-medium">Procurement manager</div>
                </button>

                {/* Blue Dart - L1 Leader */}
                <button
                  type="button"
                  onClick={() => switchDemoUser('bluedart')}
                  className="p-3.5 rounded-2xl bg-[#fafaf9] hover:bg-white text-left border border-[#e2e2e0] hover:border-black hover:shadow-md transition text-xs group active:scale-[0.98]"
                >
                  <div className="font-bold text-neutral-900 flex items-center justify-between">
                    <span className="text-sm">Blue Dart</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                      L1 LEADER
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1 font-medium">Holds lowest bid</div>
                </button>

                {/* DHL Express - L2 Carrier */}
                <button
                  type="button"
                  onClick={() => switchDemoUser('dhl')}
                  className="p-3.5 rounded-2xl bg-[#fafaf9] hover:bg-white text-left border border-[#e2e2e0] hover:border-black hover:shadow-md transition text-xs group active:scale-[0.98]"
                >
                  <div className="font-bold text-neutral-900 flex items-center justify-between">
                    <span className="text-sm">DHL Express</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                      L2 CARRIER
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1 font-medium">Challenger quote</div>
                </button>

                {/* FedEx Freight - L3 Carrier */}
                <button
                  type="button"
                  onClick={() => switchDemoUser('fedex')}
                  className="p-3.5 rounded-2xl bg-[#fafaf9] hover:bg-white text-left border border-[#e2e2e0] hover:border-black hover:shadow-md transition text-xs group active:scale-[0.98]"
                >
                  <div className="font-bold text-neutral-900 flex items-center justify-between">
                    <span className="text-sm">FedEx Freight</span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-full font-mono font-bold">
                      L3 CARRIER
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1 font-medium">Invited supplier</div>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Operator Sign In Form */}
          <div className="lg:col-span-5">
            <div className="bg-white py-8 px-6 sm:px-8 shadow-xl rounded-3xl border border-[#e5e5e3]">
              <div className="mb-6">
                <h2 className="text-base font-extrabold text-neutral-900 uppercase tracking-wider">
                  OPERATOR SIGN IN
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Enter your logistics enterprise credentials
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wide">
                    Corporate Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-white ${
                        fieldErrors.email ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20' : 'border-[#d8d8d6] focus:ring-black'
                      } focus:ring-2 outline-none transition font-sans`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-white ${
                        fieldErrors.password ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20' : 'border-[#d8d8d6] focus:ring-black'
                      } focus:ring-2 outline-none transition font-sans`}
                    />
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Black Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50 border border-black active:scale-[0.99] tracking-wider uppercase mt-2"
                >
                  <span>{isLoading ? 'Authenticating...' : 'Sign In to Terminal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-[#ebebe9] text-center text-xs text-neutral-500">
                Demo Password: <code className="font-mono bg-[#f4f4f2] px-2 py-0.5 rounded text-neutral-800 font-bold border border-[#e5e5e3]">password123</code>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
