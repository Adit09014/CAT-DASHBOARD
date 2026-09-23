import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, AlertTriangle, Eye, Compass } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';

interface TrajectoryPoint {
  second: number;
  machine: { x: number; y: number; velocity: number; heading: number };
  object: { x: number; y: number; velocity: number; heading: number };
  distance_meters: number;
}

interface SafetySimulation {
  state: 'NORMAL' | 'CAUTION' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  advisory: string;
  seconds_to_conflict: number | null;
  minimum_distance_meters: number;
  trajectory: TrajectoryPoint[];
  label: string;
}

interface PredictiveSafetyMapProps {
  taskId?: number;
}

export function PredictiveSafetyMap({ taskId = 1 }: PredictiveSafetyMapProps) {
  const [horizon, setHorizon] = useState(30);
  const [threshold, setThreshold] = useState(8.0);
  const [sim, setSim] = useState<SafetySimulation | null>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    try {
      setLoading(true);
      const res = await api.post('/safety/simulate', {
        task_id: taskId,
        horizon_seconds: horizon,
        threshold_meters: threshold,
      });
      setSim(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const trajectory = sim?.trajectory ?? [];
  const state = sim?.state ?? 'NORMAL';

  const badgeColor =
    state === 'CRITICAL'
      ? 'red'
      : state === 'WARNING'
      ? 'amber'
      : state === 'CAUTION'
      ? 'blue'
      : 'green';

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.25em] text-sky-400">
            <Compass size={14} />
            <span>Hero Feature</span>
          </div>
          <h3 className="mt-1 text-2xl font-bold text-white">Predictive Safety Intelligence</h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge state={badgeColor} label={`ZONE STATE: ${state}`} />
        </div>
      </div>

      {/* Trajectory SVG Canvas */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>2D Trajectory Projection (Machine vs Obstacle)</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> CAT EXC-001</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Haul Truck / Hazard</span>
          </div>
        </div>

        <svg viewBox="0 0 460 170" className="h-44 w-full rounded-xl bg-slate-950/90 border border-slate-800/80">
          <defs>
            <radialGradient id="hazardGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="40" x2="460" y2="40" stroke="rgba(255,255,255,0.04)" />
          <line x1="0" y1="85" x2="460" y2="85" stroke="rgba(255,255,255,0.04)" />
          <line x1="0" y1="130" x2="460" y2="130" stroke="rgba(255,255,255,0.04)" />

          {trajectory.length > 0 ? (
            <>
              {/* Distance connecting lines and trajectory points */}
              {trajectory.map((pt, i) => {
                const mx = 30 + i * 13;
                const my = 120 - pt.machine.y * 0.28;
                const ox = 30 + i * 13;
                const oy = 50 + pt.object.y * 0.22;
                const isConflict = pt.distance_meters <= threshold;

                return (
                  <g key={i}>
                    {i % 4 === 0 && (
                      <line
                        x1={mx}
                        y1={my}
                        x2={ox}
                        y2={oy}
                        stroke={isConflict ? 'rgba(239,68,68,0.5)' : 'rgba(148,163,184,0.15)'}
                        strokeDasharray="2 2"
                      />
                    )}
                    <circle cx={mx} cy={my} r={3} fill="#3b82f6" />
                    <circle cx={ox} cy={oy} r={3} fill={isConflict ? '#ef4444' : '#f59e0b'} />
                    {i % 6 === 0 && (
                      <text x={mx - 6} y={155} fill="#64748b" fontSize="9">
                        {pt.second}s
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Conflict indicator zone */}
              {sim?.seconds_to_conflict && (
                <g>
                  <circle
                    cx={30 + sim.seconds_to_conflict * 13}
                    cy={85}
                    r={24}
                    fill="url(#hazardGlow)"
                    className="animate-pulse"
                  />
                  <text
                    x={30 + sim.seconds_to_conflict * 13 - 16}
                    y={90}
                    fill="#ef4444"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    ! {sim.seconds_to_conflict}s
                  </text>
                </g>
              )}
            </>
          ) : (
            <text x="50%" y="50%" textAnchor="middle" fill="#64748b" fontSize="13">
              Click &quot;Simulate Proximity&quot; below to compute lookahead vectors
            </text>
          )}
        </svg>

        {/* Conflict & Distance Stats */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-[11px] text-slate-400">Conflict Horizon</div>
            <div className={`mt-1 text-lg font-bold ${sim?.seconds_to_conflict ? 'text-amber-400' : 'text-slate-300'}`}>
              {sim?.seconds_to_conflict ? `${sim.seconds_to_conflict} seconds` : 'No conflict'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-[11px] text-slate-400">Closest Approach</div>
            <div className="mt-1 text-lg font-bold text-white">
              {sim?.minimum_distance_meters ? `${sim.minimum_distance_meters.toFixed(1)} meters` : '--'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-[11px] text-slate-400">Simulation Threshold</div>
            <div className="mt-1 text-lg font-bold text-white">{threshold} meters</div>
          </div>
        </div>

        {/* Advisory Text */}
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-xs text-slate-300">
          <AlertTriangle size={16} className={`flex-shrink-0 mt-0.5 ${state === 'CRITICAL' ? 'text-red-400' : state === 'WARNING' ? 'text-amber-400' : 'text-sky-400'}`} />
          <span>{sim?.advisory ?? 'Predictive safety computes future coordinates to calculate time-to-conflict. Never physical machine control.'}</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Lookahead Window:</span>
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
          >
            <option value="20">20 Seconds</option>
            <option value="30">30 Seconds</option>
            <option value="45">45 Seconds</option>
          </select>
        </div>

        <button
          onClick={runSimulation}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/20 px-4 py-2 text-xs font-bold text-sky-200 transition-all hover:bg-sky-500/30"
        >
          <ShieldAlert size={15} />
          {loading ? 'Projecting Vectors...' : 'Simulate Proximity'}
        </button>
      </div>
    </div>
  );
}
