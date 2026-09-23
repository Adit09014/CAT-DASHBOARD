import type { ReactNode } from 'react';

export function Panel({
  title,
  children,
  subtle = false,
  action,
  icon,
}: {
  title: string;
  children: ReactNode;
  subtle?: boolean;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className={subtle ? 'panel-subtle' : 'panel'}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}

