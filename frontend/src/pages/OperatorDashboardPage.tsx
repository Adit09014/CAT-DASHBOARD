import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Activity,
  RefreshCcw,
  LogOut,
  BrainCircuit,
  Sliders,
  Compass,
  Award,
  Bot,
  Layers,
  ChevronRight,
  Gauge,
  Fuel,
  Clock,
  CloudSun,
  TriangleAlert,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
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
import { AnomalySentinelPanel } from '../components/AnomalySentinelPanel';
import { TimeEstimationPanel } from '../components/TimeEstimationPanel';
import { useLanguage } from '../services/i18n';
import { LanguageSelector } from '../components/LanguageSelector';
import { ThemeToggle } from '../components/ThemeToggle';
import { ExplainableNarrativeAlertModal, ExplainableNarrativeAlert } from '../components/ExplainableNarrativeAlertModal';

type OperatorTab = 'overview' | 'duration' | 'alerts' | 'safety-gate' | 'telemetry' | 'what-if' | 'proximity' | 'training' | 'copilot';

export function OperatorDashboardPage() {
  const { user, logout } = useAuth();
  const { t, currentLang } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<OperatorTab>('overview');
  const [copilotQuestion, setCopilotQuestion] = useState<string | undefined>(undefined);
  const [overviewNarrativeAlert, setOverviewNarrativeAlert] = useState<ExplainableNarrativeAlert | null>(null);
  const [isOverviewNarrativeOpen, setIsOverviewNarrativeOpen] = useState(false);

  const navItems = [
    { id: 'overview'    as OperatorTab, label: t('tab_overview', 'Overview'),               icon: <Layers size={15} /> },
    { id: 'duration'    as OperatorTab, label: t('tab_duration', 'Time Forecaster'),       icon: <Clock size={15} /> },
    { id: 'alerts'      as OperatorTab, label: t('tab_alerts', 'Safety Sentinel'),         icon: <TriangleAlert size={15} /> },
    { id: 'safety-gate' as OperatorTab, label: t('tab_safety_gate', 'Safety Gate'),         icon: <ShieldCheck size={15} /> },
    { id: 'telemetry'   as OperatorTab, label: t('tab_telemetry', 'Telemetry'),             icon: <Activity size={15} /> },
    { id: 'what-if'     as OperatorTab, label: t('tab_what_if', 'What-If Sim'),             icon: <Sliders size={15} /> },
    { id: 'proximity'   as OperatorTab, label: t('tab_proximity', 'Proximity Radar'),       icon: <Compass size={15} /> },
    { id: 'training'    as OperatorTab, label: t('tab_training', 'Training'),               icon: <Award size={15} /> },
    { id: 'copilot'     as OperatorTab, label: t('tab_copilot', 'AI Copilot'),             icon: <Bot size={15} /> },
  ];

  const dashboardQuery = useQuery({
    queryKey: ['operator-dashboard'],
    queryFn: async () => (await api.get('/operator/dashboard')).data,
    refetchInterval: 10000,
  });

  const refreshData = () => queryClient.invalidateQueries({ queryKey: ['operator-dashboard'] });

  const handleAdvanceSimulation = async () => {
    try {
      await api.post('/telemetry/next-tick');
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const data             = dashboardQuery.data;
  const currentMachine   = data?.current_machine   ?? {};
  const currentTask      = data?.current_task       ?? {};
  const telemetry        = data?.current_telemetry  ?? {};
  const safety           = data?.safety_status      ?? {};
  const prediction       = data?.task_prediction    ?? {};
  const insight          = data?.ai_insight         ?? {};
  const health           = data?.machine_health     ?? {};
  const weather          = data?.weather            ?? {};

  const baselineIdle = health.baseline_idle ?? 18.0;
  const currentIdle  = telemetry.idle_time   ?? 18.0;
  const idleRatio    = baselineIdle > 0 ? (currentIdle / baselineIdle).toFixed(1) : '1.0';
  const isAnomaly    = currentIdle >= baselineIdle * 1.5;

  const anomalyStatus = data?.anomaly_status?.evaluation ?? {};
  const alertProb     = anomalyStatus.safety_alert_prob ?? 0.02;
  const isSafetyAlert = anomalyStatus.safety_alert_triggered ?? false;
  const threatLevel   = anomalyStatus.threat_level ?? (isSafetyAlert ? 'CRITICAL' : alertProb >= 0.4 ? 'ELEVATED' : 'NORMAL');
  const riskFactors   = anomalyStatus.risk_factors ?? [];

  const safetyState = safety.allowed === false ? 'red' : safety.warnings?.length ? 'amber' : 'green';

  const handleExplainOverviewHazard = async () => {
    try {
      const res = await api.post('/anomaly/narrative/generate', {
        telemetry: telemetry,
        alert_type: threatLevel === 'CRITICAL' ? 'SAFETY_ML_CRITICAL_BREACH' : 'SAFETY_ML_ELEVATED_RISK',
        threat_level: threatLevel,
        confidence: alertProb,
        lang: currentLang,
        machine_code: currentMachine.machine_code || 'EXC-001',
      });
      setOverviewNarrativeAlert(res.data);
      setIsOverviewNarrativeOpen(true);
    } catch (e) {
      console.error('Failed to generate overview narrative:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col">

      {/* ── Topbar ─────────────────────────────────────────────── */}
      <header className="navbar">
        <div className="navbar-logo">
          <div className="navbar-badge">CAT</div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
              {currentMachine.machine_code || 'EXC-001'}
              <span className="text-[var(--text-muted)] font-normal ml-1.5 text-xs">
                {currentMachine.machine_type || 'Excavator'}
              </span>
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              {currentTask.task_type || 'Excavation'} · {user?.name || 'Avery Stone'}
            </span>
          </div>
          <StatusBadge state={safetyState} label={safety.allowed === false ? t('gate_blocked', 'Gate Blocked') : t('gate_clear', 'Gate Clear')} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('duration')}
            className="btn text-[11px] gap-1.5 border border-yellow-500/40 text-yellow-300 hover:border-yellow-400 bg-yellow-950/20"
            title="Open Task Time Completion Forecaster"
          >
            <Clock size={12} className="text-yellow-400" />
            <span className="hidden sm:inline">{t('tab_duration', 'Time Forecaster')}</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`btn text-[11px] gap-1.5 border transition-all ${
              isSafetyAlert
                ? 'bg-rose-950/50 border-rose-500/50 text-rose-300 animate-pulse'
                : threatLevel === 'ELEVATED'
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                : 'bg-black/30 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
            title="Open Safety Sentinel Anomaly & Hazard Center"
          >
            <TriangleAlert size={12} className={isSafetyAlert ? 'text-rose-400' : threatLevel === 'ELEVATED' ? 'text-amber-400' : 'text-slate-400'} />
            <span className="hidden sm:inline">{t('tab_alerts', 'Sentinel')}:</span>
            <span className="font-bold">{threatLevel} ({(alertProb * 100).toFixed(0)}%)</span>
          </button>

          <button
            onClick={handleAdvanceSimulation}
            className="btn btn-secondary text-[11px] gap-1.5"
            title="Advance simulated telemetry tick"
          >
            <Activity size={12} />
            <span className="hidden sm:inline">{t('advance_telemetry', 'Advance Telemetry')}</span>
          </button>
          
          <LanguageSelector />
          <ThemeToggle />

          <button onClick={refreshData} className="btn btn-ghost" title="Refresh">
            <RefreshCcw size={13} />
          </button>
          <button onClick={() => logout()} className="btn btn-ghost" title={t('sign_out', 'Sign Out')}>
            <LogOut size={13} />
          </button>
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Sidebar ────────────────────────────────────────── */}
        <aside className="sidebar">
          <div>
            <div className="sidebar-section-label">In-Cab Console</div>
            <nav className="space-y-0.5">
              {navItems.map(item => {
                const isActive = activeTab === item.id;

                /* compute dynamic badge */
                let badge: React.ReactNode = null;
                if (item.id === 'alerts') {
                  badge = (
                    <span className={`chip text-[9px] py-0 px-1.5 ${isSafetyAlert ? 'chip-red animate-pulse' : threatLevel === 'ELEVATED' ? 'chip-amber' : 'chip-green'}`}>
                      {threatLevel}
                    </span>
                  );
                } else if (item.id === 'safety-gate') {
                  badge = (
                    <span className={`chip text-[9px] py-0 px-1.5 ${safety.allowed === false ? 'chip-red' : 'chip-green'}`}>
                      {safety.allowed === false ? 'BLOCKED' : 'READY'}
                    </span>
                  );
                } else if (item.id === 'telemetry' && isAnomaly) {
                  badge = <span className="chip chip-red text-[9px] py-0 px-1.5">ANOMALY</span>;
                }

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
                    {badge}
                    {!badge && isActive && <ChevronRight size={12} className="opacity-50" />}
                  </button>
                );
              })}
            </nav>

            {/* Machine vitals strip */}
            <div className="vitals-panel mt-4">
              <div className="label-caps mb-2">Machine Vitals</div>
              <div className="space-y-1">
                <div className="vitals-row">
                  <span className="vitals-label">Idle time</span>
                  <span className={`text-xs font-mono font-bold ${isAnomaly ? 'text-[var(--red)]' : 'text-[var(--yellow)]'}`}>
                    {currentIdle.toFixed(0)} min
                  </span>
                </div>
                <div className="vitals-row">
                  <span className="vitals-label">vs Baseline</span>
                  <span className={`text-xs font-mono font-bold ${isAnomaly ? 'text-[var(--red)]' : 'text-[var(--text-secondary)]'}`}>
                    {idleRatio}×
                  </span>
                </div>
                <div className="vitals-row">
                  <span className="vitals-label">Seatbelt</span>
                  <span className={`text-xs font-semibold ${telemetry.seatbelt_status ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {telemetry.seatbelt_status ? 'Fastened' : 'Open'}
                  </span>
                </div>
                <div className="vitals-row">
                  <span className="vitals-label">ETA</span>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                    {prediction.predicted_duration ?? 62} min
                  </span>
                </div>
                <div className="vitals-row">
                  <span className="vitals-label">Weather</span>
                  <span className="text-xs text-[var(--blue)] font-medium truncate max-w-[80px]">
                    {weather.condition || 'Cloudy'} {weather.temperature ?? 26.5}°
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[var(--text-muted)] text-center border-t border-[var(--border-subtle)] pt-3">
            In-Cab Tablet v2.4
          </div>
        </aside>

        {/* ── Content area ─────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5 fade-up">

              {/* Page header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="page-heading">Operator Cockpit</h1>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Real-time machine telemetry, pre-task gate, and mission AI.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="dot-live" />
                  <span className="text-xs text-[var(--text-muted)]">Live · auto-refresh 10s</span>
                </div>
              </div>

              {/* KPI row */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Safety Gate"
                  value={safety.allowed === false ? 'Blocked' : 'Cleared'}
                  delta={safety.allowed === false ? 'Action required' : 'Ready to operate'}
                  accent={safety.allowed === false ? 'red' : 'green'}
                  dotState={safety.allowed === false ? 'danger' : 'live'}
                  icon={<ShieldCheck size={14} />}
                />
                <MetricCard
                  label="Idle vs Baseline"
                  value={`${currentIdle.toFixed(0)} min`}
                  delta={`${idleRatio}× your baseline (${baselineIdle.toFixed(0)} min)`}
                  accent={isAnomaly ? 'red' : 'neutral'}
                  dotState={isAnomaly ? 'danger' : null}
                  icon={<Clock size={14} />}
                />
                <MetricCard
                  label="Predicted Task Time"
                  value={`${prediction.predicted_duration ?? 62} min`}
                  delta={prediction.confidence ? `${prediction.confidence}% confidence` : 'ML model RF v1.2'}
                  accent="yellow"
                  icon={<Gauge size={14} />}
                />
                <MetricCard
                  label={`Weather · ${weather.location || 'Vellore, TN'}`}
                  value={`${weather.temperature ?? 26.5}°C`}
                  delta={`${weather.condition || 'Cloudy'} · ${weather.wind ?? 15} km/h wind`}
                  accent="blue"
                  icon={<CloudSun size={14} />}
                />
              </div>

              {/* ML Safety Sentinel & Anomaly Alert Card */}
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                isSafetyAlert
                  ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-950/30'
                  : threatLevel === 'ELEVATED'
                  ? 'bg-amber-950/30 border-amber-500/40'
                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
              }`}>
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-lg border ${
                    isSafetyAlert
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : threatLevel === 'ELEVATED'
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  }`}>
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        ML Safety Sentinel · Threat State:
                      </span>
                      <span className={`chip text-[10px] font-bold ${
                        isSafetyAlert ? 'chip-red animate-pulse' : threatLevel === 'ELEVATED' ? 'chip-amber' : 'chip-green'
                      }`}>
                        {threatLevel} ({(alertProb * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-300">
                      <span>Roll Tilt: <strong className="text-white">{(telemetry.machine_tilt_deg ?? 1.8).toFixed(1)}°</strong></span>
                      <span className="text-slate-600">·</span>
                      <span>Slope: <strong className="text-white">{(telemetry.ground_slope_deg ?? 2.5).toFixed(1)}°</strong></span>
                      <span className="text-slate-600">·</span>
                      <span>Obstacle: <strong className="text-white">{(telemetry.min_obstacle_distance_m ?? 25.0).toFixed(1)}m</strong></span>
                      <span className="text-slate-600">·</span>
                      <span>Seatbelt: <strong className={telemetry.seatbelt_status ? 'text-emerald-400' : 'text-rose-400 font-bold'}>{telemetry.seatbelt_status ? 'Fastened' : 'DISENGAGED'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {riskFactors.length > 0 && (
                    <div className="hidden xl:flex items-center gap-1.5 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 px-2.5 py-1 rounded">
                      <TriangleAlert size={12} className="text-rose-400" />
                      <span>{riskFactors[0].factor}</span>
                    </div>
                  )}

                  <button
                    onClick={handleExplainOverviewHazard}
                    className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 border-amber-500/40 text-amber-300 hover:border-amber-400 hover:bg-amber-950/30 shadow"
                    title="Inspect Explainable AI Hazard Narrative"
                  >
                    <Sparkles size={13} className="text-[var(--cat-yellow)]" />
                    <span>{t('explain_alert', 'Explain Narrative')}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('alerts')}
                    className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-[var(--cat-yellow)]"
                  >
                    <span>Open Sentinel Center</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              {/* Feature cards + task/insight */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div
                  onClick={() => setActiveTab('duration')}
                  className="jump-card border-yellow-500/30 bg-yellow-950/10 hover:border-yellow-400 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="jump-card-icon bg-yellow-500/20">
                      <Clock size={18} className="text-yellow-400" />
                    </div>
                    <span className="chip chip-yellow text-[9px] py-0.5">CATBOOST</span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Time Forecaster</h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                    Live ETA clock, 8k dataset benchmarks, delay risk & terrain sensitivity.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('safety-gate')}
                  className="jump-card cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="jump-card-icon bg-[var(--green-dim)]">
                      <ShieldCheck size={18} className="text-[var(--green)]" />
                    </div>
                    <ChevronRight size={14} className="text-[var(--text-muted)] mt-0.5" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Safety Gate</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                    Pre-operational compliance check. Seatbelt, hydraulics, safety zone.
                  </p>
                  <div className="mt-3">
                    <StatusBadge state={safetyState} label={safety.allowed === false ? 'Blocked' : 'Passed'} />
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('what-if')}
                  className="jump-card border-[var(--yellow-border)] bg-[var(--yellow-dim)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="jump-card-icon bg-[rgba(245,166,35,0.2)]">
                      <Sliders size={18} className="text-[var(--yellow)]" />
                    </div>
                    <span className="chip chip-yellow text-[9px] py-0.5">HERO</span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">What-If Simulator</h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                    Adjust idle reduction and weather, see immediate fuel & time delta.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('proximity')}
                  className="jump-card border-[var(--blue-border)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="jump-card-icon bg-[var(--blue-dim)]">
                      <Compass size={18} className="text-[var(--blue)]" />
                    </div>
                    <span className="chip chip-blue text-[9px] py-0.5">LIVE</span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Predictive Proximity</h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                    2D trajectory lookahead · 45s collision advisory.
                  </p>
                </div>
              </div>

              {/* Weather card */}
              <FullDayWeatherCard weather={weather} />

              {/* Work order + baseline */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Current Work Order">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        {currentTask.task_type || 'Excavation'}
                      </h3>
                      <StatusBadge state={safetyState} label={currentTask.status || 'Scheduled'} />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {currentTask.description || 'Foundation cut on Lot A. Excavate trench line according to engineering grade.'}
                    </p>
                    <hr className="divider" />
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="label-caps mb-1">Planned</div>
                        <div className="font-semibold text-[var(--text-primary)] mono">{currentTask.estimated_duration ?? 74} min</div>
                      </div>
                      <div>
                        <div className="label-caps mb-1">Machine</div>
                        <div className="font-semibold text-[var(--yellow)] mono">{currentMachine.machine_code || 'EXC-001'}</div>
                      </div>
                      <div>
                        <div className="label-caps mb-1">Skill Req.</div>
                        <div className="font-semibold text-[var(--text-primary)]">{currentTask.required_skill || 'Expert'}</div>
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Operator Baseline Intelligence">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--yellow-dim)] flex items-center justify-center">
                        <BrainCircuit size={16} className="text-[var(--yellow)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                          {insight.title || 'Personal Baseline Active'}
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                          {insight.message || `Your typical idle for excavation is ${baselineIdle.toFixed(0)} min. Real-time monitoring in progress.`}
                        </p>
                      </div>
                    </div>

                    {isAnomaly && (
                      <div className="alert alert-danger">
                        <TriangleAlert size={14} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Idle Anomaly:</strong> {currentIdle.toFixed(0)} min ({idleRatio}× baseline).
                          Shut down during truck loading queues to conserve fuel.
                        </div>
                      </div>
                    )}

                    {!isAnomaly && (
                      <div className="alert alert-ok">
                        <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                        <span>Idling within normal range. No anomaly detected.</span>
                      </div>
                    )}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* TAB: TIME COMPLETION FORECASTER */}
          {activeTab === 'duration' && (
            <div className="fade-up">
              <TimeEstimationPanel />
            </div>
          )}

          {/* TAB: SAFETY SENTINEL / ANOMALY DETECTION */}
          {activeTab === 'alerts' && (
            <div className="fade-up">
              <AnomalySentinelPanel
                onNavigateToCopilot={(q) => {
                  setCopilotQuestion(q);
                  setActiveTab('copilot');
                }}
              />
            </div>
          )}

          {/* TAB: SAFETY GATE */}
          {activeTab === 'safety-gate' && (
            <div className="fade-up">
              <SafetyChecklist
                taskId={currentTask.id || 1}
                safetyStatus={safety}
                seatbeltFastened={Boolean(telemetry.seatbelt_status)}
                weatherCondition={weather.condition || 'Cloudy'}
                onRefresh={refreshData}
              />
            </div>
          )}

          {/* TAB: TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="fade-up">
              <TelemetryChart
                currentIdle={currentIdle}
                baselineIdle={baselineIdle}
                fuelUsed={telemetry.fuel_used ?? 18.2}
                engineLoad={telemetry.engine_load ?? 58.0}
                loadCycles={telemetry.load_cycles ?? 26}
                engineHours={telemetry.engine_hours ?? 131.5}
                telemetry={telemetry}
                machineCode={currentMachine?.machine_code || 'CAT-336D'}
                operatorName={user?.name || 'Avery Stone'}
                onAdvanceTick={handleAdvanceSimulation}
              />
            </div>
          )}

          {/* TAB: WHAT-IF */}
          {activeTab === 'what-if' && (
            <div className="fade-up">
              <WhatIfPanel taskId={currentTask.id || 1} initialData={data?.what_if} />
            </div>
          )}

          {/* TAB: PROXIMITY */}
          {activeTab === 'proximity' && (
            <div className="fade-up">
              <PredictiveSafetyMap
                taskId={currentTask.id || 1}
                operatorName={user?.name}
                machineCode={currentMachine?.machine_code}
              />
            </div>
          )}

          {/* TAB: TRAINING */}
          {activeTab === 'training' && (
            <div className="fade-up">
              <DomainGuardTraining
                operatorId={user?.id || 2}
                machineType={currentMachine.machine_type || 'Excavator'}
                recommendedTopic={data?.training_recommendation?.title}
              />
            </div>
          )}

          {/* TAB: COPILOT */}
          {activeTab === 'copilot' && (
            <div className="fade-up">
              <CopilotPanel
                machineCode={currentMachine.machine_code || 'EXC-001'}
                taskType={currentTask.task_type || 'Excavation'}
                initialMessage={copilotQuestion || insight.message}
              />
            </div>
          )}

        </main>
      </div>

      {/* Explainable Narrative Alert Modal */}
      <ExplainableNarrativeAlertModal
        alert={overviewNarrativeAlert}
        isOpen={isOverviewNarrativeOpen}
        onClose={() => setIsOverviewNarrativeOpen(false)}
        onAskCopilot={(q) => {
          setCopilotQuestion(q);
          setActiveTab('copilot');
        }}
      />
    </div>
  );
}
