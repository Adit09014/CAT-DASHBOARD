export function MetricCard({ label, value, delta, footnote }: { label: string; value: string; delta?: string; footnote?: string }) {
  return (
    <div className="metric-card">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div className="text-3xl font-semibold text-white">{value}</div>
        {delta ? <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">{delta}</div> : null}
      </div>
      {footnote ? <div className="mt-3 text-sm text-slate-400">{footnote}</div> : null}
    </div>
  );
}
