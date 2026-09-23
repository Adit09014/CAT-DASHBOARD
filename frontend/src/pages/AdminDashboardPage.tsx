import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../services/auth';
import { Panel } from '../components/Panel';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';

export function AdminDashboardPage() {
  const { logout } = useAuth();
  const operators = useQuery({ queryKey: ['admin-operators'], queryFn: async () => (await api.get('/admin/operators')).data });
  const machines = useQuery({ queryKey: ['admin-machines'], queryFn: async () => (await api.get('/admin/machines')).data });
  const tasks = useQuery({ queryKey: ['admin-tasks'], queryFn: async () => (await api.get('/admin/tasks')).data });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">CAT Guardian</div>
          <h1 className="page-title">Fleet & Assignment Control</h1>
          <p className="page-copy">Transparent AI-assisted assignment using skill match, historical performance, machine suitability, and availability.</p>
        </div>
        <button className="secondary-button" onClick={() => logout()}>Logout</button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Active operators" value={String(operators.data?.length ?? 0)} delta="5 seeded" />
        <MetricCard label="Machines" value={String(machines.data?.length ?? 0)} delta="Fleet ready" />
        <MetricCard label="Tasks" value={String(tasks.data?.length ?? 0)} delta="20+ demo tasks" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Operators">
          <div className="space-y-3">
            {operators.data?.map((operator: any) => (
              <div key={operator.id} className="row-card">
                <div>
                  <div className="font-semibold text-white">{operator.name}</div>
                  <div className="text-sm text-slate-400">{operator.email}</div>
                </div>
                <StatusBadge state="blue" label={operator.role} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Machines">
          <div className="space-y-3">
            {machines.data?.map((machine: any) => (
              <div key={machine.id} className="row-card">
                <div>
                  <div className="font-semibold text-white">{machine.machine_code}</div>
                  <div className="text-sm text-slate-400">{machine.machine_type} · {machine.age_years} years</div>
                </div>
                <StatusBadge state={machine.status === 'active' ? 'green' : 'amber'} label={machine.status} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Assignments and Safety">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tasks.data?.slice(0, 6).map((task: any) => (
            <div key={task.id} className="row-card flex-col items-start">
              <div className="flex w-full items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{task.task_type}</div>
                  <div className="text-sm text-slate-400">{task.description}</div>
                </div>
                <StatusBadge state={task.status === 'scheduled' ? 'blue' : 'green'} label={task.status} />
              </div>
              <div className="mt-3 text-sm text-slate-300">Estimated duration: {task.estimated_duration} min</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
