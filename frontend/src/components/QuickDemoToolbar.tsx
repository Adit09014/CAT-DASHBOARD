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
    <div className="mb-6 rounded-2xl border border-[var(--yellow-border)] bg-[var(--bg-surface)] p-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--cat-yellow)] text-slate-950 font-black text-xs shadow-sm">CAT</span>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-brand)]">3-Minute Judge Demo Director</div>
            <div className="text-[11px] text-[var(--text-muted)]">Jump directly to any story beat to guarantee a flawless live presentation</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => triggerBeat(1)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              activeBeat === 1 ? 'border-[var(--yellow)] bg-[var(--yellow-dim)] text-[var(--text-brand)] font-bold' : 'border-[var(--border-default)] bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <ShieldAlert size={13} className="text-[var(--yellow)]" />
            <span>Beat 1: Safety Gate</span>
          </button>

          <button
            onClick={() => triggerBeat(2)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              activeBeat === 2 ? 'border-[var(--yellow)] bg-[var(--yellow-dim)] text-[var(--text-brand)] font-bold' : 'border-[var(--border-default)] bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <Activity size={13} className="text-[var(--blue)]" />
            <span>Beat 2: Idle Drift</span>
          </button>

          <button
            onClick={() => triggerBeat(3)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              activeBeat === 3 ? 'border-[var(--yellow)] bg-[var(--yellow-dim)] text-[var(--text-brand)] font-bold' : 'border-[var(--border-default)] bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <Sparkles size={13} className="text-[var(--yellow)]" />
            <span>Beat 3: What-If</span>
          </button>

          <button
            onClick={() => triggerBeat(4)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              activeBeat === 4 ? 'border-[var(--yellow)] bg-[var(--yellow-dim)] text-[var(--text-brand)] font-bold' : 'border-[var(--border-default)] bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <CheckCircle2 size={13} className="text-[var(--green)]" />
            <span>Beat 4: Domain Guard</span>
          </button>

          <button
            onClick={() => triggerBeat(5)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              activeBeat === 5 ? 'border-[var(--yellow)] bg-[var(--yellow-dim)] text-[var(--text-brand)] font-bold' : 'border-[var(--border-default)] bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <ArrowRight size={13} className="text-purple-400" />
            <span>Beat 5: Closed-Loop</span>
          </button>

          <div className="h-5 w-[1px] bg-[var(--border-default)] mx-1" />

          <button
            onClick={handleReset}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--red-border)] bg-[var(--red-dim)] px-3 py-1.5 text-xs font-medium text-[var(--red)] transition-all hover:bg-[var(--red-surface)]"
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
