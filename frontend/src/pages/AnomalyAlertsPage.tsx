import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  TriangleAlert,
  Activity,
  Sliders,
  CheckCircle2,
  RefreshCcw,
  LogOut,
  ArrowLeft,
  Gauge,
  Layers,
  Database,
  Search,
  Filter,
  Eye,
  Check,
  Zap,
  TrendingUp,
  Cpu,
  Compass,
  Clock,
  Weight,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../services/auth';
import { StatusBadge } from '../components/StatusBadge';
import { Panel } from '../components/Panel';

export function AnomalyAlertsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active view tab inside Anomaly Center
  const [activeSection, setActiveSection] = useState<'monitor' | 'simulator' | 'alerts' | 'dataset'>('monitor');

  // Interactive Simulator State
  const [simForm, setSimForm] = useState({
    machine_tilt_deg: 1.8,
    ground_slope_deg: 2.5,
    min_obstacle_distance_m: 25.0,
    proximity_hazard: false,
    seatbelt_status: true,
    harsh_braking_events: 0,
    harsh_acceleration_events: 0,
    continuous_driving_min: 45.0,
    operator_shift_hours: 3.0,
    operator_experience_months: 89,
    machine_speed_kmph: 12.0,
    load_weight_tons: 12.5,
    max_load_capacity_tons: 25.0,
    load_utilization_pct: 50.0,
    idling_time_min: 18.0,
    engine_hours: 1450.0,
    fuel_used_l: 8.5,
    load_cycles: 8,
    weather_condition: 'Clear',
    visibility_m: 180.0,
    shift_type: 'Morning',
  });

  // Query: Live Anomaly Status
  const liveAnomalyQuery = useQuery({
    queryKey: ['anomaly-live'],
    queryFn: async () => (await api.get('/anomaly/live')).data,
    refetchInterval: 6000,
  });

  // Query: Historical & Active Alerts
  const alertsQuery = useQuery({
    queryKey: ['anomaly-alerts'],
    queryFn: async () => (await api.get('/anomaly/alerts')).data,
    refetchInterval: 8000,
  });

  // Query: CSV Dataset Statistics
  const datasetStatsQuery = useQuery({
    queryKey: ['anomaly-dataset-stats'],
    queryFn: async () => (await api.get('/anomaly/dataset-stats')).data,
  });

  // Query: CSV Dataset Samples
  const [datasetFilterAlertOnly, setDatasetFilterAlertOnly] = useState(false);
  const datasetSampleQuery = useQuery({
    queryKey: ['anomaly-dataset-sample', datasetFilterAlertOnly],
    queryFn: async () => (await api.get(`/anomaly/dataset-sample?limit=30&alert_only=${datasetFilterAlertOnly}`)).data,
  });

  // Mutation: ML Predict on Simulator
  const predictMutation = useMutation({
    mutationFn: async (payload: typeof simForm) => (await api.post('/anomaly/predict', payload)).data,
  });

  // Mutation: Acknowledge Alert
  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: number) => (await api.post(`/anomaly/alerts/${alertId}/acknowledge`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomaly-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['anomaly-live'] });
    },
  });

  // Preset Scenario Handlers
  const handleApplyPreset = (preset: string) => {
    let updated = { ...simForm };
    if (preset === 'normal') {
      updated = {
        ...simForm,
        machine_tilt_deg: 1.8,
        ground_slope_deg: 2.5,
        min_obstacle_distance_m: 28.0,
        proximity_hazard: false,
        seatbelt_status: true,
        harsh_braking_events: 0,
        harsh_acceleration_events: 0,
        continuous_driving_min: 45.0,
        weather_condition: 'Clear',
        visibility_m: 180.0,
      };
    } else if (preset === 'rollover') {
      updated = {
        ...simForm,
        machine_tilt_deg: 9.6,
        ground_slope_deg: 8.8,
        min_obstacle_distance_m: 12.0,
        proximity_hazard: false,
        seatbelt_status: true,
        harsh_braking_events: 2,
        continuous_driving_min: 95.0,
      };
    } else if (preset === 'proximity') {
      updated = {
        ...simForm,
        min_obstacle_distance_m: 2.8,
        proximity_hazard: true,
        harsh_braking_events: 3,
        machine_speed_kmph: 18.5,
        visibility_m: 110.0,
      };
    } else if (preset === 'fatigue') {
      updated = {
        ...simForm,
        continuous_driving_min: 175.0,
        operator_shift_hours: 10.5,
        seatbelt_status: false,
        harsh_braking_events: 2,
        machine_tilt_deg: 6.8,
      };
    } else if (preset === 'rain_traction') {
      updated = {
        ...simForm,
        weather_condition: 'Heavy_Rain',
        visibility_m: 22.0,
        ground_slope_deg: 7.4,
        harsh_braking_events: 2,
        harsh_acceleration_events: 2,
      };
    }
    setSimForm(updated);
    predictMutation.mutate(updated);
  };

  const liveData = liveAnomalyQuery.data;
  const evaluation = liveData?.evaluation || {};
  const currentTelemetry = liveData?.telemetry || {};
  const alertProb = evaluation.safety_alert_prob ?? 0.02;
  const threshold = evaluation.decision_threshold ?? 0.655;
  const isTriggered = evaluation.safety_alert_triggered ?? (alertProb >= threshold);
  const threatLevel = evaluation.threat_level ?? (isTriggered ? 'CRITICAL' : alertProb >= 0.4 ? 'ELEVATED' : 'NORMAL');
  const riskFactors = evaluation.risk_factors || [];

  const simResult = predictMutation.data;
  const activeSimProb = simResult ? simResult.safety_alert_prob : alertProb;
  const activeSimTriggered = simResult ? simResult.safety_alert_triggered : isTriggered;
  const activeSimThreat = simResult ? simResult.threat_level : threatLevel;
  const activeSimFactors = simResult ? simResult.risk_factors : riskFactors;

  const datasetStats = datasetStatsQuery.data || {
    total_samples: 15000,
    alert_triggered_count: 4200,
    alert_triggered_rate: 28.0,
    avg_obstacle_distance: 22.4,
    avg_tilt_deg: 3.4,
    avg_slope_deg: 4.1,
    top_predictive_features: [],
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col font-sans">
      
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="navbar border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(user?.role === 'ADMIN' ? '/admin' : '/operator')}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-1 px-2.5"
            title="Return to Dashboard"
          >
            <ArrowLeft size={13} />
            <span>Dashboard</span>
          </button>
          <div className="h-5 w-px bg-[var(--border-subtle)]" />
          <div className="flex items-center gap-2">
            <div className="navbar-badge bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs font-bold">
              <TriangleAlert size={13} className="text-rose-400 animate-pulse" />
              SENTINEL
            </div>
            <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              Safety Anomaly & Hazard Center
            </span>
            <span className="chip chip-zinc text-[10px] hidden sm:inline">
              Model: LogisticRegression (15k Dataset)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/30 border border-white/5 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setActiveSection('monitor')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeSection === 'monitor' ? 'bg-[var(--cat-yellow)] text-black font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Diagnostics
            </button>
            <button
              onClick={() => {
                setActiveSection('simulator');
                if (!simResult) predictMutation.mutate(simForm);
              }}
              className={`px-3 py-1 rounded-md transition-all ${
                activeSection === 'simulator' ? 'bg-[var(--cat-yellow)] text-black font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              ML Simulator
            </button>
            <button
              onClick={() => setActiveSection('alerts')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeSection === 'alerts' ? 'bg-[var(--cat-yellow)] text-black font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Alert Feed ({alertsQuery.data?.length || 0})
            </button>
            <button
              onClick={() => setActiveSection('dataset')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeSection === 'dataset' ? 'bg-[var(--cat-yellow)] text-black font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dataset Intelligence
            </button>
          </div>

          <button
            onClick={() => {
              liveAnomalyQuery.refetch();
              alertsQuery.refetch();
            }}
            className="btn btn-ghost p-1.5"
            title="Refresh All"
          >
            <RefreshCcw size={14} className={liveAnomalyQuery.isFetching ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => logout()} className="btn btn-ghost p-1.5" title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ── Main Content Area ─────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">

        {/* ── Status Banner ─────────────────────────────────── */}
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          threatLevel === 'CRITICAL'
            ? 'bg-rose-950/40 border-rose-500/40 shadow-lg shadow-rose-950/30'
            : threatLevel === 'ELEVATED'
            ? 'bg-amber-950/30 border-amber-500/40 shadow-lg shadow-amber-950/20'
            : 'bg-emerald-950/20 border-emerald-500/30'
        }`}>
          <div className="flex items-start md:items-center gap-3.5">
            <div className={`p-2.5 rounded-lg border ${
              threatLevel === 'CRITICAL'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : threatLevel === 'ELEVATED'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            }`}>
              <ShieldAlert size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Sentinel System Status: {threatLevel}
                </h1>
                <span className={`chip text-[11px] font-bold uppercase ${
                  threatLevel === 'CRITICAL' ? 'chip-red' : threatLevel === 'ELEVATED' ? 'chip-amber' : 'chip-green'
                }`}>
                  {threatLevel === 'CRITICAL' ? 'SAFETY ALERT ACTIVE' : threatLevel === 'ELEVATED' ? 'ELEVATED RISK' : 'NORMAL OPERATIONS'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Evaluated by Scikit-Learn Safety Classifier against Decision Threshold τ = <span className="font-mono text-amber-300 font-semibold">{threshold.toFixed(3)}</span>.
                Machine: <span className="font-semibold text-white">{liveData?.machine?.machine_code || 'EXC-001'}</span> ·
                Operator: <span className="font-semibold text-white">{user?.name || 'Avery Stone'}</span> ({user?.role || 'OPERATOR'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-lg px-4 py-2 self-start md:self-auto">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Model Probability</div>
              <div className={`text-2xl font-mono font-bold ${
                alertProb >= threshold ? 'text-rose-400' : alertProb >= 0.35 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {(alertProb * 100).toFixed(1)}%
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Alert Trigger</div>
              <div className="text-sm font-semibold">
                {isTriggered ? (
                  <span className="text-rose-400 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    YES (BREACH)
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    NO (CLEAR)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 1: LIVE DIAGNOSTICS & TELEMETRY BREAKDOWN ───────────── */}
        {activeSection === 'monitor' && (
          <div className="space-y-6">
            
            {/* Top Critical Risk Factor Alerts */}
            {riskFactors.length > 0 ? (
              <Panel title="Active Threat Risk Contributors" icon={<TriangleAlert size={16} className="text-amber-400" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {riskFactors.map((rf: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg border flex items-start gap-3 transition-all ${
                        rf.severity === 'CRITICAL'
                          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                          : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      }`}
                    >
                      <div className="mt-0.5">
                        <AlertCircle size={16} className={rf.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white">{rf.factor}</span>
                          <span className={`chip text-[9px] py-0 px-1 font-mono ${
                            rf.severity === 'CRITICAL' ? 'chip-red' : 'chip-amber'
                          }`}>
                            {rf.weight}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">{rf.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : (
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-400" />
                <span className="text-sm text-emerald-200">
                  All machine stability, proximity radar, and operator vigilance telemetry are operating within certified safety envelopes.
                </span>
              </div>
            )}

            {/* Core Telemetry Attributes Grid (Direct from synthetic_safety_alert_data.csv) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Machine Tilt & Ground Slope */}
              <div className="card p-4 flex flex-col justify-between border-slate-800 bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                  <span>Chassis Stability</span>
                  <Compass size={16} className="text-sky-400" />
                </div>
                <div className="my-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Roll Tilt:</span>
                    <span className={`text-xl font-mono font-bold ${
                      (currentTelemetry.machine_tilt_deg ?? 1.8) >= 5.0 ? 'text-rose-400' : 'text-white'
                    }`}>
                      {(currentTelemetry.machine_tilt_deg ?? 1.8).toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs text-slate-400">Ground Incline:</span>
                    <span className={`text-base font-mono font-semibold ${
                      (currentTelemetry.ground_slope_deg ?? 2.5) >= 6.0 ? 'text-amber-400' : 'text-slate-300'
                    }`}>
                      {(currentTelemetry.ground_slope_deg ?? 2.5).toFixed(1)}°
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full ${
                      (currentTelemetry.machine_tilt_deg ?? 1.8) >= 7.5 ? 'bg-rose-500' : (currentTelemetry.machine_tilt_deg ?? 1.8) >= 5.0 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, ((currentTelemetry.machine_tilt_deg ?? 1.8) / 10.0) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-2">Safe Roll Limit: &lt; 5.0° · Critical: &gt; 7.5°</span>
              </div>

              {/* Card 2: Obstacle Distance & Proximity Hazard */}
              <div className="card p-4 flex flex-col justify-between border-slate-800 bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                  <span>Radar Proximity</span>
                  <Activity size={16} className="text-rose-400" />
                </div>
                <div className="my-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Min Obstacle:</span>
                    <span className={`text-xl font-mono font-bold ${
                      (currentTelemetry.min_obstacle_distance_m ?? 25.0) <= 6.0 ? 'text-rose-400' : 'text-white'
                    }`}>
                      {(currentTelemetry.min_obstacle_distance_m ?? 25.0).toFixed(1)} m
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs text-slate-400">Hazard Flag:</span>
                    <span className={`text-xs font-bold uppercase ${
                      currentTelemetry.proximity_hazard ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {currentTelemetry.proximity_hazard ? 'BREACHED' : 'CLEAR'}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full ${
                      (currentTelemetry.min_obstacle_distance_m ?? 25.0) <= 5.0 ? 'bg-rose-500' : (currentTelemetry.min_obstacle_distance_m ?? 25.0) <= 8.0 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(10, ((currentTelemetry.min_obstacle_distance_m ?? 25.0) / 30.0) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-2">Hazard Threshold: 8.0 m · Impact: -1.57 weight</span>
              </div>

              {/* Card 3: Operator Ergonomics & Fatigue */}
              <div className="card p-4 flex flex-col justify-between border-slate-800 bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                  <span>Operator State</span>
                  <Clock size={16} className="text-amber-400" />
                </div>
                <div className="my-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Seatbelt:</span>
                    <span className={`text-xs font-bold uppercase ${
                      currentTelemetry.seatbelt_status ? 'text-emerald-400' : 'text-rose-400 animate-pulse'
                    }`}>
                      {currentTelemetry.seatbelt_status ? 'FASTENED' : 'UNFASTENED'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs text-slate-400">Driving Time:</span>
                    <span className={`text-base font-mono font-semibold ${
                      (currentTelemetry.continuous_driving_min ?? 35.0) >= 120.0 ? 'text-rose-400' : 'text-white'
                    }`}>
                      {(currentTelemetry.continuous_driving_min ?? 35.0).toFixed(0)} min
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs text-slate-400">Shift Elapsed:</span>
                    <span className="text-xs font-mono text-slate-300">
                      {(currentTelemetry.operator_shift_hours ?? 2.5).toFixed(1)} hrs
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full ${
                      (currentTelemetry.continuous_driving_min ?? 35.0) >= 120.0 ? 'bg-rose-500' : 'bg-sky-400'
                    }`}
                    style={{ width: `${Math.min(100, ((currentTelemetry.continuous_driving_min ?? 35.0) / 180.0) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-2">Fatigue Alert at 120 min continuous drive</span>
              </div>

              {/* Card 4: Load & Dynamic Events */}
              <div className="card p-4 flex flex-col justify-between border-slate-800 bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                  <span>Payload & Driving</span>
                  <Weight size={16} className="text-emerald-400" />
                </div>
                <div className="my-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Bucket Load:</span>
                    <span className="text-base font-mono font-semibold text-white">
                      {(currentTelemetry.load_weight_tons ?? 12.0).toFixed(1)} / {(currentTelemetry.max_load_capacity_tons ?? 25.0).toFixed(0)} t
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs text-slate-400">Utilization:</span>
                    <span className="text-xs font-mono text-amber-300">
                      {(currentTelemetry.load_utilization_pct ?? 48.0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs text-slate-400">Harsh Braking:</span>
                    <span className={`text-xs font-mono font-bold ${
                      (currentTelemetry.harsh_braking_events ?? 0) > 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {currentTelemetry.harsh_braking_events ?? 0} events
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${Math.min(100, currentTelemetry.load_utilization_pct ?? 50.0)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-2">Machine Speed: {(currentTelemetry.machine_speed_kmph ?? 12.0).toFixed(1)} km/h</span>
              </div>

            </div>

            {/* Quick Presets & Actions Bar */}
            <Panel title="Real-Time Simulator Actions" icon={<Sliders size={16} className="text-[var(--cat-yellow)]" />}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 mr-2">Trigger Live Incident Test:</span>
                <button
                  onClick={() => handleApplyPreset('normal')}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-emerald-500/40"
                >
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  Normal Baseline
                </button>
                <button
                  onClick={() => handleApplyPreset('rollover')}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-rose-500/40 text-rose-300"
                >
                  <TriangleAlert size={13} className="text-rose-400" />
                  Chassis Rollover (9.6° Tilt)
                </button>
                <button
                  onClick={() => handleApplyPreset('proximity')}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-rose-500/40 text-rose-300"
                >
                  <Activity size={13} className="text-rose-400" />
                  Proximity Breach (2.8m)
                </button>
                <button
                  onClick={() => handleApplyPreset('fatigue')}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-amber-500/40 text-amber-300"
                >
                  <Clock size={13} className="text-amber-400" />
                  Severe Fatigue + Seatbelt Off
                </button>
                <button
                  onClick={() => handleApplyPreset('rain_traction')}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-sky-500/40 text-sky-300"
                >
                  <Cpu size={13} className="text-sky-400" />
                  Heavy Rain & Steep Incline
                </button>
              </div>
            </Panel>

          </div>
        )}

        {/* ── SECTION 2: INTERACTIVE ML INFERENCE SIMULATOR ─────────────── */}
        {activeSection === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Form Sliders & Attribute Inputs */}
            <div className="lg:col-span-2 space-y-4">
              <Panel title="Interactive Telemetry Attribute Controls" icon={<Sliders size={16} className="text-[var(--cat-yellow)]" />}>
                
                {/* Quick Presets */}
                <div className="mb-5 pb-4 border-b border-white/5 flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-slate-400">Quick Test Scenarios:</span>
                  <button onClick={() => handleApplyPreset('normal')} className="chip chip-green cursor-pointer text-xs">Normal Run</button>
                  <button onClick={() => handleApplyPreset('rollover')} className="chip chip-red cursor-pointer text-xs">Rollover Hazard</button>
                  <button onClick={() => handleApplyPreset('proximity')} className="chip chip-red cursor-pointer text-xs">Proximity Breach</button>
                  <button onClick={() => handleApplyPreset('fatigue')} className="chip chip-amber cursor-pointer text-xs">Fatigue & Unfastened</button>
                  <button onClick={() => handleApplyPreset('rain_traction')} className="chip chip-zinc cursor-pointer text-xs">Rain / Slope Slip</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  
                  {/* Machine Tilt */}
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span>Machine Tilt:</span>
                      <span className="font-mono text-amber-300">{simForm.machine_tilt_deg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="15.0"
                      step="0.2"
                      value={simForm.machine_tilt_deg}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const updated = { ...simForm, machine_tilt_deg: val };
                        setSimForm(updated);
                        predictMutation.mutate(updated);
                      }}
                      className="w-full accent-[var(--cat-yellow)]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0.0° (Level)</span>
                      <span>5.0° (Limit)</span>
                      <span>15.0° (Roll)</span>
                    </div>
                  </div>

                  {/* Ground Slope */}
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span>Ground Slope Grade:</span>
                      <span className="font-mono text-amber-300">{simForm.ground_slope_deg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="14.0"
                      step="0.2"
                      value={simForm.ground_slope_deg}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const updated = { ...simForm, ground_slope_deg: val };
                        setSimForm(updated);
                        predictMutation.mutate(updated);
                      }}
                      className="w-full accent-[var(--cat-yellow)]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0.0°</span>
                      <span>6.0° (Incline)</span>
                      <span>14.0° (Steep)</span>
                    </div>
                  </div>

                  {/* Obstacle Distance */}
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span>Min Obstacle Distance:</span>
                      <span className="font-mono text-sky-300">{simForm.min_obstacle_distance_m} m</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="45.0"
                      step="0.5"
                      value={simForm.min_obstacle_distance_m}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const updated = { ...simForm, min_obstacle_distance_m: val, proximity_hazard: val <= 8.0 };
                        setSimForm(updated);
                        predictMutation.mutate(updated);
                      }}
                      className="w-full accent-sky-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>1.0m (Collision)</span>
                      <span>8.0m (Boundary)</span>
                      <span>45.0m (Clear)</span>
                    </div>
                  </div>

                  {/* Continuous Driving Minutes */}
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span>Continuous Driving:</span>
                      <span className="font-mono text-amber-300">{simForm.continuous_driving_min} min</span>
                    </div>
                    <input
                      type="range"
                      min="10.0"
                      max="240.0"
                      step="5.0"
                      value={simForm.continuous_driving_min}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const updated = { ...simForm, continuous_driving_min: val };
                        setSimForm(updated);
                        predictMutation.mutate(updated);
                      }}
                      className="w-full accent-amber-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>10 min</span>
                      <span>120 min (Threshold)</span>
                      <span>240 min</span>
                    </div>
                  </div>

                  {/* Harsh Braking Events */}
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span>Harsh Braking Decelerations:</span>
                      <span className="font-mono text-rose-300">{simForm.harsh_braking_events}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      step="1"
                      value={simForm.harsh_braking_events}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        const updated = { ...simForm, harsh_braking_events: val };
                        setSimForm(updated);
                        predictMutation.mutate(updated);
                      }}
                      className="w-full accent-rose-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0 (Smooth)</span>
                      <span>3 (High)</span>
                      <span>6 (Extreme)</span>
                    </div>
                  </div>

                  {/* Machine Speed */}
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span>Machine Speed:</span>
                      <span className="font-mono text-white">{simForm.machine_speed_kmph} km/h</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="40.0"
                      step="1.0"
                      value={simForm.machine_speed_kmph}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const updated = { ...simForm, machine_speed_kmph: val };
                        setSimForm(updated);
                        predictMutation.mutate(updated);
                      }}
                      className="w-full accent-[var(--cat-yellow)]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0 km/h</span>
                      <span>20 km/h</span>
                      <span>40 km/h</span>
                    </div>
                  </div>

                  {/* Weather Condition */}
                  <div>
                    <span className="block font-semibold mb-1">Weather Condition:</span>
                    <select
                      value={simForm.weather_condition}
                      onChange={(e) => {
                        const val = e.target.value;
                        const vis = val === 'Heavy_Rain' ? 25.0 : val === 'Fog' ? 18.0 : val === 'Cloudy' ? 110.0 : 180.0;
                        const updated = { ...simForm, weather_condition: val, visibility_m: vis };
                        setSimForm(updated);
                        predictMutation.mutate(updated);
                      }}
                      className="input w-full text-xs"
                    >
                      <option value="Clear">Clear (High Visibility)</option>
                      <option value="Cloudy">Cloudy (Medium Visibility)</option>
                      <option value="Heavy_Rain">Heavy Rain (Low Visibility & Traction)</option>
                      <option value="Fog">Dense Fog (Severe Obstruction)</option>
                    </select>
                  </div>

                  {/* Shift Type */}
                  <div>
                    <span className="block font-semibold mb-1">Shift Type:</span>
                    <select
                      value={simForm.shift_type}
                      onChange={(e) => {
                        const updated = { ...simForm, shift_type: e.target.value };
                        setSimForm(updated);
                        predictMutation.mutate(updated);
                      }}
                      className="input w-full text-xs"
                    >
                      <option value="Morning">Morning Shift (Standard)</option>
                      <option value="Evening">Evening Shift (Dusk)</option>
                      <option value="Night">Night Shift (Low Ambient Light)</option>
                    </select>
                  </div>

                </div>

                {/* Toggles */}
                <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={simForm.seatbelt_status}
                      onChange={(e) => {
                        const updated = { ...simForm, seatbelt_status: e.target.checked };
                        setSimForm(updated);
                        predictMutation.mutate(updated);
                      }}
                      className="rounded accent-[var(--cat-yellow)]"
                    />
                    <span className={simForm.seatbelt_status ? 'text-emerald-300 font-semibold' : 'text-rose-400 font-bold'}>
                      Seatbelt Fastened ({simForm.seatbelt_status ? 'Engaged' : 'DISENGAGED'})
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={simForm.proximity_hazard}
                      onChange={(e) => {
                        const updated = { ...simForm, proximity_hazard: e.target.checked };
                        setSimForm(updated);
                        predictMutation.mutate(updated);
                      }}
                      className="rounded accent-rose-500"
                    />
                    <span className={simForm.proximity_hazard ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                      Proximity Hazard Breach Active
                    </span>
                  </label>
                </div>

              </Panel>
            </div>

            {/* Right Col: Instant ML Model Result Gauge & Contributions */}
            <div className="space-y-4">
              <Panel title="Scikit-Learn Inference Result" icon={<Cpu size={16} className="text-sky-400" />}>
                
                <div className={`p-4 rounded-xl border text-center transition-all ${
                  activeSimTriggered
                    ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-950/40'
                    : activeSimProb >= 0.4
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-emerald-950/20 border-emerald-500/30'
                }`}>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Model Predicted Threat Level
                  </div>
                  <div className={`text-3xl font-black tracking-tight my-1 ${
                    activeSimTriggered ? 'text-rose-400' : activeSimProb >= 0.4 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {activeSimThreat}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <span className="text-slate-400">Trigger Decision:</span>
                    <span className={`chip py-0.5 px-2 text-[10px] font-bold ${
                      activeSimTriggered ? 'chip-red' : 'chip-green'
                    }`}>
                      {activeSimTriggered ? 'ALERT TRIGGERED' : 'CLEAR / NO ALERT'}
                    </span>
                  </div>

                  {/* Circular/Bar Gauge */}
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Anomaly Probability</span>
                      <span className="font-mono font-bold text-white">{(activeSimProb * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden relative">
                      <div
                        className={`h-full transition-all duration-300 ${
                          activeSimTriggered ? 'bg-rose-500' : activeSimProb >= 0.4 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, activeSimProb * 100)}%` }}
                      />
                      {/* Decision threshold marker at 65.5% */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow"
                        style={{ left: `${threshold * 100}%` }}
                        title={`Threshold = ${(threshold * 100).toFixed(1)}%`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>0.0%</span>
                      <span className="text-amber-300 font-mono">τ = {(threshold * 100).toFixed(1)}%</span>
                      <span>100.0%</span>
                    </div>
                  </div>
                </div>

                {/* Contributing Features */}
                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                    <span>Ranked Feature Risk Drivers:</span>
                    <span className="text-[10px] text-slate-500">Logistic Regression Coefs</span>
                  </div>
                  <div className="space-y-2">
                    {simResult?.top_risk_contributors?.length ? (
                      simResult.top_risk_contributors.map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-black/30 border border-white/5">
                          <span className="text-slate-300">{c.feature}</span>
                          <span className={`chip py-0 px-1 text-[9px] font-mono ${
                            c.impact.includes('High') || c.impact.includes('Critical') ? 'chip-red' : 'chip-amber'
                          }`}>
                            +{c.score}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 italic p-3 text-center">
                        Input parameters are currently within normal baseline ranges.
                      </div>
                    )}
                  </div>
                </div>

              </Panel>
            </div>

          </div>
        )}

        {/* ── SECTION 3: ALERTS FEED & MANAGEMENT ─────────────────────────── */}
        {activeSection === 'alerts' && (
          <div className="space-y-4">
            <Panel title="Historical & Live Safety Anomaly Incidents" icon={<ShieldAlert size={16} className="text-rose-400" />}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/30 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-2.5 px-3">Alert ID</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Confidence</th>
                      <th className="py-2.5 px-3">Details / Root Cause</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {alertsQuery.data && alertsQuery.data.length > 0 ? (
                      alertsQuery.data.map((alert: any) => (
                        <tr key={alert.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-400">#{alert.id}</td>
                          <td className="py-3 px-3 font-semibold text-white">{alert.anomaly_type}</td>
                          <td className="py-3 px-3">
                            <span className={`chip text-[10px] font-bold ${
                              alert.severity === 'CRITICAL' ? 'chip-red' : 'chip-amber'
                            }`}>
                              {alert.severity}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-amber-300">
                            {alert.confidence ? `${(alert.confidence * 100).toFixed(1)}%` : '—'}
                          </td>
                          <td className="py-3 px-3 max-w-xs text-slate-300 truncate">
                            {alert.explanation?.title || JSON.stringify(alert.explanation)}
                          </td>
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                            {new Date(alert.created_at).toLocaleTimeString()}
                          </td>
                          <td className="py-3 px-3">
                            {alert.acknowledged ? (
                              <span className="chip chip-green text-[10px] flex items-center gap-1 w-fit">
                                <Check size={11} /> Ack'd
                              </span>
                            ) : (
                              <span className="chip chip-red text-[10px] flex items-center gap-1 w-fit animate-pulse">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {!alert.acknowledged ? (
                              <button
                                onClick={() => acknowledgeMutation.mutate(alert.id)}
                                disabled={acknowledgeMutation.isPending}
                                className="btn btn-secondary text-[11px] py-1 px-2.5 hover:border-emerald-500/40"
                              >
                                Acknowledge
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500">Verified</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-500">
                          No safety anomaly alerts logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {/* ── SECTION 4: DATASET INTELLIGENCE & SAMPLE EXPLORER ───────────── */}
        {activeSection === 'dataset' && (
          <div className="space-y-6">
            
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-4 border-slate-800 bg-[var(--bg-surface)]">
                <span className="text-xs text-slate-400 font-semibold uppercase">Total Training Records</span>
                <div className="text-2xl font-mono font-bold text-white mt-1">
                  {datasetStats.total_samples?.toLocaleString() || '15,000'}
                </div>
                <span className="text-[10px] text-slate-400 mt-1">synthetic_safety_alert_data.csv</span>
              </div>

              <div className="card p-4 border-slate-800 bg-[var(--bg-surface)]">
                <span className="text-xs text-slate-400 font-semibold uppercase">Alert Trigger Frequency</span>
                <div className="text-2xl font-mono font-bold text-rose-400 mt-1">
                  {datasetStats.alert_triggered_rate}%
                </div>
                <span className="text-[10px] text-slate-400 mt-1">
                  {datasetStats.alert_triggered_count?.toLocaleString()} Positive Alerts
                </span>
              </div>

              <div className="card p-4 border-slate-800 bg-[var(--bg-surface)]">
                <span className="text-xs text-slate-400 font-semibold uppercase">Mean Obstacle Distance</span>
                <div className="text-2xl font-mono font-bold text-sky-400 mt-1">
                  {datasetStats.avg_obstacle_distance} m
                </div>
                <span className="text-[10px] text-slate-400 mt-1">Top protective coefficient: -1.57</span>
              </div>

              <div className="card p-4 border-slate-800 bg-[var(--bg-surface)]">
                <span className="text-xs text-slate-400 font-semibold uppercase">Mean Machine Tilt</span>
                <div className="text-2xl font-mono font-bold text-amber-400 mt-1">
                  {datasetStats.avg_tilt_deg}°
                </div>
                <span className="text-[10px] text-slate-400 mt-1">Rollover hazard boundary &gt; 5.0°</span>
              </div>
            </div>

            {/* Model Feature Influence Weights */}
            <Panel title="Logistic Regression Feature Importance Ranking" icon={<BarChart3 size={16} className="text-amber-400" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {datasetStats.top_predictive_features?.map((feat: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-black/30 border border-white/5 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{feat.name}</span>
                        <span className="chip chip-zinc text-[9px] py-0 px-1 font-normal">{feat.direction}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{feat.description}</p>
                    </div>
                    <span className={`chip font-mono text-xs font-bold ${
                      feat.weight.startsWith('-') ? 'chip-green' : 'chip-red'
                    }`}>
                      {feat.weight}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Dataset Sample Table */}
            <Panel title="Dataset Records Browser (synthetic_safety_alert_data.csv)" icon={<Database size={16} className="text-sky-400" />}>
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="text-slate-400">Showing first 30 operational telemetry rows</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={datasetFilterAlertOnly}
                    onChange={(e) => setDatasetFilterAlertOnly(e.target.checked)}
                    className="rounded accent-[var(--cat-yellow)]"
                  />
                  <span className="text-xs font-semibold text-slate-300">Show Triggered Alerts Only</span>
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/30 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Machine</th>
                      <th className="py-2.5 px-3">Operator</th>
                      <th className="py-2.5 px-3">Tilt</th>
                      <th className="py-2.5 px-3">Slope</th>
                      <th className="py-2.5 px-3">Obstacle</th>
                      <th className="py-2.5 px-3">Seatbelt</th>
                      <th className="py-2.5 px-3">Driving</th>
                      <th className="py-2.5 px-3">Weather</th>
                      <th className="py-2.5 px-3">Alert Triggered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {datasetSampleQuery.data?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">{row.timestamp}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-white">{row.machine_id}</td>
                        <td className="py-2 px-3 font-mono text-slate-300">{row.operator_id}</td>
                        <td className={`py-2 px-3 font-mono ${row.machine_tilt_deg >= 5.0 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                          {row.machine_tilt_deg}°
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-300">{row.ground_slope_deg}°</td>
                        <td className={`py-2 px-3 font-mono ${row.min_obstacle_distance_m <= 6.0 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                          {row.min_obstacle_distance_m}m
                        </td>
                        <td className="py-2 px-3">
                          <span className={`chip text-[9px] py-0 px-1 ${
                            row.seatbelt_status === 'Fastened' ? 'chip-green' : 'chip-red'
                          }`}>
                            {row.seatbelt_status}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-300">{row.continuous_driving_min} min</td>
                        <td className="py-2 px-3 text-slate-400">{row.weather}</td>
                        <td className="py-2 px-3">
                          <span className={`chip text-[10px] font-bold ${
                            row.safety_alert_triggered ? 'chip-red' : 'chip-green'
                          }`}>
                            {row.safety_alert_triggered ? 'ALERT' : 'NORMAL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

          </div>
        )}

      </main>
    </div>
  );
}
