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
    <div className="relative min-h-screen bg-[#0e1013] overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-white selection:text-black">
      {/* Interactive Logistics Canvas Motion */}
      <LogisticsCanvasMotion />

      {/* Subtle overlay gradient to ensure readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0e1013]/60 via-transparent to-[#0e1013]/90 pointer-events-none z-0" />

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-lg text-center px-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4 text-xs font-mono text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>GLOBAL FREIGHT PROCUREMENT ENGINE</span>
        </div>

        <div className="flex items-center justify-center space-x-3 mb-2">
          <div className="p-2.5 bg-black text-white rounded-2xl border border-white/20 shadow-2xl">
            <Gavel className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            GoComet British Auction
          </h1>
        </div>

        <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
          Dynamic reverse procurement platform with automated trigger extensions, live rankings, and forced close ceilings.
        </p>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Quick Demo Launch Card */}
        <div className="bg-[#181a1f]/85 border border-white/10 backdrop-blur-xl rounded-2xl p-4 mb-4 shadow-2xl">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-200">
                1-Click Demo Personas
              </h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">Pre-authenticated</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => switchDemoUser('buyer')}
              className="p-2.5 rounded-xl bg-black/60 hover:bg-black text-left border border-white/10 text-white transition text-xs group active:scale-[0.98]"
            >
              <div className="font-bold flex items-center justify-between">
                <span>Acme Corp</span>
                <span className="text-[9px] bg-white/15 text-white px-1.5 py-0.5 rounded font-mono">BUYER</span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Procurement manager</div>
            </button>

            <button
              type="button"
              onClick={() => switchDemoUser('bluedart')}
              className="p-2.5 rounded-xl bg-black/60 hover:bg-black text-left border border-white/10 text-white transition text-xs group active:scale-[0.98]"
            >
              <div className="font-bold flex items-center justify-between">
                <span>Blue Dart</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">L1 LEADER</span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Holds lowest bid</div>
            </button>

            <button
              type="button"
              onClick={() => switchDemoUser('dhl')}
              className="p-2.5 rounded-xl bg-black/60 hover:bg-black text-left border border-white/10 text-white transition text-xs group active:scale-[0.98]"
            >
              <div className="font-bold flex items-center justify-between">
                <span>DHL Express</span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">L2 CARRIER</span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Challenger quote</div>
            </button>

            <button
              type="button"
              onClick={() => switchDemoUser('fedex')}
              className="p-2.5 rounded-xl bg-black/60 hover:bg-black text-left border border-white/10 text-white transition text-xs group active:scale-[0.98]"
            >
              <div className="font-bold flex items-center justify-between">
                <span>FedEx Freight</span>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono">L3 CARRIER</span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Invited supplier</div>
            </button>
          </div>
        </div>

        {/* Standard Dusky White Login Form */}
        <div className="bg-[#fbfbfa] py-7 px-6 shadow-2xl rounded-3xl sm:px-8 border border-[#e5e5e3]">
          <div className="mb-4 text-center">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Operator Sign In
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
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
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white ${
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
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white ${
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
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50 border border-black active:scale-[0.99] tracking-wide"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Terminal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-[#ebebe9] text-center text-xs text-neutral-500">
            Demo Password: <code className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800 font-semibold">password123</code>
          </div>
        </div>
      </div>
    </div>
  );
};
