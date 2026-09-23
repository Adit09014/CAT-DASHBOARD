import React, { useState } from 'react';
import { ArrowRight, Sliders, TrendingDown, Fuel, Clock, Sparkles, HelpCircle } from 'lucide-react';
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
      label: 'Model-based estimate. Actual results may vary.',
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
    <div className="rounded-3xl border border-amber-500/30 bg-slate-950/80 p-5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
            <Sparkles size={14} />
            <span>Hero Feature</span>
          </div>
          <h3 className="mt-1 text-2xl font-bold text-white">What-If Mission Simulator</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
            RandomForestRegressor v1.2
          </span>
        </div>
      </div>

      {/* Simulator Interactive Controls */}
      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
          <Sliders size={14} className="text-amber-400" />
          <span>Interactive Scenario Parameters</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Slider: Idle Reduction */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Idle Reduction</span>
              <span className="font-bold text-amber-400">{idleReduction}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={idleReduction}
              onChange={(e) => handleIdleChange(Number(e.target.value))}
              className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% (Current)</span>
              <span>50% (Aggressive)</span>
            </div>
          </div>

          {/* Selector: Weather Condition */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">Weather Condition</label>
            <select
              value={weather}
              onChange={(e) => handleWeatherChange(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="Current">Current (Cloudy)</option>
              <option value="Rain">Rain (+5 min)</option>
              <option value="Dry">Clear & Dry (-2 min)</option>
            </select>
          </div>

          {/* Selector: Operator Skill */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">Operator Technique</label>
            <select
              value={operatorSkill}
              onChange={(e) => handleSkillChange(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="Current">Standard Practice</option>
              <option value="Improved">After Training (-3 min)</option>
            </select>
          </div>

          {/* Selector: Task Difficulty */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">Subsurface Density</label>
            <select
              value={taskDifficulty}
              onChange={(e) => handleDifficultyChange(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="Current">Lot A Typical Soil</option>
              <option value="Higher">Heavy Compacted Rock (+4 min)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Columns */}
      <div className="mt-5 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
        {/* Column 1: Current Baseline */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Current Mission</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white">{simData?.current?.duration ?? 74}</span>
              <span className="text-sm font-semibold text-slate-400">minutes</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
              <Fuel size={16} className="text-sky-400" />
              <span>Estimated Fuel: <strong className="text-white">{simData?.current?.fuel ?? 19.2} L</strong></span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <StatusBadge state="amber" label={simData?.current?.risk ?? 'Medium Risk'} />
          </div>
        </div>

        {/* Transition Arrow */}
        <div className="hidden md:flex items-center justify-center">
          <div className="rounded-full border border-amber-500/30 bg-amber-500/10 p-2 text-amber-400">
            <ArrowRight size={24} />
          </div>
        </div>

        {/* Column 2: Simulated Outcome */}
        <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-slate-950 p-5 shadow-lg flex flex-col justify-between relative">
          <div className="absolute top-3 right-3">
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950 uppercase tracking-wider">
              Simulated
            </span>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">Simulated Outcome</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-amber-300">{simData?.simulated?.duration ?? 66}</span>
              <span className="text-sm font-semibold text-amber-200/70">minutes</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-100">
              <Fuel size={16} className="text-amber-400" />
              <span>Simulated Fuel: <strong className="text-white">{simData?.simulated?.fuel ?? 16.8} L</strong></span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-500/20">
            <StatusBadge state="green" label={simData?.simulated?.risk ?? 'Lower Risk'} />
          </div>
        </div>
      </div>

      {/* Highlights: Delta Callouts */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Time Variance</div>
            <div className="text-xl font-bold text-emerald-300">
              {simData?.deltas?.duration ?? -8} min
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <TrendingDown size={20} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Fuel Conservation</div>
            <div className="text-xl font-bold text-emerald-300">
              {simData?.deltas?.fuel ?? -2.4} Liters
            </div>
          </div>
        </div>
      </div>

      {/* Transparency Note */}
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-2.5 text-[11px] text-slate-400">
        <HelpCircle size={14} className="flex-shrink-0 text-slate-500" />
        <span>
          <strong>Model Disclosure:</strong> Estimates calculated by trained Random Forest regression. Outputs model historical scenarios and do not guarantee field results.
        </span>
      </div>
    </div>
  );
}
