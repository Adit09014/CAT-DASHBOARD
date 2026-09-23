import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogIn, ArrowRight, UserCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../services/auth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('operator@catguardian.demo');
  const [password, setPassword] = useState('Operator123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError('');
    setLoading(true);
    try {
      const result = await login(loginEmail, loginPass);
      navigate(result.user.role === 'ADMIN' ? '/admin' : '/operator', { replace: true });
    } catch {
      setError('Invalid authentication credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setRole = (role: 'operator' | 'admin') => {
    if (role === 'operator') {
      setEmail('operator@catguardian.demo');
      setPassword('Operator123!');
      performLogin('operator@catguardian.demo', 'Operator123!');
    } else {
      setEmail('admin@catguardian.demo');
      setPassword('Admin123!');
      performLogin('admin@catguardian.demo', 'Admin123!');
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card border border-amber-500/20 bg-slate-950/90 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="badge-row mb-3">
          <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-amber-500 text-slate-950 text-[10px] font-black">CAT</span>
            <span>Predict. Simulate. Act. Learn.</span>
          </span>
        </div>

        <h1 className="login-title font-black tracking-tight text-white">CAT Guardian</h1>
        <p className="login-copy text-slate-400 text-sm">
          Industrial AI co-pilot for heavy machinery operators and fleet dispatchers.
        </p>

        {/* 1-Click Demo Quick Login Cards */}
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
            1-Click Demo Credentials:
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setRole('operator')}
              className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-left transition-all hover:bg-amber-500/20"
            >
              <div>
                <div className="text-xs font-bold text-amber-300">Operator Dashboard</div>
                <div className="text-[11px] text-slate-400">Avery Stone · EXC-001</div>
              </div>
              <ArrowRight size={16} className="text-amber-400" />
            </button>

            <button
              type="button"
              onClick={() => setRole('admin')}
              className="flex items-center justify-between rounded-xl border border-sky-500/40 bg-sky-500/10 p-3 text-left transition-all hover:bg-sky-500/20"
            >
              <div>
                <div className="text-xs font-bold text-sky-300">Admin Command</div>
                <div className="text-[11px] text-slate-400">Fleet Dispatch & AI Assignment</div>
              </div>
              <ArrowRight size={16} className="text-sky-400" />
            </button>
          </div>
        </div>

        {/* Standard Login Form */}
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            performLogin(email, password);
          }}
        >
          <label className="field">
            <span className="text-xs font-semibold text-slate-300">Workstation Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </label>

          <label className="field">
            <span className="text-xs font-semibold text-slate-300">Security Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2.5 text-xs text-red-200">
              {error}
            </div>
          )}

          <button
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 transition-all hover:from-amber-400 hover:to-amber-500 shadow-xl"
            type="submit"
            disabled={loading}
          >
            <LogIn size={15} />
            {loading ? 'Authenticating with Site Server...' : 'Sign into Workstation'}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800/80 pt-4 text-center text-xs text-slate-500">
          <div>Admin: admin@catguardian.demo / Admin123!</div>
          <div className="mt-1">Operator: operator@catguardian.demo / Operator123!</div>
        </div>
      </div>
    </div>
  );
}
