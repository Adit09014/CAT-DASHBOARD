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
    <div className="card">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="label-caps mb-1">Live Telemetry</div>
          <h2 className="section-title">Machine Health & Efficiency</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="dot-live" />
          <span className="text-xs text-[var(--text-muted)]">IoT feed</span>
          {isAnomaly && (
            <div className="alert alert-danger py-1 px-2 text-xs animate-pulse">
              <AlertCircle size={12} />
              <span>Idle Anomaly</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: Dual Bar Chart */}
        <div className="card-raised">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[var(--yellow)]" />
              <span className="label-caps">Idle Time vs Baseline</span>
            </div>
            <span className={`text-xs font-bold mono ${isAnomaly ? 'text-[var(--red)]' : 'text-[var(--text-muted)]'}`}>
              {idleRatio}×
            </span>
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

          <div className="mt-2 flex items-center justify-around text-xs border-t border-[var(--border-subtle)] pt-2">
            <span className="text-[var(--text-muted)]">Baseline: <strong className="text-[var(--blue)]">{baselineIdle.toFixed(0)} min</strong></span>
            <span className="text-[var(--text-muted)]">Current: <strong className={isAnomaly ? 'text-[var(--red)]' : 'text-[var(--yellow)]'}>{currentIdle.toFixed(0)} min</strong></span>
          </div>
        </div>

        {/* Right: Machine Gauges */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-raised flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="label-caps">Engine Load</span>
              <Gauge size={13} className="text-[var(--yellow)]" />
            </div>
            <div className="my-2">
              <div className="kpi-value" style={{ fontSize: '1.6rem' }}>{engineLoad.toFixed(1)}%</div>
              <div className="progress-track mt-2">
                <div className="progress-fill progress-fill-yellow" style={{ width: `${Math.min(100, engineLoad)}%` }} />
              </div>
            </div>
            <div className="kpi-sub">Normal operating band</div>
          </div>

          <div className="card-raised flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="label-caps">Fuel Used</span>
              <Fuel size={13} className="text-[var(--blue)]" />
            </div>
            <div className="my-2">
              <div className="kpi-value" style={{ fontSize: '1.6rem' }}>{fuelUsed.toFixed(1)} L</div>
              <div className="kpi-sub mt-1">~{(fuelUsed / Math.max(1, engineHours - 130)).toFixed(1)} L/hr avg</div>
            </div>
            <div className="kpi-sub">Tank nominal (74%)</div>
          </div>

          <div className="card-raised flex flex-col justify-between">
            <div className="label-caps mb-1">Load Cycles</div>
            <div className="kpi-value" style={{ fontSize: '1.6rem' }}>{loadCycles}</div>
            <div className="kpi-sub">Bucket duty cycles</div>
          </div>

          <div className="card-raised flex flex-col justify-between">
            <div className="label-caps mb-1">Engine Hours</div>
            <div className="kpi-value" style={{ fontSize: '1.6rem' }}>{engineHours.toFixed(1)}</div>
            <div className="kpi-sub">Next PM at 250 hrs</div>
          </div>
        </div>
      </div>
    </div>
  );
}
