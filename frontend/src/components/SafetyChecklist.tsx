import React, { useState } from 'react';
import { Check, X, ShieldAlert, AlertTriangle, CloudSun, Radio, Play } from 'lucide-react';
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
        setStartResult({ allowed: true, message: 'Mission started successfully.' });
      } else {
        setStartResult({ allowed: false, message: res.data.blocking_reasons.join(', ') });
      }
      onRefresh();
    } catch (err: any) {
      setStartResult({ allowed: false, message: err?.response?.data?.detail || 'Start failed.' });
    } finally {
      setStarting(false);
    }
  };

  const isBlocked = safetyStatus?.allowed === false;
  const warnings = safetyStatus?.warnings ?? [];
  const blockingReasons = safetyStatus?.blocking_reasons ?? [];

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <div className="label-caps">Compliance Verification</div>
          <h2 className="section-title mt-0.5">Pre-Task Safety Gate</h2>
        </div>
        <StatusBadge
          state={isBlocked ? 'red' : warnings.length ? 'amber' : 'green'}
          label={isBlocked ? 'GATE LOCKED' : warnings.length ? 'WARNINGS' : 'READY'}
        />
      </div>

      {/* Alert banner if blocked */}
      {isBlocked && (
        <div className="alert alert-danger">
          <ShieldAlert size={16} className="text-[var(--red)] flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-white">Start Blocked: </span>
            {blockingReasons.join(' · ')}
          </div>
        </div>
      )}

      {/* Alert banner if warning */}
      {!isBlocked && warnings.length > 0 && (
        <div className="alert alert-warn">
          <AlertTriangle size={15} className="text-[var(--yellow)] flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-white">Advisories: </span>
            {warnings.join(' · ')}
          </div>
        </div>
      )}

      {/* 4-Item Check Grid */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {/* Seatbelt Check */}
        <div className="card-raised flex items-center justify-between p-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center ${
                seatbeltFastened
                  ? 'bg-emerald-500/15 text-[var(--green)]'
                  : 'bg-red-500/15 text-[var(--red)]'
              }`}
            >
              {seatbeltFastened ? <Check size={15} /> : <X size={15} />}
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">Seatbelt</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {seatbeltFastened ? 'Fastened' : 'Disengaged'}
              </div>
            </div>
          </div>
          <button
            onClick={toggleSeatbelt}
            className={`btn text-xs py-1 px-2.5 ${
              seatbeltFastened ? 'btn-secondary' : 'btn-danger'
            }`}
          >
            {seatbeltFastened ? 'Release' : 'Fasten'}
          </button>
        </div>

        {/* Machine Diagnostics */}
        <div className="card-raised flex items-center gap-2.5 p-3">
          <div className="w-7 h-7 rounded-md bg-emerald-500/15 text-[var(--green)] flex items-center justify-center">
            <Check size={15} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">Machine Health</div>
            <div className="text-[11px] text-[var(--text-muted)]">Hydraulics & Engine OK</div>
          </div>
        </div>

        {/* Proximity Perimeter */}
        <div className="card-raised flex items-center gap-2.5 p-3">
          <div className="w-7 h-7 rounded-md bg-emerald-500/15 text-[var(--green)] flex items-center justify-center">
            <Radio size={15} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">Proximity Zone</div>
            <div className="text-[11px] text-[var(--text-muted)]">Perimeter Clear</div>
          </div>
        </div>

        {/* Weather Status */}
        <div className="card-raised flex items-center gap-2.5 p-3">
          <div className="w-7 h-7 rounded-md bg-sky-500/15 text-sky-400 flex items-center justify-center">
            <CloudSun size={15} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">Weather</div>
            <div className="text-[11px] text-[var(--text-muted)]">{weatherCondition}</div>
          </div>
        </div>
      </div>

      {/* Start Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
        <span className="text-xs text-[var(--text-muted)]">
          {isBlocked ? 'Resolve blocking items to start' : 'All mandatory checks satisfied'}
        </span>
        <button
          onClick={handleStartTask}
          disabled={isBlocked || starting}
          className={`btn text-xs py-2 px-4 gap-2 ${
            isBlocked ? 'opacity-40 cursor-not-allowed btn-secondary' : 'btn-primary'
          }`}
        >
          <Play size={13} className={isBlocked ? '' : 'fill-black'} />
          <span>{starting ? 'Starting...' : 'Start Mission'}</span>
        </button>
      </div>

      {startResult && (
        <div className={`alert ${startResult.allowed ? 'alert-ok' : 'alert-danger'} text-xs`}>
          {startResult.message}
        </div>
      )}
    </div>
  );
}
