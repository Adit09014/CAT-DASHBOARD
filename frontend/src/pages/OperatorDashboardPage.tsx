import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Activity,
  Sparkles,
  RefreshCcw,
  LogOut,
  BrainCircuit,
  Sliders,
  Compass,
  Award,
  Bot,
  Gauge,
  Layers,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../services/auth';
import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';
import { Panel } from '../components/Panel';
import { SafetyChecklist } from '../components/SafetyChecklist';
import { TelemetryChart } from '../components/TelemetryChart';
import { WhatIfPanel } from '../components/WhatIfPanel';
import { PredictiveSafetyMap } from '../components/PredictiveSafetyMap';
import { DomainGuardTraining } from '../components/DomainGuardTraining';
import { CopilotPanel } from '../components/CopilotPanel';
import { FullDayWeatherCard } from '../components/FullDayWeatherCard';

type OperatorTab = 'overview' | 'safety-gate' | 'telemetry' | 'what-if' | 'proximity' | 'training' | 'copilot';

export function OperatorDashboardPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<OperatorTab>('overview');

  const dashboardQuery = useQuery({
    queryKey: ['operator-dashboard'],
    queryFn: async () => (await api.get('/operator/dashboard')).data,
    refetchInterval: 10000,
  });

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['operator-dashboard'] });
  };

  const handleAdvanceSimulation = async () => {
    try {
      await api.post('/telemetry/next-tick');
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const data = dashboardQuery.data;
  const currentMachine = data?.current_machine ?? {};
  const currentTask = data?.current_task ?? {};
  const telemetry = data?.current_telemetry ?? {};
  const safety = data?.safety_status ?? {};
  const prediction = data?.task_prediction ?? {};
  const insight = data?.ai_insight ?? {};
  const health = data?.machine_health ?? {};
  const weather = data?.weather ?? {};

  const baselineIdle = health.baseline_idle ?? 18.0;
  const currentIdle = telemetry.idle_time ?? 18.0;
  const idleRatio = baselineIdle > 0 ? (currentIdle / baselineIdle).toFixed(1) : '1.0';
  const isAnomaly = currentIdle >= baselineIdle * 1.5;

  const safetyState =
    safety.allowed === false ? 'red' : safety.warnings?.length ? 'amber' : 'green';

  const navItems = [
    { id: 'overview' as OperatorTab, label: 'Cockpit Overview', icon: <Layers size={18} />, badge: null },
    {
      id: 'safety-gate' as OperatorTab,
      label: 'Pre-Task Safety Gate',
      icon: <ShieldCheck size={18} />,
      status: safety.allowed === false ? 'BLOCKED' : 'READY',
      statusColor: safety.allowed === false ? 'text-red-400 bg-red-950/60 border-red-800' : 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
    },
    {
      id: 'telemetry' as OperatorTab,
      label: 'Telemetry & Baseline',
      icon: <Activity size={18} />,
      status: isAnomaly ? 'ANOMALY' : 'NOMINAL',
      statusColor: isAnomaly ? 'text-red-400 bg-red-950/60 border-red-800' : 'text-slate-400 bg-slate-900 border-slate-800',
    },
    { id: 'what-if' as OperatorTab, label: 'What-If Simulator', icon: <Sliders size={18} />, badge: 'Hero Feature' },
    { id: 'proximity' as OperatorTab, label: 'Predictive Proximity', icon: <Compass size={18} />, badge: 'Hero Feature' },
    { id: 'training' as OperatorTab, label: 'Domain-Guarded Training', icon: <Award size={18} />, badge: 'Hero Feature' },
    { id: 'copilot' as OperatorTab, label: 'Machine AI Copilot', icon: <Bot size={18} />, badge: 'Voice / TTS' },
  ];

  return (
    <div className="min-h-screen bg-[#090d14] text-[#e5eefb]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-6 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 font-black text-xs text-slate-950 shadow-md">
            CAT
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">
                Machine {currentMachine.machine_code || 'EXC-001'}
              </span>
              <span className="text-xs text-slate-400 font-normal">
                ({currentMachine.machine_type || 'Excavator'})
              </span>
              <StatusBadge
                state={safetyState}
                label={safety.allowed === false ? 'Gate Blocked' : 'Gate Passed'}
              />
            </div>
            <div className="text-[11px] text-slate-400">
              Operator: <strong className="text-slate-200">Avery Stone</strong> · Active Mission:{' '}
              <strong className="text-amber-400">{currentTask.task_type || 'Excavation'}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleAdvanceSimulation}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-300 transition-all hover:bg-amber-500/20"
            title="Advance simulated telemetry to trigger idle drift"
          >
            <Activity size={14} />
            <span className="hidden sm:inline">Advance Telemetry</span>
          </button>

          <button
            onClick={refreshData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-slate-800"
            title="Refresh Dashboard State"
          >
            <RefreshCcw size={13} />
          </button>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-slate-800"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Layout: Left Sidebar Navigation + Right Content Area */}
      <div className="flex min-h-[calc(100vh-65px)]">
        {/* Left Navigation Sidebar Box */}
        <aside className="w-64 flex-shrink-0 border-r border-slate-800/80 bg-slate-950/70 p-4 flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 px-3 mb-2">
                In-Cab Console
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
                      <div className="flex items-center gap-1">
                        {item.status && (
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[9px] font-mono font-bold ${item.statusColor}`}
                          >
                            {item.status}
                          </span>
                        )}
                        {item.badge && (
                          <span className="rounded bg-gradient-to-r from-amber-500 to-amber-600 px-1.5 py-0.5 text-[9px] font-black text-slate-950 uppercase">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Cab Telemetry Summary Pill Box */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 space-y-2 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Machine Vitals</div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Engine Idle:</span>
                <span className={`font-mono font-bold ${isAnomaly ? 'text-red-400' : 'text-amber-400'}`}>
                  {currentIdle.toFixed(0)} min ({idleRatio}×)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Seatbelt:</span>
                <span className={`font-bold ${telemetry.seatbelt_status ? 'text-emerald-400' : 'text-red-400'}`}>
                  {telemetry.seatbelt_status ? 'Locked' : 'Unbuckled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Predicted Time:</span>
                <span className="font-mono text-white font-bold">{prediction.predicted_duration ?? 62} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Site Weather:</span>
                <span className="text-sky-300 font-medium">{weather.condition || 'Cloudy'} ({weather.temperature ?? 26.5}°C)</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Site Location:</span>
                <span className="text-amber-400 font-semibold">{weather.location || 'Vellore, TN'}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-3 text-[11px] text-slate-500 text-center">
            CAT Guardian In-Cab Tablet v2.4
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {/* TAB 1: COCKPIT OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Machine Operator Cockpit</h2>
                <p className="text-sm text-slate-400">
                  Real-time telemetry, pre-task digital checklist status, and AI mission assistance.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Safety Checklist Gate"
                  value={safety.allowed === false ? 'Blocked' : 'Cleared'}
                  delta={safety.allowed === false ? 'Action Required' : 'Ready'}
                  footnote="Digital safety verification"
                />
                <MetricCard
                  label="Idle vs Baseline"
                  value={`${currentIdle.toFixed(0)} min`}
                  delta={`${idleRatio}× Normal`}
                  footnote={`Your personal baseline: ${baselineIdle.toFixed(0)} min`}
                />
                <MetricCard
                  label="Task Predicted Time"
                  value={`${prediction.predicted_duration ?? 62} min`}
                  delta={prediction.model_version || 'RandomForest v1.2'}
                  footnote="Weather & machine regression"
                />
                <MetricCard
                  label={`Site: ${weather.location || 'Vellore, TN'}`}
                  value={weather.condition || 'Cloudy'}
                  delta={`${weather.temperature ?? 26.5}°C · ${weather.wind ?? 15} km/h`}
                  footnote="Live Satellite & Radar Sync"
                />
              </div>

              {/* Quick Feature Jump Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <div
                  onClick={() => setActiveTab('safety-gate')}
                  className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/70 p-5 hover:border-amber-400/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <ShieldCheck size={22} className="text-emerald-400" />
                    <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="mt-3 font-bold text-white text-base">Safety Checklist Gate</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Verify seatbelt sensors, machine hydraulics, and clear safety zone before commencing work.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('what-if')}
                  className="group cursor-pointer rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-slate-950 p-5 hover:border-amber-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <Sliders size={22} className="text-amber-400" />
                    <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="mt-3 font-bold text-white text-base">What-If Mission Simulator</h3>
                  <p className="mt-1 text-xs text-slate-300">
                    Test fuel-saving decisions and idle reduction to see immediate time & fuel deltas.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('proximity')}
                  className="group cursor-pointer rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-slate-950 p-5 hover:border-sky-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <Compass size={22} className="text-sky-400" />
                    <ChevronRight size={16} className="text-sky-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="mt-3 font-bold text-white text-base">Predictive Proximity Radar</h3>
                  <p className="mt-1 text-xs text-slate-300">
                    2D trajectory lookahead calculating potential collisions with haul trucks up to 45 seconds out.
                  </p>
                </div>
              </div>

              {/* Full-Day Shift Weather & Environmental Conditions Showcase */}
              <FullDayWeatherCard weather={weather} />

              {/* Task Details & AI Intelligence Insight Panel */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Current Work Order">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">{currentTask.task_type || 'Excavation'}</h3>
                      <StatusBadge state={safetyState} label={currentTask.status || 'Scheduled'} />
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {currentTask.description || 'Foundation cut on Lot A. Excavate trench line according to engineering grade.'}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/80 pt-3">
                      <div>
                        <span className="text-slate-500 block">Planned Duration:</span>
                        <span className="font-semibold text-white">{currentTask.estimated_duration ?? 74} minutes</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Assigned Machine:</span>
                        <span className="font-semibold text-amber-300">{currentMachine.machine_code || 'EXC-001'}</span>
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Operator Baseline Intelligence">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                        <BrainCircuit size={20} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white">{insight.title || 'Personal Baseline Monitoring'}</h4>
                        <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                          {insight.message || `Typical idle time for excavation is ${baselineIdle.toFixed(0)} min. Monitoring shifts.`}
                        </p>
                      </div>
                    </div>
                    {isAnomaly && (
                      <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-2.5 text-xs text-red-200">
                        <strong>Anomaly Alert:</strong> Idling has reached {currentIdle.toFixed(0)} min ({idleRatio}× baseline). Shut down during truck loading queues to conserve fuel.
                      </div>
                    )}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* TAB 2: PRE-TASK SAFETY GATE */}
          {activeTab === 'safety-gate' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Pre-Task Digital Safety Gate</h2>
                <p className="text-sm text-slate-400">
                  Mandatory pre-operational compliance verification. Machine start is digitally gated until seatbelt and zone checks pass.
                </p>
              </div>
              <SafetyChecklist
                taskId={currentTask.id || 1}
                safetyStatus={safety}
                seatbeltFastened={Boolean(telemetry.seatbelt_status)}
                weatherCondition={weather.condition || 'Cloudy'}
                onRefresh={refreshData}
              />
            </div>
          )}

          {/* TAB 3: TELEMETRY & BASELINE */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Machine Telemetry & Personal Baseline</h2>
                <p className="text-sm text-slate-400">
                  Continuous sensor readings compared against your historical operator baseline to flag excessive idling and fuel spikes.
                </p>
              </div>
              <TelemetryChart
                currentIdle={currentIdle}
                baselineIdle={baselineIdle}
                fuelUsed={telemetry.fuel_used ?? 18.2}
                engineLoad={telemetry.engine_load ?? 58.0}
                loadCycles={telemetry.load_cycles ?? 26}
                engineHours={telemetry.engine_hours ?? 131.5}
              />
            </div>
          )}

          {/* TAB 4: WHAT-IF SIMULATOR */}
          {activeTab === 'what-if' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">What-If Mission Simulator</h2>
                <p className="text-sm text-slate-400">
                  Test operational scenarios before acting. Drag sliders to adjust idle reduction and weather, and observe immediate model recalculations.
                </p>
              </div>
              <WhatIfPanel
                taskId={currentTask.id || 1}
                initialData={data?.what_if}
              />
            </div>
          )}

          {/* TAB 5: PREDICTIVE PROXIMITY */}
          {activeTab === 'proximity' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Predictive Safety Trajectory Radar</h2>
                <p className="text-sm text-slate-400">
                  2D trajectory lookahead forecasting positions of the machine and nearby hazards to issue early proximity conflict advisories.
                </p>
              </div>
              <PredictiveSafetyMap taskId={currentTask.id || 1} />
            </div>
          )}

          {/* TAB 6: DOMAIN-GUARDED TRAINING */}
          {activeTab === 'training' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Domain-Guarded Training & Closed-Loop Learning</h2>
                <p className="text-sm text-slate-400">
                  Targeted CAT training search filtered strictly to heavy machinery operation, plus closed-loop metric verification.
                </p>
              </div>
              <DomainGuardTraining
                operatorId={user?.id || 2}
                machineType={currentMachine.machine_type || 'Excavator'}
                recommendedTopic={data?.training_recommendation?.title}
              />
            </div>
          )}

          {/* TAB 7: MACHINE AI COPILOT */}
          {activeTab === 'copilot' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Machine-Aware Voice & Text AI Copilot</h2>
                <p className="text-sm text-slate-400">
                  Hands-free cab assistant grounded in live telemetry, warning codes, and shift parameters. Supports push-to-talk voice input and text-to-speech audio.
                </p>
              </div>
              <CopilotPanel
                machineCode={currentMachine.machine_code || 'EXC-001'}
                taskType={currentTask.task_type || 'Excavation'}
                initialMessage={insight.message}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
