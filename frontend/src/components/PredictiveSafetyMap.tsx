import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  ShieldAlert,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  User,
  Truck,
  Car,
  AlertOctagon,
  Info,
  Radio,
  Sliders,
  CheckCircle2,
  Volume2
} from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';

interface TargetTrajectoryPoint {
  second: number;
  x_rel: number;
  y_rel: number;
  distance_meters: number;
  bearing_degrees: number;
  is_conflict: boolean;
}

interface RadarTarget {
  id: string;
  name: string;
  target_type: 'PEDESTRIAN' | 'HAUL_TRUCK' | 'LIGHT_VEHICLE' | 'HEAVY_VEHICLE' | 'GEO_HAZARD' | string;
  distance_meters: number;
  bearing_degrees: number;
  relative_speed_mps: number;
  heading_degrees: number;
  ttc_seconds: number | null;
  closest_approach_meters: number;
  risk_level: 'SAFE' | 'CAUTION' | 'WARNING' | 'CRITICAL';
  zone: string;
  trajectory: TargetTrajectoryPoint[];
}

interface SafetySimulationResponse {
  state: 'NORMAL' | 'CAUTION' | 'WARNING' | 'CRITICAL';
  advisory: string;
  seconds_to_conflict: number | null;
  minimum_distance_meters: number;
  radar_targets: RadarTarget[];
  active_scenario: string;
  site_zone: string;
  machine_code: string;
  operator_name: string;
  label: string;
}

interface PredictiveSafetyMapProps {
  taskId?: number;
  operatorName?: string;
  machineCode?: string;
}

export function PredictiveSafetyMap({ taskId = 1, operatorName, machineCode }: PredictiveSafetyMapProps) {
  const [scenario, setScenario] = useState<string>('pedestrian');
  const [horizon, setHorizon] = useState<number>(30);
  const [threshold, setThreshold] = useState<number>(8.0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [sim, setSim] = useState<SafetySimulationResponse | null>(null);

  // Load simulation data from backend
  const fetchSimulation = async (scen = scenario, horiz = horizon, thresh = threshold) => {
    try {
      setLoading(true);
      const res = await api.post('/safety/simulate', {
        task_id: taskId,
        horizon_seconds: horiz,
        threshold_meters: thresh,
        scenario: scen,
      });
      setSim(res.data);
      setCurrentTime(0);
      setIsPlaying(false);
      if (res.data?.radar_targets?.length) {
        // Default to selecting the highest risk target
        const critical = res.data.radar_targets.find((t: RadarTarget) => t.risk_level === 'CRITICAL' || t.risk_level === 'WARNING');
        setSelectedTargetId(critical ? critical.id : res.data.radar_targets[0].id);
      }
    } catch (err) {
      console.error('Failed to load proximity simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulation(scenario, horizon, threshold);
  }, [taskId, scenario, horizon, threshold]);

  // Simulation playback timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= horizon) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    }
    return () => clearInterval(interval);
  }, [isPlaying, horizon]);

  // Derived current state at currentTime
  const currentTargets = (sim?.radar_targets || []).map((target) => {
    if (currentTime === 0 || !target.trajectory || target.trajectory.length === 0) {
      const r = target.distance_meters;
      const rad = (target.bearing_degrees * Math.PI) / 180;
      return {
        ...target,
        curr_x: r * Math.sin(rad),
        curr_y: r * Math.cos(rad),
        curr_dist: target.distance_meters,
        curr_bearing: target.bearing_degrees,
        in_conflict: target.distance_meters <= threshold,
      };
    }

    const pt = target.trajectory[Math.min(currentTime - 1, target.trajectory.length - 1)];
    return {
      ...target,
      curr_x: pt.x_rel,
      curr_y: pt.y_rel,
      curr_dist: pt.distance_meters,
      curr_bearing: pt.bearing_degrees,
      in_conflict: pt.distance_meters <= threshold,
    };
  });

  const activeConflicts = currentTargets.filter((t) => t.in_conflict);
  const isAlarmTriggered = activeConflicts.length > 0;
  const selectedTarget = currentTargets.find((t) => t.id === selectedTargetId) || currentTargets[0];

  // Radar display constants
  const cx = 200;
  const cy = 200;
  const maxRangeMeters = 50.0;
  const radarRadiusPx = 160;
  const pxPerMeter = radarRadiusPx / maxRangeMeters; // 3.2 px/meter

  const rangeRings = [10, 25, 40, 50];

  // Helper to map real coordinates to SVG pixels
  const toSvgCoords = (xMeters: number, yMeters: number) => {
    const svgX = cx + xMeters * pxPerMeter;
    const svgY = cy - yMeters * pxPerMeter; // In SVG +Y is downwards
    return { x: svgX, y: svgY };
  };

  const getTargetIcon = (type: string, size = 14) => {
    switch (type) {
      case 'PEDESTRIAN':
        return <User size={size} />;
      case 'HAUL_TRUCK':
        return <Truck size={size} />;
      case 'LIGHT_VEHICLE':
        return <Car size={size} />;
      case 'GEO_HAZARD':
        return <AlertOctagon size={size} />;
      default:
        return <Compass size={size} />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return 'var(--red, #ef4444)';
      case 'WARNING':
        return 'var(--yellow, #f59e0b)';
      case 'CAUTION':
        return 'var(--blue, #3b82f6)';
      default:
        return 'var(--green, #22c55e)';
    }
  };

  return (
    <div className="card space-y-5">
      <style>{`
        @keyframes radar-beam-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .radar-sweep-line {
          transform-origin: 200px 200px;
          animation: radar-beam-rotate 4s linear infinite;
        }
        @keyframes blip-beacon {
          0% { r: 5; opacity: 1; }
          50% { r: 16; opacity: 0.3; }
          100% { r: 24; opacity: 0; }
        }
        .blip-pulse-ring {
          animation: blip-beacon 1.2s ease-out infinite;
        }
      `}</style>

      {/* Header with Title and Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <div className="label-caps">Collision Avoidance</div>
          <h2 className="section-title mt-0.5">Proximity Radar</h2>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            {sim?.machine_code || machineCode || 'EXC-001'} · {sim?.operator_name || operatorName || 'Avery Stone'} · {sim?.site_zone || 'Lot A'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge
            state={isAlarmTriggered ? 'red' : sim?.state === 'CRITICAL' ? 'red' : sim?.state === 'WARNING' ? 'amber' : 'green'}
            label={isAlarmTriggered ? 'CONFLICT' : `ZONE: ${sim?.state || 'CLEAR'}`}
          />
          <div className="chip chip-gray text-xs mono">
            {horizon}s Window
          </div>
        </div>
      </div>

      {/* Scenario Selection Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setScenario('safe')}
          className={`btn text-xs py-1.5 px-2.5 flex items-center justify-center gap-1.5 ${
            scenario === 'safe' ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          <CheckCircle2 size={13} className={scenario === 'safe' ? 'text-black' : 'text-[var(--green)]'} />
          <span>Safe Corridors</span>
        </button>

        <button
          onClick={() => setScenario('pedestrian')}
          className={`btn text-xs py-1.5 px-2.5 flex items-center justify-center gap-1.5 ${
            scenario === 'pedestrian' ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          <User size={13} className={scenario === 'pedestrian' ? 'text-black' : 'text-[var(--red)]'} />
          <span>Worker Incursion</span>
        </button>

        <button
          onClick={() => setScenario('vehicle')}
          className={`btn text-xs py-1.5 px-2.5 flex items-center justify-center gap-1.5 ${
            scenario === 'vehicle' ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          <Truck size={13} className={scenario === 'vehicle' ? 'text-black' : 'text-[var(--yellow)]'} />
          <span>Haul Truck</span>
        </button>

        <button
          onClick={() => setScenario('geofence')}
          className={`btn text-xs py-1.5 px-2.5 flex items-center justify-center gap-1.5 ${
            scenario === 'geofence' ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          <AlertOctagon size={13} className={scenario === 'geofence' ? 'text-black' : 'text-[var(--blue)]'} />
          <span>Trench Drop-off</span>
        </button>
      </div>

      {/* Advisory Banner */}
      <div
        className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs ${
          isAlarmTriggered
            ? 'bg-red-950/40 border-red-500/60 text-red-200'
            : sim?.state === 'CRITICAL' || sim?.state === 'WARNING'
            ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isAlarmTriggered ? (
            <Volume2 size={16} className="text-red-400 flex-shrink-0" />
          ) : (
            <Radio size={16} className="text-amber-400 flex-shrink-0" />
          )}
          <span className="font-medium">
            {sim?.advisory || 'All proximity safety corridors clear.'}
          </span>
        </div>

        <div className="mono font-bold flex-shrink-0">
          {sim?.minimum_distance_meters ? `${sim.minimum_distance_meters.toFixed(1)}m min` : ''}
        </div>
      </div>

      {/* Radar Canvas & Target Telemetry Side-by-Side */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">

        {/* Left: The Circular Polar PPI Radar Canvas */}
        <div className="card-raised flex flex-col items-center justify-center p-3 relative overflow-hidden bg-[#070b12] border border-[#1e293b]">
          <div className="w-full flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-2 px-1">
            <span className="mono">PPI DISPLAY</span>
            <span className="mono font-bold text-[var(--yellow)]">T = {currentTime}s / {horizon}s</span>
          </div>

          <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full select-none"
              style={{ filter: 'drop-shadow(0 0 16px rgba(0,0,0,0.8))' }}
            >
              <defs>
                {/* Radar sweep beam gradient */}
                <radialGradient id="radarSweepGlow" cx="0%" cy="0%" r="100%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
                  <stop offset="70%" stopColor="#22c55e" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </radialGradient>

                {/* Alarm beacon glow */}
                <radialGradient id="alarmPulseGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background dark radar circle */}
              <circle cx={cx} cy={cy} r={radarRadiusPx} fill="#05080e" stroke="#1e293b" strokeWidth="2" />

              {/* Concentric Range Rings */}
              {rangeRings.map((ringMeters) => {
                const rPx = ringMeters * pxPerMeter;
                const isThresholdRing = ringMeters === 10;
                return (
                  <g key={ringMeters}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={rPx}
                      fill="none"
                      stroke={isThresholdRing ? 'rgba(239, 68, 68, 0.35)' : 'rgba(51, 65, 85, 0.45)'}
                      strokeWidth={isThresholdRing ? '1.5' : '1'}
                      strokeDasharray={isThresholdRing ? '4 3' : 'none'}
                    />
                    <text
                      x={cx + 4}
                      y={cy - rPx + 11}
                      fill={isThresholdRing ? '#ef4444' : '#64748b'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {ringMeters}m
                    </text>
                  </g>
                );
              })}

              {/* Azimuth crosshairs */}
              <line x1={cx - radarRadiusPx} y1={cy} x2={cx + radarRadiusPx} y2={cy} stroke="rgba(51, 65, 85, 0.3)" strokeWidth="1" />
              <line x1={cx} y1={cy - radarRadiusPx} x2={cx} y2={cy + radarRadiusPx} stroke="rgba(51, 65, 85, 0.3)" strokeWidth="1" />

              {/* Diagonal crosshairs */}
              <line
                x1={cx - radarRadiusPx * 0.707}
                y1={cy - radarRadiusPx * 0.707}
                x2={cx + radarRadiusPx * 0.707}
                y2={cy + radarRadiusPx * 0.707}
                stroke="rgba(51, 65, 85, 0.15)"
                strokeDasharray="2 4"
              />
              <line
                x1={cx - radarRadiusPx * 0.707}
                y1={cy + radarRadiusPx * 0.707}
                x2={cx + radarRadiusPx * 0.707}
                y2={cy - radarRadiusPx * 0.707}
                stroke="rgba(51, 65, 85, 0.15)"
                strokeDasharray="2 4"
              />

              {/* Degree / Orientation Markers */}
              <text x={cx} y={cy - radarRadiusPx + 14} textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">0° FRONT</text>
              <text x={cx + radarRadiusPx - 8} y={cy + 3} textAnchor="end" fill="#94a3b8" fontSize="9">90° RIGHT</text>
              <text x={cx} y={cy + radarRadiusPx - 6} textAnchor="middle" fill="#94a3b8" fontSize="9">180° REAR</text>
              <text x={cx - radarRadiusPx + 8} y={cy + 3} textAnchor="start" fill="#94a3b8" fontSize="9">270° LEFT</text>

              {/* Blind Spot Shaded Sector (Right rear quarter 90° - 150°) */}
              <path
                d={`M ${cx} ${cy} L ${cx + radarRadiusPx} ${cy} A ${radarRadiusPx} ${radarRadiusPx} 0 0 1 ${cx + radarRadiusPx * 0.5} ${cy + radarRadiusPx * 0.866} Z`}
                fill="rgba(239, 68, 68, 0.06)"
              />

              {/* Rotating Radar Sweep Line & Cone */}
              <g className="radar-sweep-line">
                <path
                  d={`M ${cx} ${cy} L ${cx} ${cy - radarRadiusPx} A ${radarRadiusPx} ${radarRadiusPx} 0 0 1 ${cx + radarRadiusPx * 0.38} ${cy - radarRadiusPx * 0.92} Z`}
                  fill="url(#radarSweepGlow)"
                />
                <line x1={cx} y1={cy} x2={cx} y2={cy - radarRadiusPx} stroke="rgba(34, 197, 94, 0.8)" strokeWidth="1.5" />
              </g>

              {/* Central Machine Indicator (Excavator / Cab icon) */}
              <g>
                <circle cx={cx} cy={cy} r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                {/* Machine Boom indicator pointing up towards 0° */}
                <line x1={cx} y1={cy - 4} x2={cx} y2={cy - 20} stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                {/* Cab silhouette dot */}
                <circle cx={cx - 3} cy={cy - 1} r="2.5" fill="#f59e0b" />
                <rect x={cx - 7} y={cy - 6} width="14" height="12" rx="3" fill="none" stroke="#f59e0b" strokeWidth="1.2" />
              </g>

              {/* Active Radar Target Blips */}
              {currentTargets.map((target) => {
                const pos = toSvgCoords(target.curr_x, target.curr_y);
                const isSelected = target.id === selectedTargetId;
                const isConflict = target.in_conflict;

                const blipFill = isConflict
                  ? '#ef4444'
                  : target.risk_level === 'CRITICAL'
                  ? '#ef4444'
                  : target.risk_level === 'WARNING'
                  ? '#f59e0b'
                  : target.risk_level === 'CAUTION'
                  ? '#38bdf8'
                  : '#22c55e';

                return (
                  <g
                    key={target.id}
                    onClick={() => setSelectedTargetId(target.id)}
                    className="cursor-pointer"
                  >
                    {/* Pulsing warning beacon if in conflict */}
                    {isConflict && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="18"
                        className="blip-pulse-ring"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                      />
                    )}

                    {/* Target Trajectory Projected Path line */}
                    {target.trajectory && target.trajectory.length > 0 && (
                      <polyline
                        points={target.trajectory
                          .map((pt) => {
                            const c = toSvgCoords(pt.x_rel, pt.y_rel);
                            return `${c.x},${c.y}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke={blipFill}
                        strokeWidth="1.2"
                        strokeDasharray="2 3"
                        strokeOpacity="0.4"
                      />
                    )}

                    {/* Vector Heading Pointer Line */}
                    {target.relative_speed_mps > 0.2 && (
                      <line
                        x1={pos.x}
                        y1={pos.y}
                        x2={pos.x + 16 * Math.sin((target.heading_degrees * Math.PI) / 180)}
                        y2={pos.y - 16 * Math.cos((target.heading_degrees * Math.PI) / 180)}
                        stroke={blipFill}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Distance tether line to machine if selected or in conflict */}
                    {(isSelected || isConflict) && (
                      <line
                        x1={cx}
                        y1={cy}
                        x2={pos.x}
                        y2={pos.y}
                        stroke={isConflict ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 166, 35, 0.3)'}
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                    )}

                    {/* Target Outer Selection Ring */}
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="11"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Target Solid Core Blip */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isConflict ? 6 : 5}
                      fill={blipFill}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />

                    {/* Target ID and Range Label */}
                    <text
                      x={pos.x + 8}
                      y={pos.y + 4}
                      fill={isConflict ? '#ef4444' : '#f8fafc'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {target.id} ({target.curr_dist.toFixed(0)}m)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Radar Legend and Compass Orientation Info */}
          <div className="w-full flex items-center justify-between text-[11px] text-[var(--text-muted)] mt-2 pt-2 border-t border-[#1e293b]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--red)]" /> Conflict (&lt;8m)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--yellow)]" /> Intersecting
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--green)]" /> Clear
              </span>
            </div>
            <span className="mono text-[10px]">RED ARC = BLIND SPOT</span>
          </div>
        </div>

        {/* Right: Target Inspection HUD & Selected Target Telemetry */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="card-raised space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="label-caps">Target Telemetry HUD</div>
              <span className="chip chip-gray text-[10px] mono">
                {selectedTarget?.id || 'TRG-01'}
              </span>
            </div>

            {selectedTarget ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `${getRiskColor(selectedTarget.risk_level)}20`,
                      color: getRiskColor(selectedTarget.risk_level),
                    }}
                  >
                    {getTargetIcon(selectedTarget.target_type, 16)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[var(--text-primary)]">
                      {selectedTarget.name}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Type: {selectedTarget.target_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-md bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-muted)]">Current Distance</div>
                    <div className="text-base font-bold mono text-[var(--text-primary)] mt-0.5">
                      {selectedTarget.curr_dist.toFixed(1)} m
                    </div>
                  </div>

                  <div className="p-2 rounded-md bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-muted)]">Bearing Azimuth</div>
                    <div className="text-base font-bold mono text-[var(--text-primary)] mt-0.5">
                      {selectedTarget.curr_bearing.toFixed(0)}°
                    </div>
                  </div>

                  <div className="p-2 rounded-md bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-muted)]">Relative Speed</div>
                    <div className="text-base font-bold mono text-[var(--text-primary)] mt-0.5">
                      {selectedTarget.relative_speed_mps.toFixed(1)} m/s
                    </div>
                  </div>

                  <div className="p-2 rounded-md bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-muted)]">Time-to-Collision</div>
                    <div
                      className={`text-base font-bold mono mt-0.5 ${
                        selectedTarget.ttc_seconds && selectedTarget.ttc_seconds <= 8
                          ? 'text-[var(--red)] animate-pulse'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {selectedTarget.ttc_seconds ? `${selectedTarget.ttc_seconds.toFixed(1)}s` : 'Clear'}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] p-2 rounded-md bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Site Sector Zone:</span>
                  <span className="font-semibold text-[var(--text-secondary)]">{selectedTarget.zone}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[var(--text-muted)] py-4 text-center">
                Select a target on the radar to inspect vectors.
              </div>
            )}
          </div>

          {/* Quick Target Switcher Pills */}
          <div className="card-raised space-y-2">
            <div className="label-caps">Tracked Targets ({currentTargets.length})</div>
            <div className="space-y-1.5">
              {currentTargets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTargetId(t.id)}
                  className={`w-full p-2 rounded-lg text-xs flex items-center justify-between transition-all ${
                    t.id === selectedTargetId
                      ? 'bg-[var(--bg-elevated)] border border-[var(--yellow)]'
                      : 'bg-[var(--bg-base)] hover:bg-[var(--bg-surface)] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getRiskColor(t.risk_level) }}
                    />
                    <span className="font-medium text-[var(--text-primary)]">{t.name}</span>
                  </div>
                  <span className="mono text-[var(--text-muted)]">{t.curr_dist.toFixed(0)}m</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Scrubber & Playback Controls */}
      <div className="card-raised p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? 'Pause' : 'Play 30s Simulation'}</span>
            </button>

            <button
              onClick={() => {
                setCurrentTime(0);
                setIsPlaying(false);
              }}
              className="btn btn-ghost text-xs py-1.5 px-2.5 flex items-center gap-1"
              title="Reset to 0s"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>

            <button
              onClick={() => setCurrentTime((t) => Math.min(horizon, t + 5))}
              className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
              title="Step +5s"
            >
              <SkipForward size={12} />
              <span>+5s</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)]">
              Simulated Time Horizon:
            </span>
            <span className="chip chip-amber text-xs mono font-bold">
              T = {currentTime}s / {horizon}s
            </span>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={horizon}
            step="1"
            value={currentTime}
            onChange={(e) => {
              setCurrentTime(Number(e.target.value));
              setIsPlaying(false);
            }}
            className="w-full accent-[var(--yellow)] bg-[var(--bg-base)] h-2 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mono">
            <span>0s (Now)</span>
            <span>10s</span>
            <span>20s</span>
            <span>{horizon}s (End of Horizon)</span>
          </div>
        </div>
      </div>

      {/* Active Target Roster Data Table */}
      <div className="card-raised overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="label-caps">Tracked Targets</div>
          <span className="text-xs text-[var(--text-muted)] mono">{currentTargets.length} Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>Target ID</th>
                <th>Name & Classification</th>
                <th>Blindspot / Sector</th>
                <th>Current Range</th>
                <th>Bearing</th>
                <th>Speed</th>
                <th>Time-to-Collision</th>
                <th>Threat Status</th>
              </tr>
            </thead>
            <tbody>
              {currentTargets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTargetId(t.id)}
                  className={`cursor-pointer ${t.id === selectedTargetId ? 'bg-[var(--bg-elevated)]' : ''}`}
                >
                  <td className="mono font-bold text-[var(--text-primary)]">{t.id}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {getTargetIcon(t.target_type, 13)}
                      <span className="font-medium">{t.name}</span>
                    </div>
                  </td>
                  <td className="text-[var(--text-muted)]">{t.zone}</td>
                  <td className="mono font-bold">{t.curr_dist.toFixed(1)} m</td>
                  <td className="mono">{t.curr_bearing.toFixed(0)}°</td>
                  <td className="mono">{t.relative_speed_mps.toFixed(1)} m/s</td>
                  <td className="mono">
                    {t.ttc_seconds ? (
                      <span className={t.ttc_seconds <= 8 ? 'text-[var(--red)] font-bold' : ''}>
                        {t.ttc_seconds.toFixed(1)}s
                      </span>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td>
                    <span
                      className={`chip text-[10px] py-0 px-2 ${
                        t.in_conflict
                          ? 'chip-red font-bold animate-pulse'
                          : t.risk_level === 'CRITICAL'
                          ? 'chip-red'
                          : t.risk_level === 'WARNING'
                          ? 'chip-amber'
                          : t.risk_level === 'CAUTION'
                          ? 'chip-blue'
                          : 'chip-green'
                      }`}
                    >
                      {t.in_conflict ? 'CONFLICT' : t.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
