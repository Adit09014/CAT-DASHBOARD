import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  TriangleAlert,
  Activity,
  Sliders,
  CheckCircle2,
  RefreshCcw,
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
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../services/auth';
import { Panel } from './Panel';
import { useLanguage } from '../services/i18n';
import { ExplainableNarrativeAlertModal, ExplainableNarrativeAlert } from './ExplainableNarrativeAlertModal';

interface AnomalySentinelPanelProps {
  onNavigateToCopilot?: (question: string) => void;
}

export function AnomalySentinelPanel({ onNavigateToCopilot }: AnomalySentinelPanelProps = {}) {
  const { user } = useAuth();
  const { t, currentLang } = useLanguage();
  const queryClient = useQueryClient();

  // Active view tab inside Anomaly Center
  const [activeSection, setActiveSection] = useState<'monitor' | 'simulator' | 'alerts'>('monitor');

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
    queryKey: ['anomaly-alerts', currentLang],
    queryFn: async () => (await api.get('/anomaly/alerts', { params: { lang: currentLang } })).data,
    refetchInterval: 8000,
  });

  // Mutation: ML Predict on Simulator
  const predictMutation = useMutation({
    mutationFn: async (payload: typeof simForm) => (await api.post('/anomaly/predict', payload)).data,
  });

  // Narrative Modal State & Mutations
  const [narrativeModalAlert, setNarrativeModalAlert] = useState<ExplainableNarrativeAlert | null>(null);
  const [isNarrativeModalOpen, setIsNarrativeModalOpen] = useState(false);

  const generateNarrativeMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/anomaly/narrative/generate', payload)).data,
    onSuccess: (data) => {
      setNarrativeModalAlert(data);
      setIsNarrativeModalOpen(true);
    },
  });

  const handleOpenAlertNarrative = async (alertItem: any) => {
    if (alertItem.narrative) {
      setNarrativeModalAlert({
        ...alertItem.narrative,
        acknowledged: alertItem.acknowledged,
      });
      setIsNarrativeModalOpen(true);
    }
    try {
      const res = await api.get(`/anomaly/alerts/${alertItem.id}/narrative`, {
        params: { lang: currentLang }
      });
      if (res.data) {
        setNarrativeModalAlert({
          ...res.data,
          acknowledged: alertItem.acknowledged,
        });
        setIsNarrativeModalOpen(true);
      }
    } catch (e) {
      console.error('Failed to load alert narrative:', e);
      if (!alertItem.narrative) {
        setNarrativeModalAlert({
          alert_id: alertItem.id,
          headline: alertItem.explanation?.title || alertItem.anomaly_type || 'Safety Sentinel Alert',
          threat_level: alertItem.severity || 'WARNING',
          confidence_pct: Math.round((alertItem.confidence || 0.8) * 100),
          summary_narrative: alertItem.explanation?.message || 'Anomaly logged in fleet telemetry.',
          detailed_analysis: 'Historical telemetry record logged in fleet safety ledger.',
          causal_chain: ['Anomaly detected in system telemetry', 'Incident logged to fleet sentinel'],
          feature_attributions: [],
          immediate_sop_actions: [],
          preventive_measures: ['Verify machine sensors and perform diagnostic inspection.'],
          audio_briefing_text: alertItem.explanation?.title || 'Safety alert detected.',
          machine_code: 'EXC-001',
          acknowledged: alertItem.acknowledged,
          timestamp: alertItem.created_at,
        });
        setIsNarrativeModalOpen(true);
      }
    }
  };

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

  return (
    <div className="space-y-6 fade-up">
      
      {/* ── Sub-navigation Header ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-heading flex items-center gap-2">
              <TriangleAlert size={20} className="text-amber-400" />
              {t('sentinel_title')}
            </h1>
            <span className="chip chip-zinc text-[10px]">
              LogisticRegression (15k Dataset)
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {t('sentinel_subtitle', `Real-time inference on 27 heavy equipment telemetry attributes with decision threshold τ = ${threshold.toFixed(3)}.`)}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-lg p-1 text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveSection('monitor')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeSection === 'monitor'
                ? 'bg-amber-400 text-black font-extrabold shadow-md shadow-amber-500/25'
                : 'text-zinc-400 hover:text-white hover:bg-white/10 font-medium'
            }`}
          >
            {t('live_diagnostics')}
          </button>
          <button
            onClick={() => {
              setActiveSection('simulator');
              if (!simResult) predictMutation.mutate(simForm);
            }}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeSection === 'simulator'
                ? 'bg-amber-400 text-black font-extrabold shadow-md shadow-amber-500/25'
                : 'text-zinc-400 hover:text-white hover:bg-white/10 font-medium'
            }`}
          >
            {t('ml_simulator')}
          </button>
          <button
            onClick={() => setActiveSection('alerts')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeSection === 'alerts'
                ? 'bg-amber-400 text-black font-extrabold shadow-md shadow-amber-500/25'
                : 'text-zinc-400 hover:text-white hover:bg-white/10 font-medium'
            }`}
          >
            <span>{t('alert_feed')}</span>
            <span className={`text-[10px] px-1.5 py-0 rounded-full font-bold ${
              activeSection === 'alerts' ? 'bg-black text-amber-500 font-extrabold' : 'bg-white/10 text-white'
            }`}>
              {alertsQuery.data?.length || 0}
            </span>
          </button>
        </div>
      </div>

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
              <h2 className="text-base font-bold text-white tracking-tight">
                {t('sentinel_threat_state')}: {threatLevel}
              </h2>
              <span className={`chip text-[11px] font-bold uppercase ${
                threatLevel === 'CRITICAL' ? 'chip-red' : threatLevel === 'ELEVATED' ? 'chip-amber' : 'chip-green'
              }`}>
                {threatLevel === 'CRITICAL' ? t('safety_alert_active') : threatLevel === 'ELEVATED' ? t('elevated_risk') : t('normal_operations')}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Machine: <span className="font-semibold text-white">{liveData?.machine?.machine_code || 'EXC-001'}</span> ({liveData?.machine?.machine_type || 'Excavator'}) ·
              Operator: <span className="font-semibold text-white">{user?.name || 'Avery Stone'}</span> ·
              Decision Threshold τ = <span className="font-mono text-amber-300 font-semibold">{threshold.toFixed(3)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-lg px-4 py-2 self-start md:self-auto">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{t('model_probability')}</div>
            <div className={`text-2xl font-mono font-bold ${
              alertProb >= threshold ? 'text-rose-400' : alertProb >= 0.35 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {(alertProb * 100).toFixed(1)}%
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{t('alert_trigger')}</div>
            <div className="text-sm font-semibold">
              {isTriggered ? (
                <span className="text-rose-400 flex items-center gap-1 font-bold">
                  <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  {t('yes_breach')}
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle2 size={14} />
                  {t('no_clear')}
                </span>
              )}
            </div>
          </div>

          <div className="h-8 w-px bg-white/10 hidden sm:block" />
          <div className="self-center">
            <button
              onClick={() => {
                const tel = liveData?.telemetry || {};
                generateNarrativeMutation.mutate({
                  telemetry: tel,
                  alert_type: threatLevel === 'CRITICAL' ? 'SAFETY_ML_CRITICAL_BREACH' : 'SAFETY_ML_ELEVATED_RISK',
                  threat_level: threatLevel,
                  confidence: alertProb,
                  lang: currentLang,
                  machine_code: liveData?.machine?.machine_code || 'EXC-001',
                });
              }}
              disabled={generateNarrativeMutation.isPending}
              className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 border-amber-500/40 text-amber-300 hover:border-amber-400 hover:bg-amber-950/30 whitespace-nowrap shadow"
              title="Open Explainable AI Narrative"
            >
              <Sparkles size={13} className="text-[var(--cat-yellow)]" />
              <span>{t('explain_hazard', 'Explain Hazard')}</span>
            </button>
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
                <span>{t('chassis_stability')}</span>
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
                <span>{t('radar_proximity')}</span>
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
                <span>{t('operator_state')}</span>
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
                <span>{t('payload_driving')}</span>
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
              <span className="text-xs text-slate-400 mr-2">{t('trigger_incident_test')}</span>
              <button
                onClick={() => handleApplyPreset('normal')}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-emerald-500/40"
              >
                <CheckCircle2 size={13} className="text-emerald-400" />
                {t('normal_baseline')}
              </button>
              <button
                onClick={() => handleApplyPreset('rollover')}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-rose-500/40 text-rose-300"
              >
                <TriangleAlert size={13} className="text-rose-400" />
                {t('rollover_hazard')}
              </button>
              <button
                onClick={() => handleApplyPreset('proximity')}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-rose-500/40 text-rose-300"
              >
                <Activity size={13} className="text-rose-400" />
                {t('proximity_breach')}
              </button>
              <button
                onClick={() => handleApplyPreset('fatigue')}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-amber-500/40 text-amber-300"
              >
                <Clock size={13} className="text-amber-400" />
                {t('severe_fatigue')}
              </button>
              <button
                onClick={() => handleApplyPreset('rain_traction')}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-sky-500/40 text-sky-300"
              >
                <Cpu size={13} className="text-sky-400" />
                {t('heavy_rain_slope')}
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
                <span className="text-xs text-slate-400">{t('quick_test_scenarios')}</span>
                <button onClick={() => handleApplyPreset('normal')} className="chip chip-green cursor-pointer text-xs">{t('normal_run')}</button>
                <button onClick={() => handleApplyPreset('rollover')} className="chip chip-red cursor-pointer text-xs">{t('rollover_hazard_short')}</button>
                <button onClick={() => handleApplyPreset('proximity')} className="chip chip-red cursor-pointer text-xs">{t('proximity_breach_short')}</button>
                <button onClick={() => handleApplyPreset('fatigue')} className="chip chip-amber cursor-pointer text-xs">{t('fatigue_unfastened')}</button>
                <button onClick={() => handleApplyPreset('rain_traction')} className="chip chip-zinc cursor-pointer text-xs">{t('rain_slope_slip')}</button>
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

                {/* Explain Simulation Narrative button */}
                <button
                  onClick={() => {
                    generateNarrativeMutation.mutate({
                      telemetry: simForm,
                      alert_type: activeSimTriggered ? 'SAFETY_ML_SIMULATED_BREACH' : 'SAFETY_ML_SIMULATION',
                      threat_level: activeSimThreat,
                      confidence: activeSimProb,
                      lang: currentLang,
                      machine_code: liveData?.machine?.machine_code || 'EXC-001',
                    });
                  }}
                  disabled={generateNarrativeMutation.isPending}
                  className="btn btn-secondary text-xs py-2 px-3 w-full mt-4 flex items-center justify-center gap-1.5 border-[var(--cat-yellow)]/40 text-yellow-300 hover:border-[var(--cat-yellow)] hover:bg-yellow-950/20"
                >
                  <Sparkles size={13} className="text-[var(--cat-yellow)]" />
                  <span>{t('explain_alert', 'Explain Simulation Narrative')}</span>
                </button>
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
                        <td className="py-3 px-3 max-w-xs text-slate-300">
                          <div className="font-semibold text-white truncate">
                            {alert.narrative?.headline || alert.explanation?.title || alert.anomaly_type}
                          </div>
                          {alert.narrative?.summary_narrative && (
                            <div className="text-[10px] text-slate-400 line-clamp-1">
                              {alert.narrative.summary_narrative}
                            </div>
                          )}
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenAlertNarrative(alert)}
                              className="btn btn-secondary text-[11px] py-1 px-2 text-yellow-300 border-yellow-500/30 hover:border-yellow-400 flex items-center gap-1"
                              title="Inspect Explainable AI Narrative"
                            >
                              <Sparkles size={11} className="text-[var(--cat-yellow)]" />
                              <span>{t('explain_alert', 'Explain')}</span>
                            </button>

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
                          </div>
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

      {/* Explainable Narrative Alert Modal */}
      <ExplainableNarrativeAlertModal
        alert={narrativeModalAlert}
        isOpen={isNarrativeModalOpen}
        onClose={() => setIsNarrativeModalOpen(false)}
        onAcknowledge={(id) => id && acknowledgeMutation.mutate(id)}
        onAskCopilot={onNavigateToCopilot}
      />
    </div>
  );
}
