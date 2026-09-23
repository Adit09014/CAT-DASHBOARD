import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Check, X, AlertTriangle, CloudSun, Radio, ToggleLeft, ToggleRight, Play } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';

interface SafetyChecklistProps {
  taskId?: number;
  safetyStatus?: {
    allowed: boolean;
    warnings: string[];
    blocking_reasons: string[];
  };
  seatbeltFastened: boolean;
  weatherCondition?: string;
  onRefresh: () => void;
}

export function SafetyChecklist({
  taskId = 1,
  safetyStatus,
  seatbeltFastened,
  weatherCondition = 'Clear',
  onRefresh,
}: SafetyChecklistProps) {
  const [starting, setStarting] = useState(false);
  const [startResult, setStartResult] = useState<{ allowed: boolean; message: string } | null>(null);

  const toggleSeatbelt = async () => {
    try {
      await api.post('/telemetry/toggle-seatbelt');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartTask = async () => {
    try {
      setStarting(true);
      const res = await api.post(`/tasks/${taskId}/start`);
      if (res.data.allowed) {
        setStartResult({ allowed: true, message: 'Mission initiated! Pre-task safety protocol passed.' });
      } else {
        setStartResult({ allowed: false, message: `Mission blocked: ${res.data.blocking_reasons.join(', ')}` });
      }
      onRefresh();
    } catch (err: any) {
      setStartResult({ allowed: false, message: err?.response?.data?.detail || 'Safety gate rejected start.' });
    } finally {
      setStarting(false);
    }
  };

  const isBlocked = safetyStatus?.allowed === false;
  const warnings = safetyStatus?.warnings ?? [];
  const blockingReasons = safetyStatus?.blocking_reasons ?? [];

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Pre-Task Gate</div>
          <div className="mt-1 flex items-center gap-2">
            <h3 className="text-xl font-bold text-white">Digital Safety Checklist</h3>
            <span className="text-[11px] font-medium text-slate-400 border border-slate-700 rounded-md px-2 py-0.5">Software Gate Only</span>
          </div>
        </div>
        <StatusBadge
          state={isBlocked ? 'red' : warnings.length ? 'amber' : 'green'}
          label={isBlocked ? 'TASK BLOCKED' : warnings.length ? 'ALLOWED WITH WARNINGS' : 'SAFETY READY'}
        />
      </div>

      {/* Safety Gate Warning/Block Banner */}
      {isBlocked ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-950/40 p-3.5 text-sm text-red-200">
          <ShieldAlert className="mt-0.5 flex-shrink-0 text-red-400" size={18} />
          <div>
            <div className="font-semibold text-red-100">Task Blocked by Safety Gate</div>
            <ul className="mt-1 list-disc pl-4 text-xs space-y-0.5 text-red-300">
              {blockingReasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : warnings.length > 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 flex-shrink-0 text-amber-400" size={16} />
          <div>
            <span className="font-semibold text-amber-100">Advisory Warnings:</span> {warnings.join(' • ')}
          </div>
        </div>
      ) : null}

      {/* 5-Point Checklist */}
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {/* Item 1: Seatbelt */}
        <div className={`flex items-center justify-between rounded-xl border p-3 ${seatbeltFastened ? 'border-emerald-500/20 bg-emerald-950/20' : 'border-red-500/30 bg-red-950/20'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${seatbeltFastened ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {seatbeltFastened ? <Check size={16} /> : <X size={16} />}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Operator Seatbelt</div>
              <div className="text-[11px] text-slate-400">{seatbeltFastened ? 'Fastened & Locked' : 'NOT FASTENED (BLOCKING)'}</div>
            </div>
          </div>
          <button
            onClick={toggleSeatbelt}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all ${
              seatbeltFastened
                ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                : 'border-red-500/40 bg-red-500/20 text-red-300 hover:bg-red-500/30'
            }`}
          >
            {seatbeltFastened ? 'Unbuckle' : 'Fasten Now'}
          </button>
        </div>

        {/* Item 2: Machine Readiness */}
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Check size={16} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">Machine Diagnostics</div>
            <div className="text-[11px] text-slate-400">Hydraulics, Engine & Oil OK</div>
          </div>
        </div>

        {/* Item 3: Safety Perimeter Zone */}
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Radio size={16} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">Proximity Safety Zone</div>
            <div className="text-[11px] text-slate-400">8.0m Perimeter Scanned Clear</div>
          </div>
        </div>

        {/* Item 4: Weather Readiness */}
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
            <CloudSun size={16} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">Weather Readiness</div>
            <div className="text-[11px] text-slate-400">{weatherCondition} · Safe for task</div>
          </div>
        </div>
      </div>

      {/* Start Task Button & Status */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
        <div className="text-xs text-slate-400">
          Digital safety gate verifies mandatory checklists before activating mission workflows.
        </div>
        <button
          onClick={handleStartTask}
          disabled={isBlocked || starting}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all shadow-lg ${
            isBlocked
              ? 'cursor-not-allowed border border-slate-700 bg-slate-800/50 text-slate-500'
              : 'border border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500'
          }`}
        >
          <Play size={14} className={isBlocked ? '' : 'fill-slate-950'} />
          {starting ? 'Verifying...' : isBlocked ? 'TASK BLOCKED' : 'START MISSION'}
        </button>
      </div>

      {startResult && (
        <div className={`mt-3 rounded-xl border p-2.5 text-xs font-medium ${startResult.allowed ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-200' : 'border-red-500/30 bg-red-950/40 text-red-200'}`}>
          {startResult.message}
        </div>
      )}
    </div>
  );
}
