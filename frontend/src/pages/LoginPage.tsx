import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowRight, Gauge } from 'lucide-react';
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
      setError('Invalid credentials. Check email and password.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (role: 'operator' | 'admin') => {
    const creds = role === 'operator'
      ? { e: 'operator@catguardian.demo', p: 'Operator123!' }
      : { e: 'admin@catguardian.demo',    p: 'Admin123!' };
    setEmail(creds.e);
    setPassword(creds.p);
    performLogin(creds.e, creds.p);
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        {/* Logo row */}
        <div className="flex items-center gap-3 mb-6">
          <div className="navbar-badge" style={{ width: 40, height: 40, borderRadius: 10, fontSize: '0.65rem' }}>CAT</div>
          <div>
            <div className="text-base font-bold text-[var(--text-primary)] tracking-tight">CAT Guardian</div>
            <div className="text-xs text-[var(--text-muted)]">Industrial AI Co-Pilot</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="dot-live" />
            <span className="text-xs text-[var(--text-muted)]">System Online</span>
          </div>
        </div>

        <hr className="divider mb-6" />

        {/* Quick access */}
        <div className="mb-5">
          <div className="label-caps mb-3">Quick Access</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickLogin('operator')}
              disabled={loading}
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-raised)] hover:border-[var(--yellow-border)] hover:bg-[var(--yellow-dim)] transition-all group"
            >
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">Operator</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Avery Stone · EXC-001</div>
              </div>
              <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--yellow)] transition-colors" />
            </button>

            <button
              type="button"
              onClick={() => quickLogin('admin')}
              disabled={loading}
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-raised)] hover:border-[var(--blue-border)] hover:bg-[var(--blue-dim)] transition-all group"
            >
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">Admin</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Fleet Dispatch</div>
              </div>
              <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--blue)] transition-colors" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); performLogin(email, password); }}
        >
          <div>
            <label className="input-label">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="input-field"
              placeholder="user@catguardian.demo"
            />
          </div>

          <div>
            <label className="input-label">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="alert alert-danger text-xs">
              {error}
            </div>
          )}

          <button
            className="btn btn-primary w-full mt-1"
            type="submit"
            disabled={loading}
          >
            <LogIn size={14} />
            {loading ? 'Authenticating…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center gap-2">
          <Gauge size={12} className="text-[var(--text-muted)]" />
          <span className="text-[11px] text-[var(--text-muted)]">CAT Guardian v2.4 · Demo Environment</span>
        </div>
      </div>
    </div>
  );
}
