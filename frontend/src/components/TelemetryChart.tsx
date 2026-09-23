import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Gauge, Fuel, Clock, AlertCircle } from 'lucide-react';

interface TelemetryChartProps {
  currentIdle: number;
  baselineIdle: number;
  fuelUsed?: number;
  engineLoad?: number;
  loadCycles?: number;
  engineHours?: number;
}

export function TelemetryChart({
  currentIdle = 18,
  baselineIdle = 18,
  fuelUsed = 18.2,
  engineLoad = 58.0,
  loadCycles = 26,
  engineHours = 131.5,
}: TelemetryChartProps) {
  const idleRatio = baselineIdle > 0 ? (currentIdle / baselineIdle).toFixed(1) : '1.0';
  const isAnomaly = currentIdle >= baselineIdle * 1.5;

  const chartData = [
    { name: 'Your Baseline', minutes: Math.round(baselineIdle), fill: '#3b82f6' },
    { name: 'Current Shift', minutes: Math.round(currentIdle), fill: isAnomaly ? '#ef4444' : '#f59e0b' },
  ];

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Live Telemetry Analysis</div>
          <div className="mt-1 flex items-center gap-2">
            <h3 className="text-xl font-bold text-white">Machine Health & Efficiency</h3>
            <span className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[11px] font-medium text-slate-400">
              Deterministic IoT Feed
            </span>
          </div>
        </div>

        {isAnomaly && (
          <div className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-300 animate-pulse">
            <AlertCircle size={14} />
            <span>Idle Anomaly Detected</span>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {/* Left: Dual Bar Chart comparing Baseline vs Current */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Clock size={15} className="text-amber-400" />
              <span>Idling Time vs Baseline (Minutes)</span>
            </div>
            <div className={`text-xs font-bold ${isAnomaly ? 'text-red-400' : 'text-slate-400'}`}>
              {idleRatio}× Baseline
            </div>
          </div>

          <div className="mt-3 h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: '#090d14', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="minutes" radius={[8, 8, 0, 0]} barSize={48}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex items-center justify-around text-xs border-t border-slate-800/60 pt-2 text-slate-400">
            <span>Normal Baseline: <strong className="text-sky-300">{baselineIdle.toFixed(0)} min</strong></span>
            <span>Current: <strong className={isAnomaly ? 'text-red-400' : 'text-amber-300'}>{currentIdle.toFixed(0)} min</strong></span>
          </div>
        </div>

        {/* Right: Key Machine Gauges */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Engine Load</span>
              <Gauge size={15} className="text-amber-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-white">{engineLoad.toFixed(1)}%</div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, engineLoad)}%` }}
                />
              </div>
            </div>
            <div className="text-[11px] text-slate-400">Operating within normal band</div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Fuel Consumed</span>
              <Fuel size={15} className="text-sky-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-white">{fuelUsed.toFixed(1)} L</div>
              <div className="mt-1 text-xs text-slate-300">~{(fuelUsed / Math.max(1, engineHours - 130)).toFixed(1)} L/hr average</div>
            </div>
            <div className="text-[11px] text-slate-400">Tank level nominal (74%)</div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 flex flex-col justify-between">
            <div className="text-xs text-slate-400">Load Cycles</div>
            <div className="my-1 text-2xl font-bold text-white">{loadCycles}</div>
            <div className="text-[11px] text-slate-400">Bucket duty cycles completed</div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 flex flex-col justify-between">
            <div className="text-xs text-slate-400">Engine Hours</div>
            <div className="my-1 text-2xl font-bold text-white">{engineHours.toFixed(1)} hrs</div>
            <div className="text-[11px] text-slate-400">Next PM service: 250 hrs</div>
          </div>
        </div>
      </div>
    </div>
  );
}
