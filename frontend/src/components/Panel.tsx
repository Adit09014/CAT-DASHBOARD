import type { ReactNode } from 'react';

export function Panel({ title, children, subtle = false }: { title: string; children: ReactNode; subtle?: boolean }) {
  return (
    <section className={subtle ? 'panel-subtle' : 'panel'}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">{title}</h2>
      </div>
      {children}
    </section>
  );
}
