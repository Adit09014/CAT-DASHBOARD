import React, { useState } from 'react';
import { ShieldAlert, Play, Sparkles, RefreshCcw, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface QuickDemoToolbarProps {
  onReset: () => void;
  onAdvance: () => void;
  onSelectBeat?: (beatNumber: number) => void;
  currentStep?: number;
}

export function QuickDemoToolbar({ onReset, onAdvance, onSelectBeat }: QuickDemoToolbarProps) {
  const [activeBeat, setActiveBeat] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const triggerBeat = async (beat: number) => {
    setActiveBeat(beat);
    if (onSelectBeat) onSelectBeat(beat);

    try {
      setLoading(true);
      if (beat === 1) {
        // Safety Gate demo: reset to unfastened seatbelt to demonstrate digital block
        await api.post('/demo/scenario/safety-failure');
      } else if (beat === 2) {
        // Advance telemetry to trigger 43m idle anomaly
        await api.post('/demo/scenario/excessive-idle');
      } else if (beat === 3) {
        // What-if scenario
        await api.post('/demo/scenario/what-if');
      } else if (beat === 4) {
        // Domain guard scenario
        await api.post('/demo/scenario/training-query');
      }
      onAdvance();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setActiveBeat(null);
    try {
      setLoading(true);
      await api.post('/demo/reset');
      onReset();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-slate-950/90 p-3 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold text-xs">CAT</span>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">3-Minute Judge Demo Director</div>
            <div className="text-[11px] text-slate-400">Jump directly to any story beat to guarantee a flawless live presentation</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => triggerBeat(1)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              activeBeat === 1 ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
            }`}
          >
            <ShieldAlert size={13} className="text-amber-400" />
            <span>Beat 1: Safety Gate</span>
          </button>

          <button
            onClick={() => triggerBeat(2)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              activeBeat === 2 ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Activity size={13} className="text-sky-400" />
            <span>Beat 2: Idle Drift</span>
          </button>

          <button
            onClick={() => triggerBeat(3)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              activeBeat === 3 ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Sparkles size={13} className="text-amber-300" />
            <span>Beat 3: What-If</span>
          </button>

          <button
            onClick={() => triggerBeat(4)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              activeBeat === 4 ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
            }`}
          >
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span>Beat 4: Domain Guard</span>
          </button>

          <button
            onClick={() => triggerBeat(5)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              activeBeat === 5 ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
            }`}
          >
            <ArrowRight size={13} className="text-purple-400" />
            <span>Beat 5: Closed-Loop</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-800 mx-1" />

          <button
            onClick={handleReset}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-all hover:bg-red-900/40"
            title="Reset to clean initial state"
          >
            <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
