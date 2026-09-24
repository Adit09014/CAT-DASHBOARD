import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Gauge,
  Fuel,
  Clock,
  Activity,
  Zap,
  Thermometer,
  Compass,
  BatteryCharging,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Scale,
  RotateCw,
  RefreshCw,
  Download,
  Flame,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { Panel } from './Panel';
import { useLanguage } from '../services/i18n';

export interface TelemetryChartProps {
  currentIdle?: number;
  baselineIdle?: number;
  fuelUsed?: number;
  engineLoad?: number;
  loadCycles?: number;
  engineHours?: number;
  telemetry?: any;
  machineCode?: string;
  operatorName?: string;
  onAdvanceTick?: () => void;
}

export function TelemetryChart({
  currentIdle = 18.0,
  baselineIdle = 18.0,
  fuelUsed = 18.2,
  engineLoad = 58.0,
  loadCycles = 26,
  engineHours = 131.5,
  telemetry = {},
  machineCode = 'CAT-336D',
  operatorName = 'Avery Stone',
  onAdvanceTick,
}: TelemetryChartProps) {
  const { t } = useLanguage();
  // Active Time Series Stream Metric
  const [metricTab, setMetricTab] = useState<'load-fuel' | 'speed-payload' | 'hydraulic-thermal'>('load-fuel');
  const [timeRange, setTimeRange] = useState<'15m' | '30m' | '60m'>('30m');

  // Extract / fallback values from telemetry
  const curLoad = telemetry.engine_load ?? engineLoad ?? 58.0;
  const curFuel = telemetry.fuel_used ?? fuelUsed ?? 18.2;
  const curIdle = telemetry.idle_time ?? currentIdle ?? 18.0;
  const curBase = baselineIdle > 0 ? baselineIdle : 18.0;
  const curCycles = telemetry.load_cycles ?? loadCycles ?? 26;
  const curHours = telemetry.engine_hours ?? engineHours ?? 131.5;
  const speedKmph = telemetry.machine_speed_kmph ?? 12.4;
  const tiltDeg = telemetry.machine_tilt_deg ?? 1.8;
  const slopeDeg = telemetry.ground_slope_deg ?? 2.5;
  const payloadTons = telemetry.load_weight_tons ?? 12.5;
  const maxCapacityTons = telemetry.max_load_capacity_tons ?? 25.0;
  const payloadUtilPct = telemetry.load_utilization_pct ?? Math.round((payloadTons / maxCapacityTons) * 100);
  const harshBraking = telemetry.harsh_braking_events ?? 0;
  const harshAccel = telemetry.harsh_acceleration_events ?? 0;
  const continuousDriving = telemetry.continuous_driving_min ?? 42.0;

  // Anomaly status
  const isAnomaly = curIdle >= curBase * 1.5;
  const idleRatio = curBase > 0 ? (curIdle / curBase).toFixed(1) : '1.0';

  // Subsystem thermal & pressure metrics
  const coolantTemp = 88.0 + (curLoad > 70 ? (curLoad - 70) * 0.2 : 0);
  const hydraulicTemp = 74.0 + (curLoad > 65 ? (curLoad - 65) * 0.18 : 0);
  const oilPressure = Math.max(42, Math.min(65, 58 - (curHours > 200 ? 5 : 0)));
  const defLevel = 84.0;
  const batteryVoltage = 24.6;

  // Stability / rollover assessment
  const isTiltDanger = tiltDeg >= 5.0;
  const isTiltCaution = tiltDeg >= 3.5 && tiltDeg < 5.0;
  const stabilityStatus = isTiltDanger ? t('critical_tilt') : isTiltCaution ? t('elevated_incline') : t('stable_horizon');

  // Eco-drive score calculation (100 base, penalize for idle ratio, harsh braking/accel, overload)
  const ecoScore = Math.max(
    45,
    Math.round(
      100 -
        (isAnomaly ? 15 : 0) -
        harshBraking * 8 -
        harshAccel * 5 -
        (payloadUtilPct > 100 ? 12 : 0) -
        (continuousDriving > 120 ? 8 : 0)
    )
  );

  // Generate 15 time-series points leading to current live tick
  const timelineData = useMemo(() => {
    const pointsCount = timeRange === '15m' ? 10 : timeRange === '30m' ? 16 : 24;
    const now = new Date();
    const data = [];

    for (let i = pointsCount - 1; i >= 0; i--) {
      const pointTime = new Date(now.getTime() - i * 2 * 60 * 1000);
      const timeLabel = pointTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const variance = Math.sin(i * 0.8) * 6;
      const progressRatio = (pointsCount - i) / pointsCount;

      data.push({
        time: timeLabel,
        engineLoad: Math.max(20, Math.min(95, Math.round(curLoad + variance))),
        fuelRate: Math.max(8.5, Math.min(28.0, Number((14.5 + (curLoad + variance) * 0.12).toFixed(1)))),
        speed: Math.max(0, Math.min(22, Number((speedKmph + Math.cos(i) * 3).toFixed(1)))),
        payload: Math.max(0, Math.min(maxCapacityTons * 1.05, Number((payloadTons + Math.sin(i * 1.2) * 2.2).toFixed(1)))),
        hydraulicPressure: Math.max(140, Math.min(280, Math.round(185 + (curLoad + variance) * 0.85))),
        coolantTemp: Math.round(coolantTemp - (pointsCount - i) * 0.2 + variance * 0.3),
      });
    }
    return data;
  }, [timeRange, curLoad, speedKmph, payloadTons, maxCapacityTons, coolantTemp]);

  // Operational State & Fuel Burn Breakdown
  const operationalBreakdown = [
    { name: t('op_active_excavation', 'Active Excavation / Digging'), value: 58, color: '#f59e0b', fuelL: (curFuel * 0.65).toFixed(1) },
    { name: t('op_hauling', 'Hauling & Travelling'), value: 24, color: '#38bdf8', fuelL: (curFuel * 0.24).toFixed(1) },
    { name: t('op_productive_idle', 'Productive Idle (Truck Queue)'), value: 11, color: '#10b981', fuelL: (curFuel * 0.07).toFixed(1) },
    { name: t('op_waste_idle', 'Non-Productive Idle (Waste)'), value: 7, color: '#ef4444', fuelL: (curFuel * 0.04).toFixed(1) },
  ];

  // Dual Bar Chart: Idle vs Baseline
  const idleChartData = [
    { name: t('idle_your_baseline', 'Your Baseline'), minutes: Math.round(curBase), fill: '#3b82f6' },
    { name: t('idle_current_shift', 'Current Shift'), minutes: Math.round(curIdle), fill: isAnomaly ? '#ef4444' : '#f59e0b' },
  ];

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = 'Timestamp,Engine_Load_Pct,Fuel_Rate_Lph,Speed_Kmph,Payload_Tons,Hydraulic_Pressure_Bar,Coolant_Temp_C\n';
    const rows = timelineData
      .map(
        (d) =>
          `${d.time},${d.engineLoad},${d.fuelRate},${d.speed},${d.payload},${d.hydraulicPressure},${d.coolantTemp}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_${machineCode}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 fade-up">
      {/* ── Cockpit Sub-Header & Live Toolbar ────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-heading flex items-center gap-2">
              <Activity size={22} className="text-amber-400" />
              {t('telemetry_title')}
            </h1>
            <span className="chip chip-zinc font-mono text-[10px]">{machineCode}</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {t('telemetry_subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Radio size={13} />
            <span>{t('live_iot')}</span>
          </div>

          {/* Advance Tick Trigger */}
          {onAdvanceTick && (
            <button
              onClick={onAdvanceTick}
              className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 hover:border-amber-400"
              title="Advance telemetry stream simulation"
            >
              <RefreshCw size={13} className="text-amber-400" />
              <span>{t('next_tick')}</span>
            </button>
          )}

          {/* Export Telemetry */}
          <button
            onClick={handleExportCSV}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
            title="Export telemetry timeline to CSV"
          >
            <Download size={13} />
            <span>{t('export_csv')}</span>
          </button>
        </div>
      </div>

      {/* ── Section 1: KPI Quick Status Ribbon ───────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Engine Load */}
        <div className="card-raised p-3 border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase text-[10px] tracking-wider">{t('engine_load')}</span>
            <Gauge size={13} className="text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">{curLoad.toFixed(1)}%</div>
          <div className="progress-track mt-2 h-1.5">
            <div
              className={`progress-fill ${curLoad > 85 ? 'bg-rose-500' : curLoad > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(100, curLoad)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Duty envelope: 85% max</span>
        </div>

        {/* Fuel Used */}
        <div className="card-raised p-3 border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase text-[10px] tracking-wider">{t('fuel_burned')}</span>
            <Fuel size={13} className="text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">{curFuel.toFixed(1)} L</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Rate:</span>
            <span className="font-mono text-sky-300 font-semibold">
              {(14.2 + curLoad * 0.11).toFixed(1)} L/h
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block">Tank: 74% remaining</span>
        </div>

        {/* Machine Speed */}
        <div className="card-raised p-3 border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase text-[10px] tracking-wider">{t('ground_speed')}</span>
            <Activity size={13} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">{speedKmph.toFixed(1)} km/h</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Gear:</span>
            <span className="font-mono text-emerald-300 font-semibold">F2 (Power Mode)</span>
          </div>
          <span className="text-[10px] text-slate-500 block">Speed limit: 20 km/h</span>
        </div>

        {/* Payload Utilization */}
        <div className="card-raised p-3 border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase text-[10px] tracking-wider">{t('bucket_payload')}</span>
            <Scale size={13} className="text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">{payloadTons.toFixed(1)} t</div>
          <div className="progress-track mt-2 h-1.5">
            <div
              className={`progress-fill ${payloadUtilPct > 100 ? 'bg-rose-500' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, payloadUtilPct)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 flex justify-between">
            <span>{payloadUtilPct}% capacity</span>
            <span>Max {maxCapacityTons.toFixed(0)}t</span>
          </span>
        </div>

        {/* Bucket Cycles */}
        <div className="card-raised p-3 border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase text-[10px] tracking-wider">{t('load_cycles')}</span>
            <RotateCw size={13} className="text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">{curCycles}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Shift Volume:</span>
            <span className="font-mono text-indigo-300 font-semibold">
              {(curCycles * payloadTons * 0.9).toFixed(0)} tons
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block">Avg cycle: 48 sec</span>
        </div>

        {/* Eco-Score */}
        <div className="card-raised p-3 border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase text-[10px] tracking-wider">{t('eco_score')}</span>
            <Sparkles size={13} className="text-yellow-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{ecoScore}/100</div>
          <span className="chip chip-green text-[9px] py-0 px-1 mt-2 inline-block font-semibold">
            {ecoScore >= 90 ? 'OPTIMIZED' : ecoScore >= 75 ? 'GOOD' : 'HIGH WEAR'}
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block">Braking: {harshBraking} | Accel: {harshAccel}</span>
        </div>
      </div>

      {/* ── Section 2: Real-Time Multi-Parameter Rolling Timeline ─── */}
      <div className="card p-5 border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <div className="label-caps">{t('telemetry_continuous_series', 'Continuous Time Series')}</div>
            <h2 className="section-title text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-400" />
              {t('telemetry_waveform_title', 'High-Frequency Telemetry Waveform')}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Switcher Tabs */}
            <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-1 text-xs">
              <button
                onClick={() => setMetricTab('load-fuel')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  metricTab === 'load-fuel'
                    ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t('metric_engine_fuel', 'Engine & Fuel Flow')}
              </button>
              <button
                onClick={() => setMetricTab('speed-payload')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  metricTab === 'speed-payload'
                    ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t('metric_speed_payload', 'Speed & Payload')}
              </button>
              <button
                onClick={() => setMetricTab('hydraulic-thermal')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  metricTab === 'hydraulic-thermal'
                    ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t('metric_hydraulics_thermals', 'Hydraulics & Thermals')}
              </button>
            </div>

            {/* Time Window Switcher */}
            <div className="flex items-center bg-black/40 border border-white/5 rounded-lg p-0.5 text-xs text-slate-400">
              {(['15m', '30m', '60m'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                    timeRange === r ? 'bg-white/15 text-white font-bold' : 'hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* The Recharts Waveform Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {metricTab === 'load-fuel' ? (
              <AreaChart data={timelineData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#f59e0b" fontSize={11} tickLine={false} domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" fontSize={11} tickLine={false} domain={[0, 35]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d14', borderColor: '#334155', borderRadius: '10px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <ReferenceLine yAxisId="left" y={85} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Heavy Duty 85%', fill: '#ef4444', fontSize: 10 }} />
                <Area yAxisId="left" type="monotone" dataKey="engineLoad" name="Engine Load (%)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#loadGrad)" />
                <Area yAxisId="right" type="monotone" dataKey="fuelRate" name="Fuel Burn Rate (L/h)" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#fuelGrad)" />
              </AreaChart>
            ) : metricTab === 'speed-payload' ? (
              <LineChart data={timelineData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#10b981" fontSize={11} tickLine={false} domain={[0, 25]} />
                <YAxis yAxisId="right" orientation="right" stroke="#eab308" fontSize={11} tickLine={false} domain={[0, 30]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d14', borderColor: '#334155', borderRadius: '10px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <ReferenceLine yAxisId="right" y={25.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Rated 25.0t', fill: '#ef4444', fontSize: 10 }} />
                <Line yAxisId="left" type="monotone" dataKey="speed" name="Machine Speed (km/h)" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                <Line yAxisId="right" type="monotone" dataKey="payload" name="Bucket Payload (tons)" stroke="#eab308" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            ) : (
              <AreaChart data={timelineData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="hydGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#a855f7" fontSize={11} tickLine={false} domain={[100, 300]} />
                <YAxis yAxisId="right" orientation="right" stroke="#f97316" fontSize={11} tickLine={false} domain={[60, 110]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d14', borderColor: '#334155', borderRadius: '10px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area yAxisId="left" type="monotone" dataKey="hydraulicPressure" name="Hydraulic Main Pressure (bar)" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#hydGrad)" />
                <Line yAxisId="right" type="monotone" dataKey="coolantTemp" name="Coolant Temperature (°C)" stroke="#f97316" strokeWidth={2} dot={false} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Section 3: Dual Column Diagnostic Intelligence ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Machine Stability Gyro Horizon HUD */}
        <div className="card p-4 border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-amber-400" />
              <span className="font-semibold text-white text-sm">{t('incline_horizon')}</span>
            </div>
            <span
              className={`chip text-[10px] font-bold ${
                isTiltDanger ? 'chip-red animate-pulse' : isTiltCaution ? 'chip-yellow' : 'chip-green'
              }`}
            >
              {stabilityStatus}
            </span>
          </div>

          {/* Artificial Horizon Inclinometer SVG Widget */}
          <div className="py-4 flex flex-col items-center justify-center">
            <div className="relative w-44 h-44 rounded-full border-2 border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden shadow-inner">
              {/* Sky / Ground Angle Horizon representation */}
              <div
                className="absolute inset-0 transition-transform duration-500 ease-out"
                style={{
                  transform: `rotate(${tiltDeg * 2}deg) translateY(${slopeDeg * 1.5}px)`,
                  background: 'linear-gradient(to bottom, #0284c7 0%, #0369a1 49%, #f59e0b 50%, #78350f 100%)',
                  opacity: 0.85,
                }}
              />

              {/* Angle Graticule Circles & Crosshairs */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-28 h-28 rounded-full border border-white/20 border-dashed" />
                <div className="w-16 h-16 rounded-full border border-white/30" />
                <div className="w-full h-px bg-white/40 absolute" />
                <div className="h-full w-px bg-white/40 absolute" />
              </div>

              {/* Pitch Target Indicator Center */}
              <div className="relative z-10 bg-black/80 px-2 py-1 rounded border border-amber-400 text-center font-mono shadow-lg">
                <div className="text-xs font-bold text-amber-400">{tiltDeg.toFixed(1)}° ROLL</div>
                <div className="text-[10px] text-slate-300">{slopeDeg.toFixed(1)}° PITCH</div>
              </div>
            </div>

            {/* Threshold limits bar */}
            <div className="w-full mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Rollover Safety Boundary:</span>
                <span className="font-mono text-white font-bold">{tiltDeg.toFixed(1)}° / 5.0° limit</span>
              </div>
              <div className="progress-track h-2">
                <div
                  className={`progress-fill ${isTiltDanger ? 'bg-rose-500' : isTiltCaution ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(100, (tiltDeg / 7.0) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 text-center mt-1">
                OSHA Heavy Equipment Limit: Never traverse slopes &gt; 15° or tilt &gt; 5.0° when loaded.
              </p>
            </div>
          </div>
        </div>

        {/* Center Column: Shift Fuel & Operational State Donut */}
        <div className="card p-4 border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Fuel size={16} className="text-sky-400" />
              <span className="font-semibold text-white text-sm">{t('fuel_attribution')}</span>
            </div>
            <span className="chip chip-zinc font-mono text-[10px]">{curFuel.toFixed(1)} L Total</span>
          </div>

          <div className="h-44 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={operationalBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {operationalBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [`${val}% (${item.payload.fuelL} L)`, name]}
                  contentStyle={{ backgroundColor: '#090d14', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-base font-bold font-mono text-white">{curHours.toFixed(1)}h</span>
              <span className="text-[9px] text-slate-400 uppercase">Engine Run</span>
            </div>
          </div>

          {/* Legend Table */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[var(--border-subtle)]">
            {operationalBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate text-slate-400">{item.name.split(' ')[0]}:</span>
                <span className="font-mono text-white font-bold ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Idle Anomaly vs Baseline Bar Chart */}
        <div className="card p-4 border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <span className="font-semibold text-white text-sm">{t('idle_vs_baseline')}</span>
            </div>
            <span className={`text-xs font-bold font-mono ${isAnomaly ? 'text-rose-400' : 'text-slate-400'}`}>
              {idleRatio}× Ratio
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={idleChartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: '#090d14', borderColor: '#334155', borderRadius: '10px', fontSize: '12px' }}
                />
                <Bar dataKey="minutes" radius={[6, 6, 0, 0]} barSize={44}>
                  {idleChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
            <span className="text-slate-400">Baseline: <strong className="text-sky-400">{curBase.toFixed(0)}m</strong></span>
            <span className="text-slate-400">Current: <strong className={isAnomaly ? 'text-rose-400' : 'text-amber-400'}>{curIdle.toFixed(0)}m</strong></span>
            {isAnomaly && <span className="chip chip-red text-[9px] py-0 px-1 font-bold">ANOMALY</span>}
          </div>
        </div>
      </div>

      {/* ── Section 4: Subsystem Health & Thermal Telemetry Grid ───── */}
      <Panel title={t('subsystem_health')} icon={<Wrench size={16} className="text-amber-400" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          {/* Coolant Temp */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">{t('coolant_temp')}</span>
              <Thermometer size={14} className={coolantTemp > 95 ? 'text-rose-400' : 'text-emerald-400'} />
            </div>
            <div className="text-lg font-mono font-bold text-white">{coolantTemp.toFixed(1)} °C</div>
            <div className="progress-track h-1.5">
              <div
                className={`progress-fill ${coolantTemp > 100 ? 'bg-rose-500' : coolantTemp > 92 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(100, (coolantTemp / 110) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500">Nominal: 82–93°C</span>
          </div>

          {/* Hydraulic Fluid Temp */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">{t('hydraulic_oil')}</span>
              <Droplets size={14} className={hydraulicTemp > 85 ? 'text-rose-400' : 'text-emerald-400'} />
            </div>
            <div className="text-lg font-mono font-bold text-white">{hydraulicTemp.toFixed(1)} °C</div>
            <div className="progress-track h-1.5">
              <div
                className={`progress-fill ${hydraulicTemp > 90 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(100, (hydraulicTemp / 100) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500">Nominal: 65–80°C</span>
          </div>

          {/* Engine Oil Pressure */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">{t('oil_pressure')}</span>
              <Gauge size={14} className="text-sky-400" />
            </div>
            <div className="text-lg font-mono font-bold text-white">{oilPressure.toFixed(0)} psi</div>
            <div className="progress-track h-1.5">
              <div
                className="progress-fill bg-sky-400"
                style={{ width: `${Math.min(100, (oilPressure / 70) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500">Operating: 45–65 psi</span>
          </div>

          {/* DEF / AdBlue Tank */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">{t('def_fluid')}</span>
              <Flame size={14} className="text-indigo-400" />
            </div>
            <div className="text-lg font-mono font-bold text-white">{defLevel.toFixed(0)}%</div>
            <div className="progress-track h-1.5">
              <div
                className="progress-fill bg-indigo-400"
                style={{ width: `${defLevel}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500">Range: 42 hrs run</span>
          </div>

          {/* Battery Alternator */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">{t('battery_voltage')}</span>
              <BatteryCharging size={14} className="text-emerald-400" />
            </div>
            <div className="text-lg font-mono font-bold text-white">{batteryVoltage.toFixed(1)} V</div>
            <div className="progress-track h-1.5">
              <div
                className="progress-fill bg-emerald-400"
                style={{ width: `${Math.min(100, (batteryVoltage / 28) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500">Charging healthy (24V DC)</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
