import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BrainCircuit, Mic, MicOff, PlayCircle, RefreshCcw, ShieldAlert, Sparkles, Target } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../services/auth';
import { Panel } from '../components/Panel';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';

type SafetySimulation = {
  state: 'NORMAL' | 'CAUTION' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  advisory: string;
  seconds_to_conflict: number | null;
  minimum_distance_meters: number;
  trajectory: Array<{
    second: number;
    machine: { x: number; y: number; velocity: number; heading: number };
    object: { x: number; y: number; velocity: number; heading: number };
    distance_meters: number;
  }>;
  label: string;
};

export function OperatorDashboardPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [copilotQuestion, setCopilotQuestion] = useState('Why did I get this warning?');
  const [copilotAnswer, setCopilotAnswer] = useState('');
  const [trainingQuery, setTrainingQuery] = useState('How do I reduce excavator idle time?');
  const [trainingResult, setTrainingResult] = useState<string>('');
  const [safetySimulation, setSafetySimulation] = useState<SafetySimulation | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const dashboard = useQuery({
    queryKey: ['operator-dashboard'],
    queryFn: async () => (await api.get('/operator/dashboard')).data,
  });

  useEffect(() => {
    if (dashboard.data?.ai_insight?.message) {
      setCopilotAnswer(dashboard.data.ai_insight.message as string);
    }
  }, [dashboard.data]);

  useEffect(() => {
    setVoiceSupported(typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window));
    const SpeechRecognitionCtor = (window as Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition
      ?? (window as Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      recognitionRef.current = new SpeechRecognitionCtor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript as string;
        setCopilotQuestion(transcript);
        setVoiceListening(false);
      };
      recognitionRef.current.onend = () => setVoiceListening(false);
    }
  }, []);

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const trajectorySvg = useMemo(() => {
    const points = safetySimulation?.trajectory ?? [];
    return points.map((point, index) => {
      const machineX = 24 + index * 18;
      const machineY = 120 - point.machine.y * 0.25;
      const objectX = 24 + index * 18;
      const objectY = 120 - point.object.y * 0.25;
      const lineY = 120 - point.distance_meters * 3;
      return { index, machineX, machineY, objectX, objectY, lineY, point };
    });
  }, [safetySimulation]);

  const safetyState = dashboard.data?.safety_status?.allowed === false ? 'red' : dashboard.data?.safety_status?.warnings?.length ? 'amber' : 'green';
  const idle = dashboard.data?.current_telemetry?.idle_time ?? 0;
  const baseline = dashboard.data?.machine_health?.baseline_idle ?? 0;
  const ratio = baseline ? (idle / baseline).toFixed(1) : '0.0';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">CAT Guardian</div>
          <h1 className="page-title">Machine {dashboard.data?.current_machine?.machine_code ?? 'EXC-001'}</h1>
          <p className="page-copy">Safety first, then prediction, then simulation. Built for the field, not a generic dashboard.</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge state={safetyState} label={dashboard.data?.safety_status?.allowed === false ? 'Task Blocked' : 'Safety Ready'} />
          <button className="secondary-button" onClick={() => logout()}>Logout</button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Panel title="Today’s Task">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold text-white">{dashboard.data?.current_task?.task_type ?? 'Excavation'}</h2>
                <StatusBadge state={safetyState} label={dashboard.data?.safety_status?.allowed === false ? 'Task Blocked' : 'Safety Check Passed'} />
              </div>
              <p className="max-w-2xl text-slate-300">{dashboard.data?.current_task?.description ?? 'Foundation cut on Lot A'}</p>
              {dashboard.data?.safety_status?.blocking_reasons?.length ? (
                <div className="alert-red">
                  <ShieldAlert size={16} />
                  <span>{dashboard.data.safety_status.blocking_reasons.join('. ')}</span>
                </div>
              ) : null}
            </div>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard label="Safety" value={dashboard.data?.safety_status?.allowed === false ? 'Blocked' : 'Ready'} delta={dashboard.data?.safety_status?.warnings?.length ? 'Warnings' : 'Clear'} footnote="Digital workflow gate only." />
            <MetricCard label="Task Prediction" value={`${dashboard.data?.task_prediction?.predicted_duration ?? 0} min`} delta={dashboard.data?.task_prediction?.label ?? 'Estimated'} footnote="Model-based estimate, not a guarantee." />
          </div>

          <Panel title="Machine Telemetry">
            <div className="telemetry-grid">
              <div>
                <div className="telemetry-label">Idle vs baseline</div>
                <div className="telemetry-value">{idle.toFixed(0)} min</div>
                <div className="telemetry-caption">Your normal idle time: {baseline.toFixed(0)} min</div>
                <div className="telemetry-caption strong">{ratio}× above your baseline</div>
              </div>
              <div className="telemetry-bars" aria-label="Idle time comparison">
                <div className="telemetry-bar baseline" style={{ height: `${Math.max(18, baseline)}%` }} />
                <div className="telemetry-bar current" style={{ height: `${Math.max(18, idle)}%` }} />
              </div>
            </div>
          </Panel>

          <Panel title="AI Insight">
            <div className="insight-card">
              <BrainCircuit className="text-amber-300" size={22} />
              <div>
                <div className="text-lg font-semibold text-white">{dashboard.data?.ai_insight?.title ?? 'Operator baseline intelligence'}</div>
                <div className="mt-1 text-slate-300">{dashboard.data?.ai_insight?.message ?? 'Waiting for telemetry.'}</div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="What-If Mission Simulator">
            <div className="whatif-card">
              <div className="whatif-column">
                <div className="whatif-label">Current</div>
                <div className="whatif-number">{dashboard.data?.what_if?.current?.duration ?? 74} min</div>
                <div className="whatif-sub">{dashboard.data?.what_if?.current?.fuel ?? 19.2} L</div>
                <StatusBadge state="amber" label={dashboard.data?.what_if?.current?.risk ?? 'Medium Risk'} />
              </div>
              <ArrowRight className="self-center text-slate-500" size={28} />
              <div className="whatif-column highlight">
                <div className="whatif-label">Simulated</div>
                <div className="whatif-number">{dashboard.data?.what_if?.simulated?.duration ?? 66} min</div>
                <div className="whatif-sub">{dashboard.data?.what_if?.simulated?.fuel ?? 16.8} L</div>
                <StatusBadge state="green" label={dashboard.data?.what_if?.simulated?.risk ?? 'Lower Risk'} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3">Time: {dashboard.data?.what_if?.deltas?.duration ?? -8} min</div>
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3">Fuel: {dashboard.data?.what_if?.deltas?.fuel ?? -2.4} L</div>
            </div>
            <p className="mt-4 text-sm text-slate-400">{dashboard.data?.what_if?.label ?? 'Model-based estimate. Actual results may vary.'}</p>
          </Panel>

          <Panel title="Predictive Safety">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="primary-button"
                  onClick={async () => {
                    const response = await api.post('/safety/simulate', { task_id: dashboard.data?.current_task?.id ?? 1, horizon_seconds: 30, threshold_meters: 8 });
                    setSafetySimulation(response.data);
                  }}
                >
                  <ShieldAlert size={16} />Simulate proximity
                </button>
                <button
                  className="secondary-button"
                  onClick={async () => {
                    await api.post('/demo/reset');
                    await queryClient.invalidateQueries({ queryKey: ['operator-dashboard'] });
                    setSafetySimulation(null);
                  }}
                >
                  <RefreshCcw size={16} />Reset demo
                </button>
              </div>

              <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Trajectory</div>
                    <div className="mt-1 text-lg font-semibold text-white">{safetySimulation?.state ?? 'NORMAL'}</div>
                  </div>
                  <StatusBadge state={safetySimulation?.state === 'CRITICAL' ? 'red' : safetySimulation?.state === 'WARNING' ? 'amber' : safetySimulation?.state === 'CAUTION' ? 'blue' : 'green'} label={safetySimulation?.state ?? 'NORMAL'} />
                </div>
                <svg viewBox="0 0 380 160" className="mt-4 h-40 w-full">
                  <defs>
                    <linearGradient id="machinePath" x1="0" x2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="380" height="160" rx="18" fill="rgba(15,23,42,0.32)" />
                  {trajectorySvg.length ? trajectorySvg.map(({ index, machineX, machineY, objectX, objectY, lineY, point }) => (
                    <g key={index}>
                      <line x1={machineX} y1={machineY} x2={objectX} y2={objectY} stroke="rgba(245,158,11,0.25)" strokeDasharray="3 3" />
                      <circle cx={machineX} cy={machineY} r={4} fill="#3b82f6" />
                      <circle cx={objectX} cy={objectY} r={4} fill="#f59e0b" />
                      {index % 6 === 0 ? <text x={machineX + 4} y={lineY} fill="#cbd5e1" fontSize="10">{point.second}s</text> : null}
                    </g>
                  )) : (
                    <text x="22" y="82" fill="#94a3b8" fontSize="13">Run a simulation to preview machine and object trajectories.</text>
                  )}
                </svg>
                <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm text-slate-300">
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3">Conflict: {safetySimulation?.seconds_to_conflict ?? 'N/A'} sec</div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3">Min distance: {safetySimulation?.minimum_distance_meters?.toFixed(1) ?? 'N/A'} m</div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3">{safetySimulation?.label ?? 'Model-based trajectory simulation'}</div>
                </div>
                <p className="mt-3 text-sm text-slate-400">{safetySimulation?.advisory ?? 'Predictive safety simulates future positions without controlling the machine.'}</p>
              </div>
            </div>
          </Panel>

          <Panel title="Training Recommendation">
            <div className="space-y-4">
              <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex items-center gap-3 text-amber-200"><Sparkles size={16} />{dashboard.data?.training_recommendation?.title ?? 'Idle Optimization Training'}</div>
                <p className="mt-2 text-sm text-amber-50/85">{dashboard.data?.training_recommendation?.description ?? 'Recommended because excessive idle was detected.'}</p>
              </div>
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const response = await api.post('/training/search', { query: trainingQuery, operator_id: user?.id, machine_type: dashboard.data?.current_machine?.machine_type });
                  setTrainingResult(response.data.allowed ? `${response.data.reason} ✓` : response.data.reason);
                }}
              >
                <label className="field">
                  <span>Ask for training</span>
                  <input value={trainingQuery} onChange={(event) => setTrainingQuery(event.target.value)} />
                </label>
                <button className="primary-button" type="submit"><Target size={16} />Search training</button>
              </form>
              <div className="text-sm text-slate-300">{trainingResult || 'Domain guard validates whether the request is operator training related.'}</div>
            </div>
          </Panel>

          <Panel title="Machine-Aware Copilot">
            <div className="space-y-3">
              <textarea className="copilot-input" value={copilotQuestion} onChange={(event) => setCopilotQuestion(event.target.value)} rows={3} />
              <div className="flex flex-wrap gap-3">
                <button
                  className="primary-button"
                  onClick={async () => {
                    const response = await api.post('/copilot/ask', { question: copilotQuestion });
                    setCopilotAnswer(response.data.answer);
                    speak(response.data.answer);
                  }}
                >
                  <PlayCircle size={16} />Ask copilot
                </button>
                <button
                  className="secondary-button"
                  disabled={!voiceSupported || !recognitionRef.current}
                  onClick={() => {
                    if (!recognitionRef.current) return;
                    if (voiceListening) {
                      recognitionRef.current.stop();
                      setVoiceListening(false);
                      return;
                    }
                    recognitionRef.current.start();
                    setVoiceListening(true);
                  }}
                >
                  {voiceListening ? <MicOff size={16} /> : <Mic size={16} />} {voiceListening ? 'Stop voice' : 'Push to talk'}
                </button>
                <button className="secondary-button" onClick={async () => {
                  await api.post('/telemetry/next-tick');
                  await queryClient.invalidateQueries({ queryKey: ['operator-dashboard'] });
                }}>
                  <RefreshCcw size={16} />Advance simulation
                </button>
              </div>
              <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{voiceSupported ? 'Voice input available' : 'Voice not available in this browser'}</div>
              <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-200">{copilotAnswer || 'Copilot response appears here.'}</div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
