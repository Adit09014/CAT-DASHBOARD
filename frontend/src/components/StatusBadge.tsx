import type { ReactNode } from 'react';
import { CircleAlert, CircleCheckBig, CircleDashed, TriangleAlert } from 'lucide-react';
import clsx from 'clsx';

type Status = 'green' | 'amber' | 'red' | 'blue' | 'neutral';

const palette: Record<Status, { label: string; icon: ReactNode; className: string }> = {
  green: { label: 'Normal', icon: <CircleCheckBig size={14} />, className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  amber: { label: 'Caution', icon: <TriangleAlert size={14} />, className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  red: { label: 'Critical', icon: <CircleAlert size={14} />, className: 'bg-red-500/15 text-red-300 border-red-500/30' },
  blue: { label: 'Info', icon: <CircleDashed size={14} />, className: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  neutral: { label: 'Info', icon: <CircleDashed size={14} />, className: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
};

export function StatusBadge({ state, label }: { state: Status; label?: string }) {
  const selected = palette[state];
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide', selected.className)}>
      {selected.icon}
      {label ?? selected.label}
    </span>
  );
}
