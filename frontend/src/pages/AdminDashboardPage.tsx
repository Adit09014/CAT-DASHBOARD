import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Sparkles,
  Truck,
  Users,
  CalendarCheck,
  ShieldAlert,
  UserCheck,
  RefreshCcw,
  LogOut,
  Send,
  CheckCircle2,
  ChevronRight,
  TriangleAlert,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../services/auth';
import { Panel } from '../components/Panel';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { AnomalySentinelPanel } from '../components/AnomalySentinelPanel';
import { TimeEstimationPanel } from '../components/TimeEstimationPanel';
import { useLanguage } from '../services/i18n';
import { LanguageSelector } from '../components/LanguageSelector';

type AdminTab = 'overview' | 'duration' | 'sentinel' | 'dispatch' | 'fleet' | 'operators' | 'tasks' | 'safety';

export function AdminDashboardPage() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab]           = useState<AdminTab>('overview');
  const [selectedTaskId, setSelectedTaskId] = useState<number>(1);
  const [assignmentResult, setAssignmentResult] = useState<string | null>(null);
  const [assigning, setAssigning]           = useState(false);

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',   label: t('tab_overview', 'Overview'),               icon: <LayoutDashboard size={15} /> },
    { id: 'duration',   label: t('tab_duration', 'Time Forecaster'),       icon: <Clock size={15} /> },
    { id: 'sentinel',   label: t('tab_alerts', 'Safety Sentinel'),         icon: <TriangleAlert size={15} /> },
    { id: 'dispatch',   label: 'AI Dispatch',                              icon: <Sparkles size={15} /> },
    { id: 'fleet',      label: t('tab_fleet', 'Fleet'),                    icon: <Truck size={15} /> },
    { id: 'operators',  label: t('operator', 'Operators'),                 icon: <Users size={15} /> },
    { id: 'tasks',      label: t('tab_tasks', 'Work Orders'),              icon: <CalendarCheck size={15} /> },
    { id: 'safety',     label: 'Compliance',                               icon: <ShieldAlert size={15} /> },
  ];

  const operators    = useQuery({ queryKey: ['admin-operators'],    queryFn: async () => (await api.get('/admin/operators')).data });
  const machines     = useQuery({ queryKey: ['admin-machines'],     queryFn: async () => (await api.get('/admin/machines')).data });
  const tasks        = useQuery({ queryKey: ['admin-tasks'],        queryFn: async () => (await api.get('/admin/tasks')).data });
  const safetyEvents = useQuery({ queryKey: ['admin-safety-events'],queryFn: async () => (await api.get('/admin/safety-events')).data });
  const anomalyAlerts = useQuery({ queryKey: ['anomaly-alerts'],    queryFn: async () => (await api.get('/anomaly/alerts')).data });
  const recommendation = useQuery({
    queryKey: ['admin-recommendation', selectedTaskId],
    queryFn: async () => (await api.post(`/admin/recommend-assignment?task_id=${selectedTaskId}`)).data,
    enabled: !!selectedTaskId,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-operators'] });
    queryClient.invalidateQueries({ queryKey: ['admin-machines'] });
    queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['admin-safety-events'] });
    queryClient.invalidateQueries({ queryKey: ['anomaly-alerts'] });
  };

  const handleAssign = async () => {
    if (!recommendation.data?.recommended_operator_id) return;
    try {
      setAssigning(true);
      await api.post(`/admin/assign?task_id=${selectedTaskId}&operator_id=${recommendation.data.recommended_operator_id}&machine_id=1`);
      setAssignmentResult(`Operator #${recommendation.data.recommended_operator_id} assigned to Task #${selectedTaskId}.`);
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    } catch {
      setAssignmentResult('Assignment failed. Please retry.');
    } finally {
      setAssigning(false);
    }
  };

  const selectedTask  = tasks.data?.find((t: any) => t.id === selectedTaskId);
  const recData       = recommendation.data;
  const recOperator   = operators.data?.find((o: any) => o.id === recData?.recommended_operator_id);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="navbar">
        <div className="navbar-logo">
          <div className="navbar-badge">CAT</div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
              Fleet Command
              <span className="ml-2 chip chip-yellow text-[9px] py-0.5 align-middle">ADMIN</span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">Heavy Equipment Dispatch Console</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('duration')}
            className="btn btn-secondary gap-1.5 text-xs border-yellow-500/40 text-yellow-300 hover:border-yellow-400 bg-yellow-950/20"
            title="Open Fleet Task Completion Forecaster"
          >
            <Clock size={12} className="text-yellow-400" />
            <span className="hidden sm:inline">{t('tab_duration', 'Time Forecaster')}</span>
          </button>
          <button
            onClick={() => setActiveTab('sentinel')}
            className="btn btn-secondary gap-1.5 text-xs border-rose-500/40 text-rose-300 hover:border-rose-400"
            title="Open Safety Sentinel Anomaly & Hazard Center"
          >
            <TriangleAlert size={12} className="text-rose-400 animate-pulse" />
            <span className="hidden sm:inline">{t('tab_alerts', 'Safety Sentinel')}</span>
            <span className="chip chip-red text-[9px] py-0 px-1 font-bold">
              {anomalyAlerts.data?.length || 0} Alerts
            </span>
          </button>
          <button onClick={refreshAll} className="btn btn-secondary gap-1.5 text-xs">
            <RefreshCcw size={12} />
            <span className="hidden sm:inline">Sync Fleet</span>
          </button>
          
          <LanguageSelector />

          <button onClick={() => logout()} className="btn btn-ghost" title={t('sign_out', 'Sign Out')}>
            <LogOut size={13} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">

        {/* ── Sidebar ────────────────────────────────────────── */}
        <aside className="sidebar">
          <div>
            <div className="sidebar-section-label">Operations</div>
            <nav className="space-y-0.5">
              {navItems.map(item => {
                const isActive = activeTab === item.id;
                let count: number | null = null;
                if (item.id === 'sentinel')  count = anomalyAlerts.data?.length ?? null;
                if (item.id === 'fleet')     count = machines.data?.length ?? null;
                if (item.id === 'operators') count = operators.data?.length ?? null;
                if (item.id === 'tasks')     count = tasks.data?.length ?? null;
                if (item.id === 'safety')    count = safetyEvents.data?.length ?? null;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <div className="nav-item-left">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {item.id === 'dispatch' && (
                        <span className="chip chip-yellow text-[9px] py-0 px-1.5">AI</span>
                      )}
                      {count !== null && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? 'bg-[var(--yellow-dim)] text-[var(--yellow)]' : 'text-[var(--text-muted)]'}`}>
                          {count}
                        </span>
                      )}
                      {isActive && !count && item.id !== 'dispatch' && <ChevronRight size={12} className="opacity-50" />}
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="vitals-panel mt-4">
              <div className="label-caps mb-2">Site Status</div>
              <div className="vitals-row">
                <span className="vitals-label">Fleet</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--green)]">
                  <span className="dot-live" />
                  100% Op.
                </span>
              </div>
              <div className="vitals-row">
                <span className="vitals-label">Safety Gate</span>
                <span className="text-xs font-semibold text-[var(--yellow)]">Enforced</span>
              </div>
              <div className="vitals-row">
                <span className="vitals-label">ML Model</span>
                <span className="text-xs mono text-[var(--blue)]">RF-v1.2</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[var(--text-muted)] text-center border-t border-[var(--border-subtle)] pt-3">
            Fleet Console v2.4
          </div>
        </aside>

        {/* ── Content ─────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5 fade-up">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="page-heading">Fleet Overview</h1>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Real-time readiness and site capacity.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="dot-live" />
                  <span className="text-xs text-[var(--text-muted)]">Live data</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Fleet Machines"
                  value={String(machines.data?.length ?? 5)}
                  delta="All operational"
                  accent="green"
                  dotState="live"
                  icon={<Truck size={14} />}
                />
                <MetricCard
                  label="Operators"
                  value={String(operators.data?.length ?? 5)}
                  delta="On duty"
                  accent="blue"
                  icon={<Users size={14} />}
                />
                <MetricCard
                  label="Work Orders"
                  value={String(tasks.data?.length ?? 20)}
                  delta="Active site phase"
                  accent="yellow"
                  icon={<CalendarCheck size={14} />}
                />
                <MetricCard
                  label="Safety Events"
                  value={String(safetyEvents.data?.length ?? 2)}
                  delta="Audit trail"
                  accent={safetyEvents.data?.length > 3 ? 'red' : 'neutral'}
                  icon={<ShieldAlert size={14} />}
                />
              </div>

              {/* Fleet Safety Sentinel Banner */}
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/20 text-rose-400">
                    <TriangleAlert size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Fleet Safety Sentinel & Hazard Intelligence
                      </span>
                      <span className="chip chip-red text-[10px] font-bold">
                        {anomalyAlerts.data?.length || 0} Incident Alerts
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Scikit-learn pipeline monitoring rollover tilt, proximity breach, unfastened seatbelt, and operator fatigue across all active machines.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button
                    onClick={() => setActiveTab('sentinel')}
                    className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-[var(--cat-yellow)]"
                  >
                    <span>Open Safety Sentinel</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div onClick={() => setActiveTab('duration')} className="jump-card border-yellow-500/30 bg-yellow-950/10 hover:border-yellow-400 transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="jump-card-icon bg-yellow-500/20">
                      <Clock size={18} className="text-yellow-400" />
                    </div>
                    <span className="chip chip-yellow text-[9px] py-0.5">CATBOOST ML</span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Time Forecaster</h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                    Fleet mission duration predictions, CatBoost 8k benchmarks, and delay drivers.
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-yellow-400">
                    Open Forecaster <ChevronRight size={13} />
                  </div>
                </div>

                <div onClick={() => setActiveTab('dispatch')} className="jump-card border-[var(--yellow-border)] bg-[var(--yellow-dim)] cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="jump-card-icon bg-[rgba(245,166,35,0.2)]">
                      <Sparkles size={18} className="text-[var(--yellow)]" />
                    </div>
                    <span className="chip chip-yellow text-[9px] py-0.5">AI ENGINE</span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">AI Task Dispatcher</h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                    Weighted operator matching: 40% skill · 30% history · 20% machine fit · 10% availability.
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-[var(--yellow)]">
                    Open Dispatch <ChevronRight size={13} />
                  </div>
                </div>

                <div onClick={() => setActiveTab('safety')} className="jump-card border-[var(--blue-border)]">
                  <div className="flex items-start justify-between">
                    <div className="jump-card-icon bg-[var(--blue-dim)]">
                      <ShieldAlert size={18} className="text-[var(--blue)]" />
                    </div>
                    <span className="chip chip-blue text-[9px] py-0.5">AUDIT</span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Compliance & Safety</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                    Pre-task gate lockouts, seatbelt violations, and proximity alarms — all logged immutably.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TIME COMPLETION FORECASTER */}
          {activeTab === 'duration' && (
            <div className="fade-up">
              <TimeEstimationPanel />
            </div>
          )}

          {/* SAFETY SENTINEL / ANOMALY DETECTION */}
          {activeTab === 'sentinel' && (
            <div className="fade-up">
              <AnomalySentinelPanel />
            </div>
          )}

          {/* AI DISPATCH */}
          {activeTab === 'dispatch' && (
            <div className="space-y-5 fade-up">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} className="text-[var(--yellow)]" />
                  <span className="label-caps-brand">Explainable AI Engine</span>
                </div>
                <h1 className="page-heading">Task & Operator Matching</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Select a work order to auto-calculate weighted compatibility scores.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {/* Left: Task selection */}
                <div className="card space-y-4">
                  <div>
                    <label className="input-label">Work Order</label>
                    <select
                      value={selectedTaskId}
                      onChange={e => { setSelectedTaskId(Number(e.target.value)); setAssignmentResult(null); }}
                      className="input-field"
                    >
                      {tasks.data?.map((task: any) => (
                        <option key={task.id} value={task.id}>
                          #{task.id} · {task.task_type} ({task.estimated_duration} min)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTask && (
                    <div className="card-raised space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-y-2">
                        <div>
                          <div className="label-caps mb-0.5">Required Skill</div>
                          <div className="font-semibold text-[var(--text-primary)]">{selectedTask.required_skill}</div>
                        </div>
                        <div>
                          <div className="label-caps mb-0.5">Weather Spec</div>
                          <div className="font-semibold text-[var(--text-primary)]">{selectedTask.weather_condition}</div>
                        </div>
                        <div>
                          <div className="label-caps mb-0.5">Est. Duration</div>
                          <div className="font-semibold text-[var(--yellow)] mono">{selectedTask.estimated_duration} min</div>
                        </div>
                        <div>
                          <div className="label-caps mb-0.5">Status</div>
                          <StatusBadge state="blue" label={selectedTask.status} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="label-caps mb-2">Scoring Weights</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Skill Match',    pct: 40, color: 'progress-fill-yellow' },
                        { label: 'History',        pct: 30, color: 'progress-fill-blue' },
                        { label: 'Machine Fit',    pct: 20, color: 'progress-fill-green' },
                        { label: 'Availability',   pct: 10, color: 'progress-fill-red' },
                      ].map(item => (
                        <div key={item.label} className="card-raised">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[var(--text-muted)]">{item.label}</span>
                            <span className="font-bold text-[var(--text-primary)] mono">{item.pct}%</span>
                          </div>
                          <div className="progress-track">
                            <div className={`progress-fill ${item.color}`} style={{ width: `${item.pct * 2.5}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: AI recommendation */}
                <div className="card border-[var(--yellow-border)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="label-caps-brand">AI Top Match</div>
                    <div className="kpi-value text-[var(--yellow)]" style={{ fontSize: '1.5rem' }}>
                      {recData?.score ?? 88.0}%
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="jump-card-icon bg-[var(--yellow-dim)] border border-[var(--yellow-border)]">
                      <UserCheck size={18} className="text-[var(--yellow)]" />
                    </div>
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">
                        {recOperator?.name || 'Avery Stone'}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {recOperator?.email || 'operator@catguardian.demo'} · EXC-001
                      </div>
                    </div>
                  </div>

                  <div className="card-raised text-xs text-[var(--text-secondary)] leading-relaxed">
                    <span className="text-[var(--yellow)] font-semibold">Rationale: </span>
                    {recData?.explanation || 'High excavation consistency, low idle profile, proven machine familiarity.'}
                  </div>

                  {recData?.breakdown && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Skill', val: recData.breakdown.skill_task_match },
                        { label: 'History', val: recData.breakdown.historical_performance?.toFixed(0) },
                      ].map(item => (
                        <div key={item.label} className="card-raised flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)]">{item.label}</span>
                          <span className="font-bold text-[var(--green)] mono">{item.val}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <hr className="divider" />

                  <button
                    onClick={handleAssign}
                    disabled={assigning}
                    className="btn btn-primary w-full"
                  >
                    <Send size={13} />
                    {assigning ? 'Dispatching…' : 'Confirm & Dispatch'}
                  </button>

                  {assignmentResult && (
                    <div className="alert alert-ok text-xs">
                      <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" />
                      {assignmentResult}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FLEET */}
          {activeTab === 'fleet' && (
            <div className="space-y-5 fade-up">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="page-heading">Fleet Registry</h1>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Status and operating hours across all machines.</p>
                </div>
                <span className="chip chip-green">{machines.data?.length ?? 5} Active</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {machines.data?.map((machine: any) => (
                  <div key={machine.id} className="card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="jump-card-icon bg-[var(--yellow-dim)]">
                          <Truck size={16} className="text-[var(--yellow)]" />
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text-primary)] mono">{machine.machine_code}</div>
                          <div className="text-xs text-[var(--text-muted)]">{machine.machine_type}</div>
                        </div>
                      </div>
                      <StatusBadge
                        state={machine.status === 'active' ? 'green' : 'amber'}
                        label={machine.status === 'active' ? 'Operational' : 'Service'}
                      />
                    </div>
                    <hr className="divider" />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="label-caps mb-0.5">Age</div>
                        <div className="font-semibold text-[var(--text-primary)]">{machine.age_years} yrs</div>
                      </div>
                      <div>
                        <div className="label-caps mb-0.5">Telemetry</div>
                        <div className="flex items-center gap-1.5">
                          <span className="dot-live" />
                          <span className="font-semibold text-[var(--green)]">Live</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPERATORS */}
          {activeTab === 'operators' && (
            <div className="space-y-5 fade-up">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="page-heading">Operator Roster</h1>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Certified personnel with active performance baselines.</p>
                </div>
                <span className="chip chip-blue">{operators.data?.length ?? 5} On Duty</span>
              </div>

              <div className="card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Baseline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operators.data?.map((op: any) => (
                      <tr key={op.id}>
                        <td className="mono text-[var(--text-muted)]">{op.id}</td>
                        <td className="font-semibold text-[var(--text-primary)]">{op.name}</td>
                        <td>{op.email}</td>
                        <td><StatusBadge state="blue" label={op.role} /></td>
                        <td>
                          <span className="text-[var(--green)] text-xs font-semibold">Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WORK ORDERS */}
          {activeTab === 'tasks' && (
            <div className="space-y-5 fade-up">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="page-heading">Work Orders</h1>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Full task schedule with skill and weather specs.</p>
                </div>
                <span className="chip chip-neutral">{tasks.data?.length ?? 20} Total</span>
              </div>

              <div className="card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Skill</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.data?.map((task: any) => (
                      <tr key={task.id}>
                        <td className="mono text-[var(--yellow)]">#{task.id}</td>
                        <td className="font-semibold text-[var(--text-primary)]">{task.task_type}</td>
                        <td className="max-w-[200px] truncate">{task.description}</td>
                        <td>{task.required_skill}</td>
                        <td className="mono">{task.estimated_duration} min</td>
                        <td><StatusBadge state={task.status === 'scheduled' ? 'blue' : 'green'} label={task.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SAFETY / COMPLIANCE */}
          {activeTab === 'safety' && (
            <div className="space-y-5 fade-up">
              <div>
                <h1 className="page-heading">Compliance Audit</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Pre-task gate lockouts, seatbelt violations, proximity alarms.
                </p>
              </div>

              <div className="card overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Event</th>
                      <th>Machine</th>
                      <th>Severity</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safetyEvents.data?.length ? (
                      safetyEvents.data.map((evt: any) => (
                        <tr key={evt.id}>
                          <td className="mono text-[var(--text-muted)]">
                            {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="font-semibold text-[var(--text-primary)]">{evt.event_type}</td>
                          <td className="mono text-[var(--yellow)]">#{evt.machine_id}</td>
                          <td>
                            <StatusBadge
                              state={
                                evt.severity?.toUpperCase() === 'CRITICAL' ? 'red' :
                                evt.severity?.toUpperCase() === 'WARNING'  ? 'amber' : 'blue'
                              }
                              label={evt.severity}
                            />
                          </td>
                          <td className="max-w-[240px] truncate">
                            {evt.details?.message || JSON.stringify(evt.details || {})}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[var(--text-muted)]">
                          No critical safety events recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
