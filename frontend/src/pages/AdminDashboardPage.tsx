import React, { useState } from 'react';
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
  Search,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../services/auth';
import { Panel } from '../components/Panel';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';

type AdminTab = 'overview' | 'dispatch' | 'fleet' | 'operators' | 'tasks' | 'safety';

export function AdminDashboardPage() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [selectedTaskId, setSelectedTaskId] = useState<number>(1);
  const [assignmentResult, setAssignmentResult] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const operators = useQuery({
    queryKey: ['admin-operators'],
    queryFn: async () => (await api.get('/admin/operators')).data,
  });

  const machines = useQuery({
    queryKey: ['admin-machines'],
    queryFn: async () => (await api.get('/admin/machines')).data,
  });

  const tasks = useQuery({
    queryKey: ['admin-tasks'],
    queryFn: async () => (await api.get('/admin/tasks')).data,
  });

  const safetyEvents = useQuery({
    queryKey: ['admin-safety-events'],
    queryFn: async () => (await api.get('/admin/safety-events')).data,
  });

  const recommendation = useQuery({
    queryKey: ['admin-recommendation', selectedTaskId],
    queryFn: async () => (await api.post(`/admin/recommend-assignment?task_id=${selectedTaskId}`)).data,
    enabled: !!selectedTaskId,
  });

  const handleAssign = async () => {
    if (!recommendation.data?.recommended_operator_id) return;
    try {
      setAssigning(true);
      await api.post(
        `/admin/assign?task_id=${selectedTaskId}&operator_id=${recommendation.data.recommended_operator_id}&machine_id=1`
      );
      setAssignmentResult(
        `Assignment confirmed! Operator #${recommendation.data.recommended_operator_id} assigned to Task #${selectedTaskId}.`
      );
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    } catch (err) {
      console.error(err);
      setAssignmentResult('Assignment failed.');
    } finally {
      setAssigning(false);
    }
  };

  const selectedTask = tasks.data?.find((t: any) => t.id === selectedTaskId);
  const recData = recommendation.data;
  const recOperator = operators.data?.find((o: any) => o.id === recData?.recommended_operator_id);

  const navItems = [
    { id: 'overview' as AdminTab, label: 'Fleet Overview', icon: <LayoutDashboard size={18} />, count: null },
    { id: 'dispatch' as AdminTab, label: 'AI Dispatch & Match', icon: <Sparkles size={18} />, badge: 'AI Engine' },
    { id: 'fleet' as AdminTab, label: 'Machinery Registry', icon: <Truck size={18} />, count: machines.data?.length ?? 5 },
    { id: 'operators' as AdminTab, label: 'Operator Roster', icon: <Users size={18} />, count: operators.data?.length ?? 5 },
    { id: 'tasks' as AdminTab, label: 'Site Work Orders', icon: <CalendarCheck size={18} />, count: tasks.data?.length ?? 20 },
    { id: 'safety' as AdminTab, label: 'Compliance & Safety', icon: <ShieldAlert size={18} />, count: safetyEvents.data?.length ?? 2 },
  ];

  return (
    <div className="min-h-screen bg-[#090d14] text-[#e5eefb]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 font-black text-xs text-slate-950 shadow-md">
            CAT
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">CAT Guardian Site Command</span>
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                ADMIN CONSOLE
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Enterprise Heavy Equipment & Fleet Orchestration</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-operators'] });
              queryClient.invalidateQueries({ queryKey: ['admin-machines'] });
              queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
              queryClient.invalidateQueries({ queryKey: ['admin-safety-events'] });
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-slate-800"
            title="Refresh Fleet Data"
          >
            <RefreshCcw size={13} />
            <span className="hidden sm:inline">Sync Fleet</span>
          </button>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-slate-800"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Layout: Left Sidebar Box + Right Content Area */}
      <div className="flex min-h-[calc(100vh-65px)]">
        {/* Left Navigation Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-slate-800/80 bg-slate-950/60 p-4 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 px-3 mb-2">
                Operations Menu
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                        isActive
                          ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-md shadow-amber-500/5'
                          : 'border border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.count !== null && item.count !== undefined && (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono ${
                              isActive ? 'bg-amber-400/20 text-amber-200' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                        {item.badge && (
                          <span className="rounded bg-gradient-to-r from-amber-500 to-amber-600 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-950 uppercase">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Summary Pill Box */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 space-y-2 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Site Status</div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Fleet Status:</span>
                <span className="font-bold text-emerald-400">100% Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active Gate:</span>
                <span className="font-bold text-amber-400">Enforced</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">AI Model:</span>
                <span className="font-mono text-[11px] text-sky-400">RF-v1.2</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-3 text-[11px] text-slate-500 text-center">
            CAT Guardian Fleet v2.4
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {/* TAB 1: FLEET OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Fleet & Site Operations Overview</h2>
                <p className="text-sm text-slate-400">Comprehensive real-time telemetry, readiness, and active site capacity.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Fleet Machinery"
                  value={String(machines.data?.length ?? 5)}
                  delta="5 Active"
                  footnote="Excavators, Loaders, Dozers, Graders"
                />
                <MetricCard
                  label="Certified Operators"
                  value={String(operators.data?.length ?? 5)}
                  delta="On Duty"
                  footnote="5 historical performance baselines"
                />
                <MetricCard
                  label="Work Orders"
                  value={String(tasks.data?.length ?? 20)}
                  delta="Scheduled"
                  footnote="Current site project phase"
                />
                <MetricCard
                  label="Safety Compliance"
                  value={String(safetyEvents.data?.length ?? 2)}
                  delta="Logged Events"
                  footnote="Pre-task gate & telemetry audit trail"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div
                  onClick={() => setActiveTab('dispatch')}
                  className="group cursor-pointer rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-slate-950 p-6 transition-all hover:border-amber-400/60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                      <Sparkles size={24} />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-300 group-hover:translate-x-1 transition-transform">
                      Open AI Dispatch <ChevronRight size={14} />
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">AI-Assisted Task Dispatcher</h3>
                  <p className="mt-1 text-xs text-slate-300">
                    Calculates transparent suitability scores (40% skill match, 30% historical performance, 20% machine fit, 10% availability) to match the best operator to each task.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('safety')}
                  className="group cursor-pointer rounded-3xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-slate-900/60 to-slate-950 p-6 transition-all hover:border-sky-400/60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400">
                      <ShieldAlert size={24} />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-sky-300 group-hover:translate-x-1 transition-transform">
                      View Compliance <ChevronRight size={14} />
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">Compliance & Safety Audit</h3>
                  <p className="mt-1 text-xs text-slate-300">
                    Live audit trail logging every pre-task checklist gate, unfastened seatbelt lockouts, and telemetry proximity alarms.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI DISPATCH & MATCH */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
                  <Sparkles size={14} />
                  <span>Explainable Decision Engine</span>
                </div>
                <h2 className="mt-1 text-2xl font-bold text-white">AI-Assisted Task & Operator Matchmaker</h2>
                <p className="text-sm text-slate-400">
                  Select a work order to automatically calculate weighted compatibility scores and dispatch certified operators.
                </p>
              </div>

              <div className="rounded-3xl border border-amber-500/30 bg-slate-950/80 p-6 backdrop-blur-xl shadow-2xl">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Left: Task Selection & Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 block">
                        Select Work Order
                      </label>
                      <select
                        value={selectedTaskId}
                        onChange={(e) => {
                          setSelectedTaskId(Number(e.target.value));
                          setAssignmentResult(null);
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                      >
                        {tasks.data?.map((task: any) => (
                          <option key={task.id} value={task.id}>
                            Task #{task.id}: {task.task_type} · {task.description} ({task.estimated_duration} min)
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedTask && (
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Required Skill:</span>
                          <span className="font-semibold text-white">{selectedTask.required_skill}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Expected Weather:</span>
                          <span className="font-semibold text-white">{selectedTask.weather_condition}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Estimated Duration:</span>
                          <span className="font-semibold text-amber-300">{selectedTask.estimated_duration} minutes</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Current Task Status:</span>
                          <StatusBadge state="blue" label={selectedTask.status} />
                        </div>
                      </div>
                    )}

                    {/* Formula Explanation */}
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-2 text-xs text-slate-300">
                      <div className="font-bold text-amber-400 text-xs uppercase tracking-wider">
                        Transparent AI Scoring Breakdown:
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                          <strong className="text-white block">40% Skill Match</strong>
                          Task type alignment
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                          <strong className="text-white block">30% Historical Metric</strong>
                          Duration & shift efficiency
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                          <strong className="text-white block">20% Machine Fit</strong>
                          Equipment familiarity
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                          <strong className="text-white block">10% Availability</strong>
                          Shift & hours buffer
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: AI Recommendation Outcome */}
                  <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-slate-900/70 to-slate-950 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.2em] text-amber-400 font-bold">
                          AI Top Match Recommendation
                        </span>
                        <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-slate-950 shadow-md">
                          Score: {recData?.score ?? 88.0}%
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-3.5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          <UserCheck size={28} />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-white">
                            {recOperator?.name || 'Avery Stone (Hero Operator)'}
                          </h4>
                          <div className="text-xs text-slate-400">
                            {recOperator?.email || 'operator@catguardian.demo'} · Machine EXC-001
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs text-slate-200 leading-relaxed">
                        <strong className="text-amber-300">Decision Rationale:</strong>{' '}
                        {recData?.explanation ||
                          'Recommended due to high historical excavation consistency, low idling profile, and machine familiarity.'}
                      </div>

                      {recData?.breakdown && (
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800 flex justify-between">
                            <span className="text-slate-400">Skill Score:</span>
                            <strong className="text-emerald-400">{recData.breakdown.skill_task_match}%</strong>
                          </div>
                          <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800 flex justify-between">
                            <span className="text-slate-400">History Score:</span>
                            <strong className="text-emerald-400">
                              {recData.breakdown.historical_performance?.toFixed(0)}%
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800">
                      <button
                        onClick={handleAssign}
                        disabled={assigning}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 transition-all hover:from-amber-400 hover:to-amber-500 shadow-xl"
                      >
                        <Send size={15} className="fill-slate-950" />
                        <span>{assigning ? 'Executing Dispatch...' : 'Confirm & Dispatch Assignment'}</span>
                      </button>

                      {assignmentResult && (
                        <div className="mt-2 text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 size={14} />
                          <span>{assignmentResult}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MACHINERY REGISTRY */}
          {activeTab === 'fleet' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">Heavy Machinery Registry</h2>
                  <p className="text-sm text-slate-400">Status, operating hours, and maintenance tracking across all fleet units.</p>
                </div>
                <span className="text-xs text-slate-400">5 Machines Active</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {machines.data?.map((machine: any) => (
                  <div
                    key={machine.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Truck size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-white text-base">{machine.machine_code}</div>
                          <div className="text-xs text-slate-400">{machine.machine_type}</div>
                        </div>
                      </div>
                      <StatusBadge
                        state={machine.status === 'active' ? 'green' : 'amber'}
                        label={machine.status === 'active' ? 'Operational' : 'Service Due'}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/80 pt-3">
                      <div>
                        <span className="text-slate-500 block">Fleet Age:</span>
                        <span className="font-semibold text-slate-200">{machine.age_years} years</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Telemetry Stream:</span>
                        <span className="font-semibold text-emerald-400">Connected</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: OPERATOR ROSTER */}
          {activeTab === 'operators' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">Certified Operator Roster</h2>
                  <p className="text-sm text-slate-400">Active personnel, credentials, and personal baseline tracking.</p>
                </div>
                <span className="text-xs text-slate-400">5 Operators Active</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {operators.data?.map((op: any) => (
                  <div
                    key={op.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          <Users size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-white text-base">{op.name}</div>
                          <div className="text-xs text-slate-400">{op.email}</div>
                        </div>
                      </div>
                      <StatusBadge state="blue" label={op.role} />
                    </div>

                    <div className="border-t border-slate-800/80 pt-3 flex justify-between text-xs">
                      <span className="text-slate-500">Historical Profile:</span>
                      <span className="font-semibold text-emerald-400">Baseline Active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SITE WORK ORDERS */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">Site Work Orders & Tasks</h2>
                  <p className="text-sm text-slate-400">Complete task schedule, required operator skills, and weather specifications.</p>
                </div>
                <span className="text-xs text-slate-400">{tasks.data?.length ?? 20} Tasks Total</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tasks.data?.map((task: any) => (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 space-y-2 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-amber-400 font-bold">Task #{task.id}</span>
                      <StatusBadge state={task.status === 'scheduled' ? 'blue' : 'green'} label={task.status} />
                    </div>
                    <div className="font-bold text-white text-sm">{task.task_type}</div>
                    <div className="text-xs text-slate-400">{task.description}</div>
                    <div className="border-t border-slate-800/80 pt-2 flex justify-between text-[11px] text-slate-400">
                      <span>Est: {task.estimated_duration} min</span>
                      <span>Weather: {task.weather_condition}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: COMPLIANCE & SAFETY */}
          {activeTab === 'safety' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Compliance & Safety Audit Trail</h2>
                <p className="text-sm text-slate-400">
                  Immutable record of safety gate lockouts, seatbelt violations, and proximity trajectory alarms.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="border-b border-slate-800 bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-5 py-3.5">Timestamp</th>
                        <th className="px-5 py-3.5">Event Type</th>
                        <th className="px-5 py-3.5">Machine Target</th>
                        <th className="px-5 py-3.5">Severity</th>
                        <th className="px-5 py-3.5">Incident Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {safetyEvents.data?.length ? (
                        safetyEvents.data.map((evt: any) => (
                          <tr key={evt.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="px-5 py-3.5 font-mono text-slate-400">
                              {new Date(evt.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-white">{evt.event_type}</td>
                            <td className="px-5 py-3.5 font-mono text-amber-300">Machine #{evt.machine_id}</td>
                            <td className="px-5 py-3.5">
                              <StatusBadge
                                state={
                                  evt.severity?.toUpperCase() === 'CRITICAL'
                                    ? 'red'
                                    : evt.severity?.toUpperCase() === 'WARNING'
                                    ? 'amber'
                                    : 'blue'
                                }
                                label={evt.severity}
                              />
                            </td>
                            <td className="px-5 py-3.5 text-slate-300 max-w-sm truncate">
                              {evt.details?.message || JSON.stringify(evt.details || {})}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                            Zero critical safety events recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
