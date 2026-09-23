import type { ReactNode } from 'react';
import clsx from 'clsx';

export function PillButton({ children, active = false, onClick, type = 'button' }: { children: ReactNode; active?: boolean; onClick?: () => void; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={clsx(
        'rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-400/60',
        active ? 'border-amber-400/50 bg-amber-400/15 text-amber-200' : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500 hover:bg-slate-800',
      )}
    >
      {children}
    </button>
  );
}
