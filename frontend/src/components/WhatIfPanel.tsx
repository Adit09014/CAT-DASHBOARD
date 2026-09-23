import React, { useState } from 'react';
import { Sliders, Fuel, Clock, ArrowRight, TrendingDown } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';

interface WhatIfPanelProps {
  taskId?: number;
  initialData?: {
    current: { duration: number; fuel: number; risk: string };
    simulated: { duration: number; fuel: number; risk: string };
    deltas: { duration: number; fuel: number; risk: string };
    label?: string;
  };
}

export function WhatIfPanel({ taskId = 1, initialData }: WhatIfPanelProps) {
  const [idleReduction, setIdleReduction] = useState(20);
  const [weather, setWeather] = useState('Current');
  const [operatorSkill, setOperatorSkill] = useState('Current');
  const [taskDifficulty, setTaskDifficulty] = useState('Current');
  const [loading, setLoading] = useState(false);

  const [simData, setSimData] = useState(
    initialData || {
      current: { duration: 74, fuel: 19.2, risk: 'Medium Risk' },
      simulated: { duration: 66, fuel: 16.8, risk: 'Lower Risk' },
      deltas: { duration: -8, fuel: -2.4, risk: 'Lower Risk' },
    }
  );

  const runSimulation = async (newIdle: number, newWeather: string, newSkill: string, newDiff: string) => {
    try {
      setLoading(true);
      const res = await api.post('/simulate/what-if', {
        task_id: taskId,
        idle_reduction: newIdle,
        weather: newWeather,
        operator_skill: newSkill,
        task_difficulty: newDiff,
      });
      setSimData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIdleChange = (val: number) => {
    setIdleReduction(val);
    runSimulation(val, weather, operatorSkill, taskDifficulty);
  };

  const handleWeatherChange = (val: string) => {
    setWeather(val);
    runSimulation(idleReduction, val, operatorSkill, taskDifficulty);
  };

  const handleSkillChange = (val: string) => {
    setOperatorSkill(val);
    runSimulation(idleReduction, weather, val, taskDifficulty);
  };

  const handleDifficultyChange = (val: string) => {
    setTaskDifficulty(val);
    runSimulation(idleReduction, weather, operatorSkill, val);
  };

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <div className="label-caps">Predictive Modeling</div>
          <h2 className="section-title mt-0.5">What-If Simulator</h2>
        </div>
        <div className="chip chip-gray text-xs mono">
          {loading ? 'Calculating...' : 'Live Model'}
        </div>
      </div>

      {/* 4 Interactive Controls */}
      <div className="card-raised p-3.5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Idle Reduction Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)] font-medium">Idle Reduction</span>
              <span className="font-bold text-[var(--yellow)]">{idleReduction}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={idleReduction}
              onChange={(e) => handleIdleChange(Number(e.target.value))}
              className="w-full accent-[var(--yellow)] bg-[var(--bg-base)] h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Weather Dropdown */}
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)] font-medium block">Weather Condition</label>
            <select
              value={weather}
              onChange={(e) => handleWeatherChange(e.target.value)}
              className="input-field py-1 text-xs"
            >
              <option value="Current">Current (Cloudy)</option>
              <option value="Rain">Rain (+5 min)</option>
              <option value="Dry">Clear & Dry (-2 min)</option>
            </select>
          </div>

          {/* Operator Technique */}
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)] font-medium block">Technique</label>
            <select
              value={operatorSkill}
              onChange={(e) => handleSkillChange(e.target.value)}
              className="input-field py-1 text-xs"
            >
              <option value="Current">Standard Practice</option>
              <option value="Improved">After Training (-3 min)</option>
            </select>
          </div>

          {/* Soil Density */}
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)] font-medium block">Ground Condition</label>
            <select
              value={taskDifficulty}
              onChange={(e) => handleDifficultyChange(e.target.value)}
              className="input-field py-1 text-xs"
            >
              <option value="Current">Standard Soil</option>
              <option value="Higher">Compacted Rock (+4 min)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Current Baseline Card */}
        <div className="card-raised p-4 flex flex-col justify-between">
          <div>
            <div className="label-caps">Current Mission</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold mono text-[var(--text-primary)]">
                {simData?.current?.duration ?? 74}
              </span>
              <span className="text-xs text-[var(--text-muted)]">minutes</span>
            </div>
            <div className="mt-2 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
              <Fuel size={13} className="text-[var(--blue)]" />
              <span>Est. Fuel: <strong className="text-[var(--text-primary)]">{simData?.current?.fuel ?? 19.2} L</strong></span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">Risk State</span>
            <StatusBadge
              state={simData?.current?.risk === 'Lower Risk' ? 'green' : 'amber'}
              label={simData?.current?.risk ?? 'Medium Risk'}
            />
          </div>
        </div>

        {/* Simulated Outcome Card */}
        <div className="card-raised p-4 border border-[var(--border-default)] flex flex-col justify-between">
          <div>
            <div className="label-caps text-[var(--yellow)]">Simulated Outcome</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold mono text-[var(--yellow)]">
                {simData?.simulated?.duration ?? 66}
              </span>
              <span className="text-xs text-[var(--text-muted)]">minutes</span>
            </div>
            <div className="mt-2 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
              <Fuel size={13} className="text-[var(--yellow)]" />
              <span>Sim. Fuel: <strong className="text-[var(--text-primary)]">{simData?.simulated?.fuel ?? 16.8} L</strong></span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">Projected Risk</span>
            <StatusBadge
              state={simData?.simulated?.risk === 'Lower Risk' ? 'green' : 'amber'}
              label={simData?.simulated?.risk ?? 'Lower Risk'}
            />
          </div>
        </div>
      </div>

      {/* Delta Callouts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-raised p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-[var(--green)] flex items-center justify-center flex-shrink-0">
            <Clock size={16} />
          </div>
          <div>
            <div className="text-[11px] text-[var(--text-muted)]">Time Delta</div>
            <div className="text-base font-bold mono text-[var(--green)]">
              {simData?.deltas?.duration ?? -8} min
            </div>
          </div>
        </div>

        <div className="card-raised p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-[var(--green)] flex items-center justify-center flex-shrink-0">
            <TrendingDown size={16} />
          </div>
          <div>
            <div className="text-[11px] text-[var(--text-muted)]">Fuel Delta</div>
            <div className="text-base font-bold mono text-[var(--green)]">
              {simData?.deltas?.fuel ?? -2.4} L
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
