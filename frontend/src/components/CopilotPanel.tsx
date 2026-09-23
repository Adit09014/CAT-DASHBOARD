import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Send, Bot, Sparkles, MessageSquare, Terminal } from 'lucide-react';
import { api } from '../services/api';

interface CopilotPanelProps {
  machineCode?: string;
  taskType?: string;
  initialMessage?: string;
}

export function CopilotPanel({
  machineCode = 'EXC-001',
  taskType = 'Excavation',
  initialMessage,
}: CopilotPanelProps) {
  const [question, setQuestion] = useState('Why did I get this warning?');
  const [answer, setAnswer] = useState(
    initialMessage ||
      'I am monitoring EXC-001. All telemetry, safety gates, and baseline drift are active in my context.'
  );
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const recognitionRef = useRef<any>(null);

  const presetQuestions = [
    'Why did I get this warning?',
    'How long will this task take?',
    'What should I check before starting?',
    'How can I reduce idle time?',
    'Why is fuel usage high?',
  ];

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
          setQuestion(text);
          askQuestion(text);
          setListening(false);
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => setListening(false);
        recognitionRef.current = rec;
      }
    }
  }, []);

  const speak = (textToSpeak: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const askQuestion = async (queryText: string) => {
    try {
      setLoading(true);
      const res = await api.post('/copilot/ask', { question: queryText });
      setAnswer(res.data.answer);
      speak(res.data.answer);
    } catch (err) {
      console.error(err);
      setAnswer('Unable to retrieve copilot guidance. Deterministic fallbacks active.');
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

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
            <Bot size={14} />
            <span>Industrial Assistant</span>
          </div>
          <h3 className="mt-1 text-2xl font-bold text-white">Machine-Aware AI Copilot</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            <Terminal size={12} className="text-amber-400" />
            <span>Grounded in {machineCode} Telemetry</span>
          </span>
        </div>
      </div>

      {/* Quick Question Chips */}
      <div className="mt-4">
        <div className="text-xs text-slate-400 mb-2">Instant Operator Prompts:</div>
        <div className="flex flex-wrap gap-2">
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuestion(q);
                askQuestion(q);
              }}
              className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-amber-500/40 hover:text-white"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Question Input Box with Voice & Send */}
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askQuestion(question)}
            placeholder="Ask copilot about warnings, idle time, or procedure..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        {voiceAvailable && (
          <button
            onClick={toggleVoice}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
              listening
                ? 'border-red-500 bg-red-600 text-white animate-pulse'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-600'
            }`}
            title="Push to talk speech-to-text"
          >
            {listening ? <MicOff size={15} /> : <Mic size={15} />}
            <span className="hidden sm:inline">{listening ? 'Listening...' : 'Voice'}</span>
          </button>
        )}

        <button
          onClick={() => askQuestion(question)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 transition-all hover:bg-amber-400"
        >
          <Send size={14} />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </div>

      {/* Answer Container */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            <span className="font-semibold text-slate-300">Copilot Telemetry Insight</span>
          </div>
          <button
            onClick={() => speak(answer)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
            title="Read answer aloud"
          >
            <Volume2 size={13} />
            <span>Read Aloud</span>
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">
          {loading ? 'Analyzing live telemetry and baseline parameters...' : answer}
        </p>
      </div>
    </div>
  );
}
