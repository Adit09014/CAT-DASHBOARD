import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  Volume2,
  VolumeX,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Radio,
  Check,
  Activity,
  Layers,
  FileText
} from 'lucide-react';
import { useLanguage } from '../services/i18n';

export interface NarrativeFeatureAttribution {
  feature: string;
  observed_value: string | number;
  safe_limit: string | number;
  contribution_weight: number;
  impact_level: string;
  description: string;
}

export interface NarrativeSOPAction {
  step: number;
  action: string;
  urgency: string;
  target_role: string;
  safety_rule: string;
}

export interface ExplainableNarrativeAlert {
  alert_id?: number | null;
  headline: string;
  threat_level: string;
  confidence_pct: number;
  summary_narrative: string;
  detailed_analysis: string;
  causal_chain: string[];
  feature_attributions: NarrativeFeatureAttribution[];
  immediate_sop_actions: NarrativeSOPAction[];
  preventive_measures: string[];
  audio_briefing_text: string;
  machine_code: string;
  timestamp?: string | null;
  acknowledged?: boolean;
}

interface Props {
  alert: ExplainableNarrativeAlert | null;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge?: (alertId?: number) => void;
  onAskCopilot?: (question: string) => void;
}

export function ExplainableNarrativeAlertModal({
  alert,
  isOpen,
  onClose,
  onAcknowledge,
  onAskCopilot,
}: Props) {
  const { t, currentLang } = useLanguage();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [showDetailedTech, setShowDetailedTech] = useState(false);

  // Reset checked steps whenever a new alert opens
  useEffect(() => {
    if (isOpen) {
      setCompletedSteps({});
      setShowDetailedTech(false);
    } else {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
    }
  }, [isOpen, alert]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !alert) return null;

  const threat = (alert.threat_level || 'CRITICAL').toUpperCase();
  const isCritical = threat === 'CRITICAL' || threat === 'DANGER';
  const isElevated = threat === 'ELEVATED' || threat === 'WARNING';

  // Toggle SOP step completion
  const handleToggleStep = (stepNumber: number) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepNumber]: !prev[stepNumber]
    }));
  };

  const totalSteps = alert.immediate_sop_actions?.length || 0;
  const finishedSteps = Object.values(completedSteps).filter(Boolean).length;
  const allStepsFinished = totalSteps > 0 && finishedSteps === totalSteps;

  // Speech Synthesis playback
  const handleToggleAudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alertFallbackSpeech();
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const textToSpeak = alert.audio_briefing_text || alert.summary_narrative;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Map language code to TTS locale
    const langMap: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      hi: 'hi-IN',
      zh: 'zh-CN',
      pt: 'pt-BR',
    };
    utterance.lang = langMap[currentLang] || 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  const alertFallbackSpeech = () => {
    setIsPlayingAudio(prev => !prev);
  };

  const handleAskCopilotClick = () => {
    if (onAskCopilot) {
      const q = `Explain immediate safety actions for this alert: ${alert.headline}. How do I mitigate the ${alert.feature_attributions?.[0]?.feature || 'risk'}?`;
      onAskCopilot(q);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[var(--bg-surface)] border border-white/15 rounded-2xl shadow-2xl overflow-hidden cursor-default"
        style={{
          boxShadow: isCritical
            ? '0 20px 50px -10px rgba(225, 29, 72, 0.35), 0 0 30px rgba(225, 29, 72, 0.15)'
            : isElevated
            ? '0 20px 50px -10px rgba(245, 158, 11, 0.30), 0 0 25px rgba(245, 158, 11, 0.12)'
            : '0 20px 50px -10px rgba(16, 185, 129, 0.25)'
        }}
      >
        {/* ── Modal Header ────────────────────────────────────────── */}
        <div
          className={`px-5 py-4 border-b flex items-start justify-between gap-4 ${
            isCritical
              ? 'status-banner-critical'
              : isElevated
              ? 'status-banner-elevated'
              : 'status-banner-safe'
          }`}
        >
          <div className="flex items-start gap-3.5 flex-1 min-w-0 pr-2">
            <div
              className={`p-2.5 rounded-xl border mt-0.5 shrink-0 ${
                isCritical
                  ? 'bg-[var(--red-dim)] border-[var(--red-border)] text-[var(--red)] animate-pulse'
                  : isElevated
                  ? 'bg-[var(--yellow-dim)] border-[var(--yellow-border)] text-[var(--yellow)]'
                  : 'bg-[var(--green-dim)] border-[var(--green-border)] text-[var(--green)]'
              }`}
            >
              <ShieldAlert size={24} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span
                  className={`chip text-[11px] font-black uppercase tracking-wider py-0.5 px-2.5 ${
                    isCritical ? 'chip-red' : isElevated ? 'chip-yellow' : 'chip-green'
                  }`}
                >
                  {threat}
                </span>

                <span className="chip chip-zinc font-mono text-[10px]">
                  {alert.machine_code}
                </span>

                <span className={`text-xs font-mono font-bold ${isCritical ? 'text-[var(--red)]' : isElevated ? 'text-[var(--yellow)]' : 'text-[var(--green)]'}`}>
                  {alert.confidence_pct}% {t('model_probability', 'Model Confidence')}
                </span>

                {alert.alert_id && (
                  <span className="text-[11px] text-slate-400 font-mono font-semibold">
                    #{alert.alert_id}
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug break-words">
                {alert.headline}
              </h2>
            </div>
          </div>

          {/* High-visibility Close Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/90 hover:bg-rose-600 text-white border border-white/25 hover:border-rose-400 shadow-xl transition-all cursor-pointer group"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X size={22} strokeWidth={2.5} className="text-white group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* ── Modal Body (Scrollable) ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs sm:text-sm">

          {/* 1. Voice In-Cab Briefing Banner */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleAudio}
                className={`btn py-2 px-3.5 text-xs font-semibold flex items-center gap-2 rounded-lg transition-all ${
                  isPlayingAudio
                    ? 'btn-danger text-white animate-pulse shadow-lg'
                    : 'btn-primary shadow'
                }`}
              >
                {isPlayingAudio ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span>{isPlayingAudio ? t('stop_briefing', 'Stop Audio') : t('play_briefing', 'Play Audio Briefing')}</span>
              </button>

              <div className="hidden sm:flex flex-col">
                <span className="text-[11px] text-[var(--text-muted)] font-medium">
                  {t('voice_briefing', 'Voice Briefing (TTS)')}
                </span>
                <span className="text-xs text-[var(--text-secondary)] line-clamp-1 italic">
                  "{alert.audio_briefing_text}"
                </span>
              </div>
            </div>

            {isPlayingAudio && (
              <div className="flex items-center gap-1">
                <span className="w-1 h-4 bg-[var(--yellow)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-6 bg-[var(--yellow)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-3 bg-[var(--yellow)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="w-1 h-5 bg-[var(--yellow)] rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
              </div>
            )}
          </div>

          {/* 2. Executive Narrative Summary */}
          <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-default)] relative overflow-hidden">
            <div
              className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                isCritical ? 'bg-[var(--red)]' : isElevated ? 'bg-[var(--yellow)]' : 'bg-[var(--green)]'
              }`}
            />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <FileText size={13} className="text-[var(--yellow)]" />
                {t('executive_summary', 'Executive Narrative Summary')}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Real-Time'}
              </span>
            </div>
            <p className="text-[var(--text-primary)] text-xs sm:text-sm leading-relaxed font-medium">
              {alert.summary_narrative}
            </p>

            {/* Expandable Technical Analysis */}
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setShowDetailedTech(!showDetailedTech)}
                className="text-xs text-[var(--blue)] hover:underline font-semibold flex items-center gap-1"
              >
                <span>{showDetailedTech ? 'Hide' : 'View'} {t('incident_details', 'Technical Telemetry Breakdown')}</span>
                <ChevronRight size={12} className={`transform transition-transform ${showDetailedTech ? 'rotate-90' : ''}`} />
              </button>

              {showDetailedTech && (
                <div className="mt-2.5 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed font-mono">
                  {alert.detailed_analysis}
                </div>
              )}
            </div>
          </div>

          {/* 3. Causal Reasoning Progression Chain */}
          {alert.causal_chain && alert.causal_chain.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                <Layers size={13} className="text-[var(--blue)]" />
                {t('causal_chain', 'Causal Reasoning Progression')}
              </div>

              <div className="grid grid-cols-1 gap-2">
                {alert.causal_chain.map((node, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-subtle)] transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[10px] font-bold text-[var(--text-brand)] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 text-xs text-[var(--text-secondary)]">
                      {node}
                    </div>
                    {idx < alert.causal_chain.length - 1 && (
                      <ArrowRight size={13} className="text-[var(--text-muted)] hidden sm:block mt-1 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Ranked Feature Risk Drivers & XAI Attribution */}
          {alert.feature_attributions && alert.feature_attributions.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Activity size={13} className="text-amber-400" />
                  {t('feature_attribution', 'Feature Risk Drivers & XAI Attribution')}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Logistic & CatBoost Weights</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {alert.feature_attributions.map((attr, idx) => {
                  const isHighImpact = attr.impact_level === 'CRITICAL' || attr.impact_level === 'HIGH';
                  const isSingle = alert.feature_attributions.length === 1;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all flex flex-col justify-between ${
                        isSingle ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-semibold text-[var(--text-primary)] text-xs truncate">
                            {attr.feature}
                          </span>
                          <span
                            className={`chip text-[9px] font-mono font-bold py-0.5 px-1.5 ${
                              isHighImpact ? 'chip-red' : 'chip-yellow'
                            }`}
                          >
                            +{attr.contribution_weight}
                          </span>
                        </div>

                        <p className="text-[11px] text-[var(--text-muted)] leading-normal mb-2">
                          {attr.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
                        <span>{t('observed_val', 'Observed')}: <strong className="text-[var(--text-secondary)] font-bold">{attr.observed_value}</strong></span>
                        <span>{t('safe_limit', 'Safe Limit')}: <strong className="text-[var(--text-muted)]">{attr.safe_limit}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. In-Cab Emergency SOP Checklist */}
          {alert.immediate_sop_actions && alert.immediate_sop_actions.length > 0 && (
            <div className={`p-4 sm:p-5 rounded-xl border ${
              isCritical
                ? 'status-banner-critical'
                : isElevated
                ? 'status-banner-elevated'
                : 'bg-[var(--bg-raised)] border-[var(--border-default)]'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className={isCritical ? 'text-[var(--red)]' : isElevated ? 'text-[var(--yellow)]' : 'text-[var(--text-muted)]'} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    isCritical ? 'text-[var(--red)]' : isElevated ? 'text-[var(--yellow)]' : 'text-[var(--text-secondary)]'
                  }`}>
                    {t('sop_checklist', 'Immediate In-Cab SOP Checklist')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className={allStepsFinished ? 'text-[var(--green)] font-bold' : 'text-[var(--text-muted)]'}>
                    {finishedSteps} / {totalSteps} {t('sop_progress', 'Completed')}
                  </span>
                  {allStepsFinished && (
                    <span className="chip chip-green text-[10px] flex items-center gap-1 font-bold">
                      <Check size={11} /> {t('all_sop_completed', 'Verified')}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {alert.immediate_sop_actions.map((act) => {
                  const isChecked = !!completedSteps[act.step];
                  return (
                    <div
                      key={act.step}
                      onClick={() => handleToggleStep(act.step)}
                      className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'bg-[var(--green-dim)] border-[var(--green-border)] text-[var(--green)]'
                          : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-default)] text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0 text-[var(--text-muted)]">
                        {isChecked ? (
                          <CheckCircle2 size={16} className="text-[var(--green)]" />
                        ) : (
                          <Circle size={16} className="hover:text-[var(--yellow)] transition-colors" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-bold font-mono py-0.2 px-1 rounded ${
                            act.urgency === 'IMMEDIATE'
                              ? 'bg-[var(--red-dim)] text-[var(--red)]'
                              : act.urgency === 'MANDATORY'
                              ? 'bg-[var(--yellow-dim)] text-[var(--yellow)]'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                          }`}>
                            {act.urgency}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            {act.target_role} · {act.safety_rule}
                          </span>
                        </div>
                        <p className={`text-xs ${isChecked ? 'line-through opacity-70' : 'font-medium'}`}>
                          {act.action}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. Preventive Fleet Measures */}
          {alert.preventive_measures && alert.preventive_measures.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-subtle)]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                {t('preventive_measures', 'Preventive Fleet Recommendations')}
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-[var(--text-secondary)]">
                {alert.preventive_measures.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* ── Modal Footer ────────────────────────────────────────── */}
        <div className="px-5 py-3.5 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleAskCopilotClick}
            className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 hover:border-[var(--cat-yellow)] text-yellow-300"
          >
            <Sparkles size={14} className="text-[var(--cat-yellow)]" />
            <span>{t('ask_copilot_about_alert', 'Ask Copilot About This Alert')}</span>
          </button>

          <div className="flex items-center gap-2">
            {alert.acknowledged ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
                <Check size={14} className="text-emerald-400" />
                <span>Verified & Acknowledged</span>
              </div>
            ) : onAcknowledge && alert.alert_id ? (
              <button
                onClick={() => {
                  onAcknowledge(alert.alert_id || undefined);
                  onClose();
                }}
                className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 hover:border-emerald-500 text-emerald-300"
              >
                <Check size={14} />
                <span>Acknowledge Incident</span>
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="btn btn-secondary text-xs py-2 px-4 border-slate-600 hover:border-white text-white font-semibold flex items-center gap-1.5"
            >
              <X size={14} />
              <span>{t('close_narrative', 'Close Narrative')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function ChevronRight({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
