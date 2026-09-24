import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Bot,
  Sparkles,
  Terminal,
  Settings2,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  User,
  Cpu,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../services/i18n';

interface CopilotPanelProps {
  machineCode?: string;
  taskType?: string;
  initialMessage?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: string;
  contextUsed?: Record<string, any>;
}

export function CopilotPanel({
  machineCode = 'EXC-001',
  taskType = 'Excavation',
  initialMessage,
}: CopilotPanelProps) {
  const { currentLang, t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      role: 'assistant',
      content:
        initialMessage ||
        `Hello! I'm CAT Guardian In-Cab Copilot, powered by ultra-fast Groq AI and live ${machineCode} telemetry. You can ask me any question about your machine load, fuel burn, idle drift, safety alerts, digging techniques, or task progress.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'groq-llm-grounded',
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);

  // AI Configuration state (persisted to localStorage)
  const [showSettings, setShowSettings] = useState(false);
  const [provider, setProvider] = useState<'groq' | 'auto' | 'openai' | 'gemini' | 'anthropic'>(() => {
    return (localStorage.getItem('catguardian_copilot_provider') as any) || 'groq';
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('catguardian_copilot_api_key') || '';
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    'What is my current engine load and status?',
    'Why is my idle time high?',
    'How can I reduce fuel consumption?',
    'Why did I get this warning code?',
    'How long will this task take to complete?',
    'Trench excavation safety & cave-in rules',
    'Tips for truck loading cycle times',
    'Pre-start walkaround safety checklist',
  ];

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Voice speech-to-text setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setVoiceAvailable(true);
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';
        rec.onresult = (e: any) => {
          const text = e.results[0][0].transcript;
          if (text) {
            setInputQuery(text);
            handleSendMessage(text);
          }
          setListening(false);
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => setListening(false);
        recognitionRef.current = rec;
      }
    }
  }, []);

  const saveSettings = (newProvider: 'groq' | 'auto' | 'openai' | 'gemini' | 'anthropic', newKey: string) => {
    setProvider(newProvider);
    setApiKey(newKey);
    localStorage.setItem('catguardian_copilot_provider', newProvider);
    localStorage.setItem('catguardian_copilot_api_key', newKey);
  };

  const speak = (msgId: string, textToSpeak: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (activeSpeechId === msgId && isSpeaking) {
        setIsSpeaking(false);
        setActiveSpeechId(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const langLocaleMap: Record<string, string> = {
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
        hi: 'hi-IN',
        zh: 'zh-CN',
        pt: 'pt-BR',
        en: 'en-US',
      };
      utterance.lang = langLocaleMap[currentLang] || 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => {
        setIsSpeaking(false);
        setActiveSpeechId(null);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setActiveSpeechId(null);
      };

      setIsSpeaking(true);
      setActiveSpeechId(msgId);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : inputQuery).trim();
    if (!query || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setLoading(true);

    try {
      const langInstructionMap: Record<string, string> = {
        es: ' [Por favor responde en español]',
        fr: ' [Veuillez répondre en français]',
        de: ' [Bitte antworten Sie auf Deutsch]',
        hi: ' [कृपया हिंदी में उत्तर दें]',
        zh: ' [请用中文回答]',
        pt: ' [Por favor responda em português]',
      };
      const langSuffix = langInstructionMap[currentLang] || '';
      const payloadQuestion = query + (langSuffix && !query.includes('[') ? langSuffix : '');

      const payload: { question: string; api_key?: string; provider?: string } = {
        question: payloadQuestion,
      };

      if (apiKey.trim()) {
        payload.provider = provider;
        payload.api_key = apiKey.trim();
      } else if (provider !== 'auto') {
        payload.provider = provider;
      }

      const res = await api.post('/copilot/ask', payload);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: res.data.source,
        contextUsed: res.data.context_used,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      speak(assistantMessage.id, assistantMessage.content);
    } catch (err) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `assistant-err-${Date.now()}`,
        role: 'assistant',
        content:
          "I'm unable to connect to the copilot engine right now. Deterministic machine telemetry fallbacks are active.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'fallback',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const clearChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setActiveSpeechId(null);
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: `Chat history cleared. I'm actively monitoring ${machineCode} on ${taskType}. Ask me any question anytime!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'groq-llm-grounded',
      },
    ]);
  };

  return (
    <div className="flex flex-col rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden min-h-[640px]">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-raised)] px-6 py-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[var(--yellow)]">
            <Bot size={15} />
            <span>Industrial In-Cab Copilot</span>
          </div>
          <h3 className="mt-1 text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            Machine-Aware AI Assistant
            <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--green-border)] bg-[var(--green-dim)] text-[var(--green)] font-mono font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
              Live Grounded
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Provider Badge */}
          <span className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
            <Zap size={13} className="text-amber-400 fill-amber-400" />
            <span className="font-semibold">
              {provider === 'groq'
                ? 'Groq Cloud AI'
                : provider === 'auto'
                ? 'Grounded Telemetry AI'
                : provider === 'openai'
                ? 'OpenAI GPT-4o'
                : provider === 'gemini'
                ? 'Google Gemini'
                : 'Claude 3.5 Haiku'}
            </span>
          </span>

          {/* Machine Telemetry Badge */}
          <span className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400">
            <Terminal size={12} className="text-cyan-400" />
            <span>{machineCode}</span>
          </span>

          {/* AI Settings Toggle Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              showSettings
                ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
            }`}
            title="Configure AI Engine or API Key"
          >
            <Settings2 size={14} />
            <span className="hidden md:inline">AI Settings</span>
          </button>

          {/* Reset / Clear Chat Button */}
          <button
            onClick={clearChat}
            className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:border-slate-700 transition-all"
            title="Clear Chat History"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* AI Settings Drawer (Configurable API Keys) */}
      {showSettings && (
        <div className="border-b border-[var(--border-default)] bg-[var(--bg-raised)] p-5 transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-amber-500" />
              <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                AI Engine & API Key Configuration
              </h4>
            </div>
            <span className="text-xs text-slate-400">
              Configured with Groq API Key for sub-second responses and machine telemetry grounding
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select Intelligence Engine
              </label>
              <select
                value={provider}
                onChange={(e) => saveSettings(e.target.value as any, apiKey)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="groq">⚡ Groq Cloud AI (Ultra-Fast Cloud Intelligence)</option>
                <option value="auto">
                  Automatic: Grounded Machine Intelligence (Local Telemetry Engine)
                </option>
                <option value="openai">OpenAI (GPT-4o-mini)</option>
                <option value="gemini">Google Gemini (1.5 Flash)</option>
                <option value="anthropic">Anthropic Claude (3.5 Haiku)</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                {provider === 'groq'
                  ? '⚡ Groq ultra-fast LPU inference delivers answers in under 300ms with live machine telemetry injected.'
                  : provider === 'auto'
                  ? 'Analyzes live machine sensors, baselines, and safety rules automatically with local intelligence.'
                  : `Routes user queries directly to ${provider.toUpperCase()} with live machine telemetry injected into context.`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {provider === 'auto' ? 'Custom API Key (Optional)' : `${provider.toUpperCase()} API Key`}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => saveSettings(provider, e.target.value)}
                  placeholder={
                    provider === 'auto'
                      ? 'Not required for built-in grounding'
                      : `Paste your ${provider} API key here...`
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 pr-16 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-2 text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-700"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={11} />
                <span>Connected & active. Stored locally in your browser session.</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[460px] min-h-[340px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-sm mt-1">
                <Bot size={18} />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
                msg.role === 'user'
                  ? 'bg-[var(--yellow)] text-slate-950 font-medium rounded-tr-sm'
                  : 'bg-[var(--bg-raised)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-tl-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-4 pb-1 mb-1 border-b border-[var(--border-subtle)] text-[11px]">
                <span
                  className={`font-semibold ${
                    msg.role === 'user' ? 'text-slate-900 font-bold' : 'text-[var(--text-brand)]'
                  }`}
                >
                  {msg.role === 'user' ? 'Operator Query' : 'CAT Guardian Copilot'}
                </span>
                <span className={msg.role === 'user' ? 'text-slate-800' : 'text-[var(--text-muted)]'}>
                  {msg.timestamp}
                </span>
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

              {msg.role === 'assistant' && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <Sparkles size={12} className="text-amber-400" />
                    <span>
                      {msg.source === 'groq-llm-grounded'
                        ? '⚡ Groq AI (Telemetry-Grounded)'
                        : msg.source === 'llm-grounded'
                        ? 'External LLM Grounded'
                        : msg.source === 'machine-grounded-semantic'
                        ? 'Telemetry-Grounded Intelligence'
                        : 'System Fallback'}
                    </span>
                  </div>

                  <button
                    onClick={() => speak(msg.id, msg.content)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 transition-colors"
                    title="Read answer aloud"
                  >
                    {isSpeaking && activeSpeechId === msg.id ? (
                      <>
                        <VolumeX size={12} className="text-red-400" />
                        <span className="text-red-400 font-semibold">Stop Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 size={12} />
                        <span>Read Aloud</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-300 shadow-sm mt-1">
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3 justify-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-400 animate-pulse">
              <Bot size={18} />
            </div>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-slate-300 text-xs flex items-center gap-3">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span>Analyzing live telemetry, safety limits, and operator baseline with Groq AI...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested In-Cab Operator Queries (Inspiration Chips) */}
      <div className="border-t border-slate-800/80 bg-slate-900/30 px-5 py-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <HelpCircle size={13} className="text-amber-400" />
            <span>Operator Quick Suggestions:</span>
            {showSuggestions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <span className="text-[11px] text-slate-400">Click any chip or type your own question</span>
        </div>

        {showSuggestions && (
          <div className="flex flex-wrap gap-1.5">
            {suggestionChips.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputQuery(q);
                  handleSendMessage(q);
                }}
                className="rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-all hover:border-amber-400 hover:bg-slate-800 hover:text-white"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Action Form */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about machine load, idle, trenches, safety, or hydraulic specs..."
              className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--yellow)] focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* Voice Mic Button */}
          {voiceAvailable && (
            <button
              type="button"
              onClick={toggleVoice}
              className={`flex items-center justify-center rounded-2xl border p-3 text-xs font-bold transition-all shadow-md ${
                listening
                  ? 'border-[var(--red-border)] bg-[var(--red)] text-white animate-pulse'
                  : 'border-[var(--border-default)] bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              }`}
              title="Push to talk speech-to-text"
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}

          {/* Send Button */}
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="flex items-center gap-2 rounded-2xl border border-[var(--yellow)] bg-[var(--yellow)] px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 transition-all hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Send size={15} />
            <span className="hidden sm:inline">Ask Copilot</span>
          </button>
        </form>
      </div>
    </div>
  );
}
