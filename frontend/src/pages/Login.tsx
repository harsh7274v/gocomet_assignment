import React, { useState } from 'react';
import { Gavel, Truck, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginInputSchema } from '../schemas';

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
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-brand-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 bg-brand-600 rounded-2xl shadow-lg mb-3">
          <Gavel className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          British Auction in RFQ System
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          Reverse procurement platform with dynamic time extensions and forced close rules.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Quick Demo Launch Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 mb-5 shadow-xl">
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Quick 1-Click Demo Logins
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => switchDemoUser('buyer')}
              className="p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-left border border-slate-600 text-white transition text-xs group"
            >
              <div className="font-bold flex items-center justify-between">
                <span>Acme Corp</span>
                <span className="text-[10px] bg-brand-500/20 text-brand-300 px-1.5 py-0.2 rounded">Buyer</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Full RFQ control</div>
            </button>

            <button
              type="button"
              onClick={() => switchDemoUser('bluedart')}
              className="p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-left border border-slate-600 text-white transition text-xs group"
            >
              <div className="font-bold flex items-center justify-between">
                <span>Blue Dart</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded">L1 Leader</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Holds lowest bid</div>
            </button>

            <button
              type="button"
              onClick={() => switchDemoUser('dhl')}
              className="p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-left border border-slate-600 text-white transition text-xs group"
            >
              <div className="font-bold flex items-center justify-between">
                <span>DHL Express</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">L2 Challenger</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Ready to counter</div>
            </button>

            <button
              type="button"
              onClick={() => switchDemoUser('fedex')}
              className="p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-left border border-slate-600 text-white transition text-xs group"
            >
              <div className="font-bold flex items-center justify-between">
                <span>FedEx Freight</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded">L3 Carrier</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Invited supplier</div>
            </button>
          </div>
        </div>

        {/* Standard Login Form */}
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-8 border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                    fieldErrors.email ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-300 focus:ring-brand-500'
                  } focus:ring-2 outline-none transition`}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                    fieldErrors.password ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-300 focus:ring-brand-500'
                  } focus:ring-2 outline-none transition`}
                />
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In with Credentials'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Default Demo Password for all accounts: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">password123</code>
          </div>
        </div>
      </div>
    </div>
  );
};

