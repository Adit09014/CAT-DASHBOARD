import React, { useState, useEffect } from 'react';
import { Target, CheckCircle, XCircle, Play, Video, ExternalLink, ArrowRight, Award, TrendingDown, HelpCircle, Sparkles, Compass, Lightbulb } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';

interface TrainingItem {
  video_id: string;
  title: string;
  description: string;
  source: string;
  relevance_score: number;
  category?: string;
  thumbnail_url?: string;
}

interface DomainGuardTrainingProps {
  operatorId?: number;
  machineType?: string;
  recommendedTopic?: string;
}

export function DomainGuardTraining({
  operatorId = 2,
  machineType = 'Excavator',
  recommendedTopic = 'Excavator Idle Reduction',
}: DomainGuardTrainingProps) {
  const [query, setQuery] = useState('How do I use a jcb');
  const [guardStatus, setGuardStatus] = useState<{
    allowed: boolean;
    reason: string;
    category?: string;
    ai_expanded_query?: string;
    suggested_queries?: string[];
    results: TrainingItem[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // Preset quick test queries for demoing the domain guard live
  const sampleQueries = [
    { text: 'How do I use a jcb', allowed: true, label: 'JCB / Backhoe Controls' },
    { text: 'How do I reduce excavator idle time?', allowed: true, label: 'Idle & Fuel Saving' },
    { text: 'Safe trenching protocols on unstable ground', allowed: true, label: 'Trench Safety' },
    { text: 'Wheel loader V-pattern truck loading', allowed: true, label: 'Loader V-Cycle' },
    { text: 'How do I make biryani?', allowed: false, label: 'Reject (Cooking)' },
    { text: 'Recommend a movie for tonight', allowed: false, label: 'Reject (Entertainment)' },
  ];

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    try {
      setLoading(true);
      const res = await api.post('/training/search', {
        query: searchQuery,
        operator_id: operatorId,
        machine_type: machineType,
      });
      setGuardStatus(res.data);
      if (res.data.results?.length > 0) {
        setSelectedVideo(res.data.results[0].video_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch('How do I use a jcb');
  }, []);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.25em] text-purple-400">
            <Sparkles size={14} />
            <span>AI Domain-Guarded Upskilling</span>
          </div>
          <h3 className="mt-1 text-2xl font-bold text-white">Intelligent Video Training Library</h3>
          <p className="mt-1 text-xs text-slate-400">
            Natural-language query reasoning filters off-topic noise and retrieves verified Caterpillar & heavy machinery tutorials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-300 flex items-center gap-1.5">
            <Award size={13} />
            Closed-Loop Upskilling
          </span>
        </div>
      </div>

      {/* Domain Guard Quick Preset Buttons */}
      <div className="mt-4">
        <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
          <Compass size={13} className="text-amber-400" />
          <span>Interactive Test Queries (Natural Language vs Off-Topic):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((sample, i) => (
            <button
              key={i}
              onClick={() => handleSearch(sample.text)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                query === sample.text
                  ? 'border-amber-400 bg-amber-500/20 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              {sample.allowed ? (
                <CheckCircle size={13} className="text-emerald-400" />
              ) : (
                <XCircle size={13} className="text-red-400" />
              )}
              <span>{sample.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Query Search Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(query);
        }}
        className="mt-4 flex gap-2"
      >
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask any question (e.g., 'How do I use a jcb', 'trenching safety checklist', 'fuel saving tips')..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-amber-400 bg-amber-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 transition-all hover:bg-amber-400"
        >
          <Target size={15} />
          {loading ? 'Evaluating...' : 'Query AI'}
        </button>
      </form>

      {/* Guard Outcome Banner */}
      {guardStatus && (
        <div
          className={`mt-4 rounded-2xl border p-4 text-xs transition-all ${
            guardStatus.allowed
              ? 'border-emerald-500/40 bg-emerald-950/25 text-emerald-200'
              : 'border-red-500/40 bg-red-950/25 text-red-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {guardStatus.allowed ? (
                <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle size={18} className="text-red-400 flex-shrink-0" />
              )}
              <div className="text-sm font-semibold">
                {guardStatus.allowed ? 'DOMAIN VALIDATED ✓' : 'REQUEST PROHIBITED ✕'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {guardStatus.category && (
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  guardStatus.allowed
                    ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                    : 'border border-red-500/40 bg-red-500/20 text-red-300'
                }`}>
                  {guardStatus.category}
                </span>
              )}
              <StatusBadge
                state={guardStatus.allowed ? 'green' : 'red'}
                label={guardStatus.allowed ? 'CAT Approved' : 'Domain Rejected'}
              />
            </div>
          </div>

          <div className="mt-2 text-xs leading-relaxed text-slate-300">
            {guardStatus.reason}
          </div>

          {guardStatus.allowed && guardStatus.ai_expanded_query && (
            <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-slate-900/80 border border-emerald-500/20 px-3 py-1.5 text-[11px] text-emerald-300">
              <Sparkles size={13} className="text-amber-400 flex-shrink-0" />
              <span>
                <strong>AI Query Expansion:</strong> "{guardStatus.ai_expanded_query}"
              </span>
            </div>
          )}

          {/* Interactive Suggestions if query is rejected */}
          {!guardStatus.allowed && guardStatus.suggested_queries && guardStatus.suggested_queries.length > 0 && (
            <div className="mt-3 border-t border-red-500/20 pt-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                <Lightbulb size={13} className="text-amber-400" />
                <span>Try one of these heavy machinery questions:</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {guardStatus.suggested_queries.map((suggested, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => handleSearch(suggested)}
                    className="rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-[11px] text-slate-200 hover:border-amber-400 hover:text-white transition-colors"
                  >
                    "{suggested}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Cards Grid */}
      {guardStatus?.allowed && guardStatus.results?.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
            <span>Verified Machinery Training Modules ({guardStatus.results.length} Matches)</span>
            <span className="text-[11px] text-amber-400 font-normal">Click any video to play below</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {guardStatus.results.map((video, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedVideo(video.video_id)}
                className={`group flex cursor-pointer gap-3 rounded-2xl border p-3 transition-all ${
                  selectedVideo === video.video_id
                    ? 'border-amber-400/90 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="relative flex h-20 w-32 flex-shrink-0 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                  <img
                    src={`https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
                    alt={video.title}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                    <div className="rounded-full bg-amber-500/90 p-1.5 shadow-md">
                      <Play size={14} className="fill-slate-950 text-slate-950 translate-x-0.5" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-amber-300 transition-colors">
                      {video.title}
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-tight">
                      {video.description}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-emerald-400">
                      Relevance: {Math.round(video.relevance_score * 100)}%
                    </span>
                    <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-amber-300 font-medium">
                      CAT Certified
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Embedded YouTube Player */}
          {selectedVideo && (
            <div className="mt-4 rounded-2xl border border-slate-800 overflow-hidden bg-black p-2 shadow-2xl">
              <div className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-400 border-b border-slate-800/60 mb-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Play size={12} className="text-amber-400" />
                  Active Video Player
                </span>
                <a
                  href={`https://www.youtube.com/watch?v=${selectedVideo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                >
                  <span>Open on YouTube</span>
                  <ExternalLink size={11} />
                </a>
              </div>
              <div className="aspect-video w-full rounded-xl overflow-hidden">
                <iframe
                  key={selectedVideo}
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${selectedVideo}?rel=0&autoplay=1`}
                  title="CAT Training Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Beat 5: Closed-Loop Metric Comparison Panel */}
      <div className="mt-5 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown size={18} className="text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
              Closed-Loop Improvement Metric
            </span>
          </div>
          <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
            -29.4% Idle Observed
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Before Training</div>
            <div className="mt-1 text-lg font-bold text-slate-200">34 min idle</div>
            <div className="text-[10px] text-slate-400">Pre-course baseline</div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <ArrowRight size={20} className="text-purple-400" />
            <span className="text-[10px] font-medium text-purple-300 mt-1">Optimization Completed</span>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-2.5">
            <div className="text-[10px] text-emerald-300 uppercase tracking-wider">After Training</div>
            <div className="mt-1 text-lg font-bold text-emerald-300">24 min idle</div>
            <div className="text-[10px] text-emerald-400/80">Shift average</div>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400 border-t border-purple-500/20 pt-2.5">
          <HelpCircle size={13} className="flex-shrink-0 mt-0.5 text-purple-400" />
          <span>
            <strong>Required Disclosure:</strong> Metric reported as observed shift correlation after training completion; not asserted as a single-variable proven causation.
          </span>
        </div>
      </div>
    </div>
  );
}
