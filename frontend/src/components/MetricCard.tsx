import React from 'react';
import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  footnote?: string;
  icon?: ReactNode;
  accent?: 'green' | 'yellow' | 'red' | 'blue' | 'neutral';
  dotState?: 'live' | 'warn' | 'danger' | null;
}

export function MetricCard({ label, value, delta, footnote, icon, accent = 'neutral', dotState }: MetricCardProps) {
  const deltaColor =
    accent === 'green'  ? 'text-[var(--green)]'  :
    accent === 'yellow' ? 'text-[var(--yellow)]' :
    accent === 'red'    ? 'text-[var(--red)]'    :
    accent === 'blue'   ? 'text-[var(--blue)]'   :
    'text-[var(--text-secondary)]';

  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between">
        <span className="kpi-label">{label}</span>
        <div className="flex items-center gap-2">
          {dotState && <span className={`dot-${dotState}`} />}
          {icon && <span className="text-[var(--text-muted)]">{icon}</span>}
        </div>
      </div>
      <div className="kpi-value">{value}</div>
      {delta && <div className={`text-xs font-semibold ${deltaColor}`}>{delta}</div>}
      {footnote && <div className="kpi-sub">{footnote}</div>}
    </div>
  );
}
