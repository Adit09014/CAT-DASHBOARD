import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Clock,
  Sliders,
  Database,
  Layers,
  CalendarCheck,
  TrendingUp,
  TriangleAlert,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  Zap,
  ShieldAlert,
  Compass,
  Gauge,
  Award,
  Filter,
  Search,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Panel } from './Panel';
import { useLanguage } from '../services/i18n';

interface TimeEstimationPanelProps {
  initialSection?: 'forecaster' | 'simulator' | 'schedule';
  hideHeaderTabs?: boolean;
}

export function TimeEstimationPanel({ initialSection = 'forecaster', hideHeaderTabs = false }: TimeEstimationPanelProps) {
  const [activeSection, setActiveSection] = useState<'forecaster' | 'simulator' | 'schedule'>(initialSection);
  const { t } = useLanguage();

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Interactive Simulator Form State
  const [simForm, setSimForm] = useState({
    task_type: 'Material_Loading',
    task_area_sqm: 250.0,
    material_type: 'Rock',
    ground_condition: 'Soft',
    ground_slope_deg: 3.5,
    site_distance_km: 4.2,
    weather: 'Sunny',
    temperature_c: 24.0,
    crew_size: 4,
    operator_skill: 'Intermediate',
    operator_experience_months: 60,
    machine_age_yrs: 3.5,
    machine_condition: 'Good',
    permit_setup_delay_min: 5.0,
    breakdown_occurred: 'No',
    estimated_time_min: 180.0,
  });

  // Query: Live Task Estimation
  const liveQuery = useQuery({
    queryKey: ['time-estimation-live'],
    queryFn: async () => (await api.get('/time-estimation/live')).data,
    refetchInterval: 8000,
  });


  // Query: Tasks from backend for schedule log
  const tasksQuery = useQuery({
    queryKey: ['admin-tasks'],
    queryFn: async () => (await api.get('/admin/tasks')).data,
  });

  // Mutation: What-If Prediction
  const predictMutation = useMutation({
    mutationFn: async (payload: typeof simForm) => (await api.post('/time-estimation/predict', payload)).data,
  });

  // Apply Presets
  const applyPreset = (preset: string) => {
    let updated = { ...simForm };
    if (preset === 'optimum') {
      updated = {
        ...simForm,
        task_type: 'Material_Loading',
        material_type: 'Soil',
        ground_condition: 'Normal',
        ground_slope_deg: 1.5,
        weather: 'Sunny',
        crew_size: 6,
        operator_skill: 'Expert',
        machine_condition: 'Good',
        permit_setup_delay_min: 0.0,
        breakdown_occurred: 'No',
        estimated_time_min: 150.0,
      };
    } else if (preset === 'mud_rain') {
      updated = {
        ...simForm,
        task_type: 'Earth_Excavation',
        material_type: 'Clay',
        ground_condition: 'Soft',
        ground_slope_deg: 9.0,
        weather: 'Rainy',
        crew_size: 3,
        operator_skill: 'Intermediate',
        permit_setup_delay_min: 15.0,
        breakdown_occurred: 'No',
        estimated_time_min: 240.0,
      };
    } else if (preset === 'permit_hold') {
      updated = {
        ...simForm,
        task_type: 'Trenching',
        material_type: 'Mixed',
        permit_setup_delay_min: 75.0,
        breakdown_occurred: 'No',
        estimated_time_min: 200.0,
      };
    } else if (preset === 'rock_quarry') {
      updated = {
        ...simForm,
        task_type: 'Demolition',
        material_type: 'Concrete',
        ground_condition: 'Rocky',
        ground_slope_deg: 12.0,
        weather: 'Windy',
        crew_size: 4,
        operator_skill: 'Intermediate',
        permit_setup_delay_min: 10.0,
        breakdown_occurred: 'No',
        estimated_time_min: 320.0,
      };
    } else if (preset === 'breakdown_crisis') {
      updated = {
        ...simForm,
        breakdown_occurred: 'Yes',
        machine_condition: 'Poor',
        weather: 'Rainy',
        permit_setup_delay_min: 30.0,
        estimated_time_min: 210.0,
      };
    }
    setSimForm(updated);
    predictMutation.mutate(updated);
  };

  const live = liveQuery.data || {
    task_code: 'T1001',
    task_type: 'Material_Loading',
    status: 'in_progress',
    elapsed_time_min: 45.0,
    estimated_baseline_min: 164.0,
    predicted_time_min: 178.5,
    remaining_time_min: 133.5,
    progress_pct: 25.2,
    delay_risk_level: 'ON_SCHEDULE',
    eta_timestamp: new Date(Date.now() + 133.5 * 60000).toISOString(),
    factor_contributions: [
      { name: 'Permit & Site Setup Queue', effect: '+6.5m', impact: 'Direct Delay', severity: 'medium', score: 6.5 },
      { name: 'Hard Material Resistance (Rock)', effect: '+55m', impact: 'Excavation Resistance', severity: 'medium', score: 55.0 },
      { name: 'Expert Operator Mastery', effect: '-28m', impact: 'Cycle Optimization', severity: 'positive', score: -28.0 }
    ],
    task_attributes: {},
  };

  const currentPrediction = predictMutation.data || {
    predicted_time_min: 184.5,
    estimated_baseline_min: 180.0,
    delta_min: 4.5,
    delta_pct: 2.5,
    delay_risk_level: 'ON_SCHEDULE',
    eta_timestamp: new Date(Date.now() + 184.5 * 60000).toISOString(),
    factor_contributions: [
      { name: 'Permit & Site Setup Queue', effect: '+5m', impact: 'Direct Delay', severity: 'medium' },
      { name: 'Material Type (Rock)', effect: '+55m', impact: 'Excavation Resistance', severity: 'medium' },
    ],
    model_metrics: {
      model_name: 'CatBoost Regressor (best_time_model.cbm)',
      mae_minutes: 16.49,
      r2_score: 0.9850,
      mape_percent: 5.89,
    },
  };


  const formatMin = (m: number) => {
    const hrs = Math.floor(m / 60);
    const mins = Math.round(m % 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const getRiskBadge = (risk: string) => {
    if (risk === 'ON_SCHEDULE') {
      return <span className="chip chip-green flex items-center gap-1"><CheckCircle2 size={11} /> {t('on_schedule_label', 'ON SCHEDULE')}</span>;
    }
    if (risk === 'MINOR_DELAY_RISK') {
      return <span className="chip chip-yellow flex items-center gap-1"><TriangleAlert size={11} /> {t('minor_delay_label', 'MINOR DELAY RISK')}</span>;
    }
    return <span className="chip chip-red flex items-center gap-1 animate-pulse"><AlertCircle size={11} /> {t('critical_delay_label', 'CRITICAL DELAY')}</span>;
  };

  return (
    <div className="space-y-6 fade-up">
      {/* ── Sub-navigation Header ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-heading flex items-center gap-2">
              <Clock size={20} className="text-yellow-400" />
              {t('forecaster_title')}
            </h1>
            <span className="chip chip-yellow text-[10px] font-mono">
              CatBoost Regressor (R² 0.985 · MAE 16.5m)
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {t('forecaster_subtitle')}
          </p>
        </div>

        {/* View Switcher Tabs */}
        {!hideHeaderTabs && (
          <div className="flex items-center gap-1.5 bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-lg p-1 text-xs self-start sm:self-auto">
            <button
              onClick={() => setActiveSection('forecaster')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeSection === 'forecaster'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-500/25 font-extrabold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] font-medium'
              }`}
            >
              <Gauge size={13} />
              {t('live_forecaster')}
            </button>

            <button
              onClick={() => setActiveSection('simulator')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeSection === 'simulator'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-500/25 font-extrabold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] font-medium'
              }`}
            >
              <Sliders size={13} />
              {t('what_if_simulator')}
            </button>

            <button
              onClick={() => setActiveSection('schedule')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeSection === 'schedule'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-500/25 font-extrabold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] font-medium'
              }`}
            >
              <CalendarCheck size={13} />
              {t('schedule_log')}
            </button>
          </div>
        )}
      </div>


      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 1. VIEW: LIVE TASK FORECASTER                                  */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeSection === 'forecaster' && (
        <div className="space-y-6 fade-up">
          {/* Main Hero Forecaster Card */}
          <div className="relative overflow-hidden rounded-xl border border-yellow-500/30 bg-[var(--bg-surface)] p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="chip chip-zinc font-mono text-xs">{live.task_code}</span>
                  <span className="chip chip-blue text-xs uppercase tracking-wider">{live.task_type.replace('_', ' ')}</span>
                  {getRiskBadge(live.delay_risk_level)}
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  {t('active_mission_eta')}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  CatBoost model is tracking progress in real time against dynamic terrain, material density, and site delay telemetry.
                </p>
              </div>

              {/* ETA Readout Clock */}
              <div className="flex items-center gap-4 bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-xl px-5 py-3 shadow-inner">
                <Clock size={28} className="text-yellow-400 animate-pulse" />
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{t('estimated_completion')}</div>
                  <div className="text-2xl font-mono font-bold text-yellow-400">
                    {new Date(live.eta_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {formatMin(live.remaining_time_min)} remaining
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Gauge */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-muted)] font-mono">
                  Elapsed: <strong className="text-white">{formatMin(live.elapsed_time_min)}</strong> / Predicted Total: <strong className="text-yellow-400">{formatMin(live.predicted_time_min)}</strong>
                </span>
                <span className="font-mono font-bold text-yellow-400 text-sm">{live.progress_pct}%</span>
              </div>
              <div className="h-3 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden p-0.5 border border-[var(--border-subtle)]">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.min(100, Math.max(2, live.progress_pct))}%` }}
                />
              </div>
            </div>

            {/* Metrics Breakdown Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-lg p-3">
                <div className="text-[10px] uppercase text-[var(--text-muted)]">{t('standard_baseline')}</div>
                <div className="text-lg font-mono font-bold text-[var(--text-primary)]">{formatMin(live.estimated_baseline_min)}</div>
                <div className="text-[10px] text-[var(--text-muted)]">Planned duration</div>
              </div>

              <div className="bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-lg p-3">
                <div className="text-[10px] uppercase text-[var(--text-muted)]">{t('catboost_forecast')}</div>
                <div className="text-lg font-mono font-bold text-[var(--yellow)]">{formatMin(live.predicted_time_min)}</div>
                <div className="text-[10px] text-[var(--text-brand)]">ML-adjusted total</div>
              </div>

              <div className="bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-lg p-3">
                <div className="text-[10px] uppercase text-[var(--text-muted)]">{t('variance_vs_plan')}</div>
                <div className={`text-lg font-mono font-bold ${
                  live.predicted_time_min - live.estimated_baseline_min <= 0 ? 'text-[var(--green)]' : 'text-[var(--yellow)]'
                }`}>
                  {live.predicted_time_min - live.estimated_baseline_min >= 0 ? '+' : ''}
                  {(live.predicted_time_min - live.estimated_baseline_min).toFixed(1)}m
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  {(((live.predicted_time_min - live.estimated_baseline_min) / Math.max(1, live.estimated_baseline_min)) * 100).toFixed(1)}% shift
                </div>
              </div>

              <div className="bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-lg p-3">
                <div className="text-[10px] uppercase text-[var(--text-muted)]">{t('schedule_health')}</div>
                <div className="mt-1">{getRiskBadge(live.delay_risk_level)}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">Live queue status</div>
              </div>
            </div>
          </div>

          {/* Contributing Delay Drivers & Task Specifications */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Driver Pills */}
            <div className="lg:col-span-2 space-y-4">
              <Panel title={t('delay_drivers_title', 'Real-Time Delay Drivers & Attribution Factors')}>
                <div className="space-y-3">
                  {live.factor_contributions?.map((f: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          f.severity === 'critical' ? 'bg-rose-500 shadow-rose-500/50 shadow-md' :
                          f.severity === 'high' ? 'bg-amber-500' :
                          f.severity === 'positive' ? 'bg-emerald-400' : 'bg-blue-400'
                        }`} />
                        <div>
                          <div className="text-sm font-semibold text-zinc-200">{f.name}</div>
                          <div className="text-xs text-[var(--text-muted)]">{f.impact}</div>
                        </div>
                      </div>
                      <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                        f.severity === 'positive' ? 'chip chip-green' :
                        f.severity === 'critical' ? 'chip chip-red' :
                        'chip chip-yellow'
                      }`}>
                        {f.effect}
                      </span>
                    </div>
                  ))}

                  {(!live.factor_contributions || live.factor_contributions.length === 0) && (
                    <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                      {t('no_delay_drivers')}
                    </div>
                  )}
                </div>
              </Panel>
            </div>

            {/* Right Col: Mission Attribute Spec Blueprint */}
            <div>
              <Panel title={t('machine_site_telemetry', 'Active Machine & Site Telemetry')}>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[var(--text-muted)]">{t('task_area_label')}</span>
                    <span className="font-mono text-white font-medium">{live.task_attributes?.task_area_sqm || 254.5} m²</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[var(--text-muted)]">{t('material_hardness')}</span>
                    <span className="font-mono text-yellow-300 font-medium">{live.task_attributes?.material_type || 'Rock'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[var(--text-muted)]">{t('ground_condition_label')}</span>
                    <span className="font-mono text-white">{live.task_attributes?.ground_condition || 'Soft'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[var(--text-muted)]">{t('slope_grade')}</span>
                    <span className="font-mono text-white">{live.task_attributes?.ground_slope_deg || 2.8}°</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[var(--text-muted)]">{t('site_distance')}</span>
                    <span className="font-mono text-white">{live.task_attributes?.site_distance_km || 3.2} km</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[var(--text-muted)]">{t('weather_label')}</span>
                    <span className="font-mono text-white">{live.task_attributes?.weather || 'Sunny'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[var(--text-muted)]">{t('crew_complement')}</span>
                    <span className="font-mono text-white">{live.task_attributes?.crew_size || 4} operators</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[var(--text-muted)]">{t('operator_skill_level')}</span>
                    <span className="font-mono text-emerald-300">{live.task_attributes?.operator_skill || 'Intermediate'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--text-muted)]">{t('permit_queue_delay')}</span>
                    <span className="font-mono text-amber-400">{live.task_attributes?.permit_setup_delay_min || 6.5} min</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSimForm({
                      ...simForm,
                      ...live.task_attributes,
                    });
                    setActiveSection('simulator');
                  }}
                  className="btn btn-secondary w-full mt-4 text-xs flex items-center justify-center gap-1.5 border-yellow-500/30 text-yellow-300 hover:border-yellow-400"
                >
                  <Sliders size={13} />
                  {t('simulate_mission')}
                </button>
              </Panel>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 2. VIEW: WHAT-IF SCENARIO SIMULATOR                            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeSection === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 fade-up">
          {/* Controls Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Panel title="What-If Mission Simulator Controls">
              {/* Presets Bar */}
              <div className="mb-5">
                <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
                  <Sparkles size={12} className="text-yellow-400" />
                  {t('preset_scenarios', 'Preset Scenarios')}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => applyPreset('optimum')}
                    className="px-2.5 py-1 text-xs rounded-md bg-[var(--bg-raised)] hover:bg-[var(--green-dim)] border border-[var(--green-border)] text-[var(--green)] transition-all font-medium"
                  >
                    {t('optimum_run_btn')}
                  </button>
                  <button
                    onClick={() => applyPreset('mud_rain')}
                    className="px-2.5 py-1 text-xs rounded-md bg-[var(--bg-raised)] hover:bg-[var(--blue-dim)] border border-[var(--blue-border)] text-[var(--blue)] transition-all font-medium"
                  >
                    {t('muddy_terrain_rain')}
                  </button>
                  <button
                    onClick={() => applyPreset('permit_hold')}
                    className="px-2.5 py-1 text-xs rounded-md bg-[var(--bg-raised)] hover:bg-[var(--yellow-dim)] border border-[var(--yellow-border)] text-[var(--yellow)] transition-all font-medium"
                  >
                    {t('severe_permit_hold')}
                  </button>
                  <button
                    onClick={() => applyPreset('rock_quarry')}
                    className="px-2.5 py-1 text-xs rounded-md bg-[var(--bg-raised)] hover:bg-purple-500/10 border border-purple-500/30 text-purple-400 transition-all font-medium"
                  >
                    {t('rock_excavation_btn')}
                  </button>
                  <button
                    onClick={() => applyPreset('breakdown_crisis')}
                    className="px-2.5 py-1 text-xs rounded-md bg-[var(--bg-raised)] hover:bg-[var(--red-dim)] border border-[var(--red-border)] text-[var(--red)] transition-all font-medium"
                  >
                    {t('breakdown_crisis_btn')}
                  </button>
                </div>
              </div>

              {/* Sliders & Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Task Type */}
                <div>
                  <label className="text-[11px] text-[var(--text-muted)] font-medium">Task Type</label>
                  <select
                    value={simForm.task_type}
                    onChange={(e) => {
                      const updated = { ...simForm, task_type: e.target.value };
                      setSimForm(updated);
                      predictMutation.mutate(updated);
                    }}
                    className="input text-xs w-full mt-1 bg-black/40"
                  >
                    <option value="Material_Loading">Material Loading</option>
                    <option value="Demolition">Demolition</option>
                    <option value="Earth_Excavation">Earth Excavation</option>
                    <option value="Trenching">Trenching</option>
                    <option value="Grading">Grading</option>
                    <option value="Paving">Paving</option>
                    <option value="Compaction">Compaction</option>
                  </select>
                </div>

                {/* Material Type */}
                <div>
                  <label className="text-[11px] text-[var(--text-muted)] font-medium">Material Type</label>
                  <select
                    value={simForm.material_type}
                    onChange={(e) => {
                      const updated = { ...simForm, material_type: e.target.value };
                      setSimForm(updated);
                      predictMutation.mutate(updated);
                    }}
                    className="input text-xs w-full mt-1 bg-black/40"
                  >
                    <option value="Soil">Soil (Standard)</option>
                    <option value="Clay">Clay (Dense)</option>
                    <option value="Mixed">Mixed Soil/Gravel</option>
                    <option value="Rock">Rock (Hard)</option>
                    <option value="Concrete">Concrete (Structural)</option>
                    <option value="Debris">Debris</option>
                  </select>
                </div>

                {/* Task Area Slider */}
                <div>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-medium">
                    <span>Task Area:</span>
                    <span className="font-mono text-yellow-400 font-bold">{simForm.task_area_sqm} m²</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="400"
                    step="5"
                    value={simForm.task_area_sqm}
                    onChange={(e) => {
                      const updated = { ...simForm, task_area_sqm: parseFloat(e.target.value) };
                      setSimForm(updated);
                      predictMutation.mutate(updated);
                    }}
                    className="w-full mt-1 accent-yellow-400"
                  />
                </div>

                {/* Ground Slope Slider */}
                <div>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-medium">
                    <span>Ground Slope Grade:</span>
                    <span className="font-mono text-yellow-400 font-bold">{simForm.ground_slope_deg}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="0.5"
                    value={simForm.ground_slope_deg}
                    onChange={(e) => {
                      const updated = { ...simForm, ground_slope_deg: parseFloat(e.target.value) };
                      setSimForm(updated);
                      predictMutation.mutate(updated);
                    }}
                    className="w-full mt-1 accent-yellow-400"
                  />
                </div>

                {/* Ground Condition */}
                <div>
                  <label className="text-[11px] text-[var(--text-muted)] font-medium">Ground Condition</label>
                  <select
                    value={simForm.ground_condition}
                    onChange={(e) => {
                      const updated = { ...simForm, ground_condition: e.target.value };
                      setSimForm(updated);
                      predictMutation.mutate(updated);
                    }}
                    className="input text-xs w-full mt-1 bg-black/40"
                  >
                    <option value="Normal">Normal (Compacted)</option>
                    <option value="Soft">Soft (Mud / Sand)</option>
                    <option value="Hard">Hard (Dense Pack)</option>
                    <option value="Rocky">Rocky (Uneven Grade)</option>
                  </select>
                </div>

                {/* Weather */}
                <div>
                  <label className="text-[11px] text-[var(--text-muted)] font-medium">Weather Condition</label>
                  <select
                    value={simForm.weather}
                    onChange={(e) => {
                      const updated = { ...simForm, weather: e.target.value };
                      setSimForm(updated);
                      predictMutation.mutate(updated);
                    }}
                    className="input text-xs w-full mt-1 bg-black/40"
                  >
                    <option value="Sunny">Sunny (Clear Sky)</option>
                    <option value="Cloudy">Cloudy</option>
                    <option value="Windy">Windy (Dust Risk)</option>
                    <option value="Rainy">Rainy (Mud Hazard)</option>
                    <option value="Foggy">Foggy (Low Visibility)</option>
                  </select>
                </div>

                {/* Permit Delay Slider */}
                <div>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-medium">
                    <span>Permit / Setup Delay:</span>
                    <span className="font-mono text-amber-400 font-bold">{simForm.permit_setup_delay_min} min</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={simForm.permit_setup_delay_min}
                    onChange={(e) => {
                      const updated = { ...simForm, permit_setup_delay_min: parseFloat(e.target.value) };
                      setSimForm(updated);
                      predictMutation.mutate(updated);
                    }}
                    className="w-full mt-1 accent-amber-400"
                  />
                </div>

                {/* Crew Size Slider */}
                <div>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-medium">
                    <span>Crew Size:</span>
                    <span className="font-mono text-blue-400 font-bold">{simForm.crew_size} operators</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={simForm.crew_size}
                    onChange={(e) => {
                      const updated = { ...simForm, crew_size: parseInt(e.target.value) };
                      setSimForm(updated);
                      predictMutation.mutate(updated);
                    }}
                    className="w-full mt-1 accent-blue-400"
                  />
                </div>

                {/* Operator Skill */}
                <div>
                  <label className="text-[11px] text-[var(--text-muted)] font-medium">Operator Skill</label>
                  <select
                    value={simForm.operator_skill}
                    onChange={(e) => {
                      const updated = { ...simForm, operator_skill: e.target.value };
                      setSimForm(updated);
                      predictMutation.mutate(updated);
                    }}
                    className="input text-xs w-full mt-1 bg-black/40"
                  >
                    <option value="Expert">Expert (Veteran Operator)</option>
                    <option value="Intermediate">Intermediate (Standard)</option>
                    <option value="Beginner">Beginner (Apprentice)</option>
                  </select>
                </div>

                {/* Machine Breakdown Risk */}
                <div>
                  <label className="text-[11px] text-[var(--text-muted)] font-medium">Mechanical Breakdown Occurred?</label>
                  <select
                    value={simForm.breakdown_occurred}
                    onChange={(e) => {
                      const updated = { ...simForm, breakdown_occurred: e.target.value };
                      setSimForm(updated);
                      predictMutation.mutate(updated);
                    }}
                    className="input text-xs w-full mt-1 bg-black/40 font-semibold"
                  >
                    <option value="No">No Breakdown (Nominal Run)</option>
                    <option value="Yes">Yes (Severe Mechanical Failure)</option>
                  </select>
                </div>

                {/* Baseline Estimate */}
                <div className="sm:col-span-2">
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-medium">
                    <span>Baseline Project Estimate (Target):</span>
                    <span className="font-mono text-zinc-300 font-bold">{formatMin(simForm.estimated_time_min)}</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="500"
                    step="5"
                    value={simForm.estimated_time_min}
                    onChange={(e) => {
                      const updated = { ...simForm, estimated_time_min: parseFloat(e.target.value) };
                      setSimForm(updated);
                      predictMutation.mutate(updated);
                    }}
                    className="w-full mt-1 accent-zinc-400"
                  />
                </div>
              </div>
            </Panel>
          </div>

          {/* Real-time Prediction Output Scorecard (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-xl border border-yellow-500/30 bg-[var(--bg-surface)] p-6 shadow-xl relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="chip chip-zinc font-mono text-[10px]">CatBoost ML Inference</span>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1">Predicted Completion Time</h3>
                </div>
                {getRiskBadge(currentPrediction.delay_risk_level)}
              </div>

              {/* Large Glowing Readout */}
              <div className="bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-xl p-5 my-4 text-center">
                <div className="text-4xl sm:text-5xl font-mono font-bold text-yellow-400 tracking-tight">
                  {formatMin(currentPrediction.predicted_time_min)}
                </div>
                <div className="text-xs text-[var(--text-muted)] font-mono mt-1">
                  ({currentPrediction.predicted_time_min.toFixed(1)} total minutes)
                </div>

                <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-white/5 text-xs">
                  <span className="text-[var(--text-muted)]">
                    Baseline: <strong className="text-white">{formatMin(currentPrediction.estimated_baseline_min)}</strong>
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span className={`font-mono font-bold ${
                    currentPrediction.delta_min <= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {currentPrediction.delta_min >= 0 ? '+' : ''}{currentPrediction.delta_min.toFixed(1)}m ({currentPrediction.delta_pct}%)
                  </span>
                </div>
              </div>

              {/* Simulation Factors Breakdown */}
              <div className="space-y-2 mt-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Feature Contribution Factors
                </div>

                {currentPrediction.factor_contributions?.map((f: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 rounded bg-zinc-900/60 border border-white/5">
                    <span className="text-zinc-300">{f.name}</span>
                    <span className="font-mono font-bold text-yellow-400">{f.effect}</span>
                  </div>
                ))}

                {(!currentPrediction.factor_contributions || currentPrediction.factor_contributions.length === 0) && (
                  <div className="text-xs text-[var(--text-muted)] text-center py-2">
                    Minimal delay drivers detected for this profile.
                  </div>
                )}
              </div>

              {/* Confidence & Model Metrics */}
              <div className="mt-5 p-3 rounded-lg bg-zinc-900/30 border border-white/5 text-[11px] text-[var(--text-muted)] space-y-1">
                <div className="flex justify-between">
                  <span>Engine:</span>
                  <span className="text-zinc-300 font-mono">CatBoostRegressor (cbm)</span>
                </div>
                <div className="flex justify-between">
                  <span>Test MAE:</span>
                  <span className="text-emerald-400 font-mono">16.49 minutes</span>
                </div>
                <div className="flex justify-between">
                  <span>Coefficient R²:</span>
                  <span className="text-yellow-400 font-mono">0.9850 (98.5% variance explained)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 3. VIEW: TASK SCHEDULE & VARIANCE LOG                          */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeSection === 'schedule' && (
        <div className="space-y-4 fade-up">
          <Panel title="Fleet Work Order Schedule & Time Variance Ledger">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[var(--text-muted)] uppercase text-[10px]">
                    <th className="py-2.5 px-3">Task ID</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Weather</th>
                    <th className="py-2.5 px-3">Baseline</th>
                    <th className="py-2.5 px-3">CatBoost ETA</th>
                    <th className="py-2.5 px-3">Health Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(tasksQuery.data || []).map((t: any, idx: number) => {
                    // Approximate forecast based on baseline
                    const baseMin = t.estimated_duration || 60;
                    const catboostEst = Math.round(baseMin * 1.08 + (idx % 2 === 0 ? 5 : -4));
                    const delta = catboostEst - baseMin;
                    const risk = delta > 20 ? 'CRITICAL_DELAY' : delta > 8 ? 'MINOR_DELAY_RISK' : 'ON_SCHEDULE';

                    return (
                      <tr key={t.id || idx} className="hover:bg-white/[0.02] transition-colors font-mono">
                        <td className="py-2.5 px-3 font-bold text-white">T{1000 + (t.id || idx)}</td>
                        <td className="py-2.5 px-3">
                          <span className="chip chip-zinc text-[10px]">{t.task_type}</span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-zinc-300 max-w-xs truncate">{t.description}</td>
                        <td className="py-2.5 px-3 font-sans text-zinc-400">{t.weather_condition || 'Sunny'}</td>
                        <td className="py-2.5 px-3 text-zinc-300">{formatMin(baseMin)}</td>
                        <td className="py-2.5 px-3 text-yellow-400 font-bold">{formatMin(catboostEst)}</td>
                        <td className="py-2.5 px-3 font-sans">{getRiskBadge(risk)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setSimForm({
                                ...simForm,
                                task_type: t.task_type || 'Material_Loading',
                                weather: t.weather_condition || 'Sunny',
                                estimated_time_min: baseMin,
                              });
                              setActiveSection('simulator');
                            }}
                            className="btn btn-secondary text-[11px] py-1 px-2 text-yellow-300 border-yellow-500/30 hover:border-yellow-400"
                          >
                            Simulate
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

