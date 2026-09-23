import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogIn } from 'lucide-react';
import { useAuth } from '../services/auth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('operator@catguardian.demo');
  const [password, setPassword] = useState('Operator123!');
  const [error, setError] = useState('');

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="badge-row">
          <span className="chip"><Shield size={14} /> Predict. Simulate. Act. Learn.</span>
        </div>
        <h1 className="login-title">CAT Guardian</h1>
        <p className="login-copy">Industrial AI co-pilot for operator safety, prediction, simulation, and training.</p>
        <form
          className="mt-8 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            try {
              const result = await login(email, password);
              navigate(result.user.role === 'ADMIN' ? '/admin' : '/operator', { replace: true });
            } catch {
              setError('Invalid credentials.');
            }
          }}
        >
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
          <button className="primary-button" type="submit">
            <LogIn size={16} />
            Sign in
          </button>
        </form>
        <div className="mt-8 grid gap-3 text-sm text-slate-400">
          <div>Admin: admin@catguardian.demo / Admin123!</div>
          <div>Operator: operator@catguardian.demo / Operator123!</div>
        </div>
      </div>
    </div>
  );
}
