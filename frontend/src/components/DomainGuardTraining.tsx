import React, { useState, useEffect } from 'react';
import { Search, Play, CheckCircle2, XCircle, ArrowRight, TrendingDown } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';

interface TrainingItem {
  video_id: string;
  title: string;
  description: string;
  source: string;
  relevance_score: number;
}

interface DomainGuardTrainingProps {
  operatorId?: number;
  machineType?: string;
  recommendedTopic?: string;
}

export function DomainGuardTraining({
  operatorId = 2,
  machineType = 'Excavator',
}: DomainGuardTrainingProps) {
  const [query, setQuery] = useState('How do I operate a Cat 420 backhoe?');
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

  const presets = [
    { text: 'How do I operate a Cat 420 backhoe?', label: 'Cat 420 Backhoe' },
    { text: 'How do I reduce excavator idle time?', label: 'Idle Reduction' },
    { text: 'Safe trenching protocols on unstable ground', label: 'Trench Safety' },
    { text: 'How do I make biryani?', label: 'Test: Off-Topic Filter' },
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
    handleSearch('How do I operate a Cat 420 backhoe?');
  }, []);

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <div className="label-caps">Operator Upskilling</div>
          <h2 className="section-title mt-0.5">Training Modules</h2>
        </div>
        <StatusBadge
          state={guardStatus?.allowed ? 'green' : 'amber'}
          label={guardStatus?.allowed ? 'FILTER ACTIVE' : 'REJECTED'}
        />
      </div>

      {/* Preset Pills */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSearch(p.text)}
            className={`btn text-xs py-1.5 px-3 ${
              query === p.text ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(query);
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search training topic..."
          className="input-field flex-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary text-xs py-2 px-4 gap-1.5"
        >
          <Search size={14} />
          <span>{loading ? 'Searching...' : 'Search'}</span>
        </button>
      </form>

      {/* Verdict Strip */}
      {guardStatus && (
        <div
          className={`alert ${
            guardStatus.allowed ? 'alert-ok' : 'alert-danger'
          } flex items-center justify-between py-2.5 px-3.5 text-xs`}
        >
          <div className="flex items-center gap-2">
            {guardStatus.allowed ? (
              <CheckCircle2 size={15} className="text-[var(--green)] flex-shrink-0" />
            ) : (
              <XCircle size={15} className="text-[var(--red)] flex-shrink-0" />
            )}
            <span>{guardStatus.reason}</span>
          </div>
          {guardStatus.category && (
            <span className="chip chip-gray text-[10px] mono flex-shrink-0 ml-2">
              {guardStatus.category}
            </span>
          )}
        </div>
      )}

      {/* Suggested queries if rejected */}
      {guardStatus && !guardStatus.allowed && guardStatus.suggested_queries && (
        <div className="card-raised p-3 text-xs space-y-2">
          <div className="text-[var(--text-muted)]">Suggested heavy machinery queries:</div>
          <div className="flex flex-wrap gap-2">
            {guardStatus.suggested_queries.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSearch(s)}
                className="btn btn-secondary text-xs py-1 px-2.5"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Grid */}
      {guardStatus?.allowed && guardStatus.results?.length > 0 && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {guardStatus.results.map((video, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedVideo(video.video_id)}
                className={`card-raised p-3 cursor-pointer flex flex-col justify-between transition-all ${
                  selectedVideo === video.video_id
                    ? 'border-[var(--yellow)] bg-[var(--bg-elevated)]'
                    : 'hover:border-[var(--border-default)]'
                }`}
              >
                <div>
                  <div className="relative aspect-video rounded-md overflow-hidden bg-black mb-2">
                    <img
                      src={`https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-[var(--yellow)] flex items-center justify-center shadow">
                        <Play size={13} className="fill-black text-black ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2">
                    {video.title}
                  </h4>
                </div>
                <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>Relevance</span>
                  <span className="mono font-bold text-[var(--green)]">
                    {Math.round(video.relevance_score * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Embedded Player */}
          {selectedVideo && (
            <div className="card-raised p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Active Module</span>
                <a
                  href={`https://www.youtube.com/watch?v=${selectedVideo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--yellow)] hover:underline"
                >
                  Open in YouTube ↗
                </a>
              </div>
              <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
                <iframe
                  key={selectedVideo}
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${selectedVideo}?rel=0`}
                  title="CAT Training Video"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Closed-Loop Telemetry Outcome Card */}
      <div className="card-raised p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="label-caps">Shift Performance Impact</div>
          <span className="chip chip-green text-xs mono font-bold">-29.4% Idle</span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center pt-1">
          <div className="p-2.5 rounded-lg bg-[var(--bg-base)]">
            <div className="text-[10px] text-[var(--text-muted)]">Before Training</div>
            <div className="text-base font-bold mono text-[var(--text-primary)] mt-0.5">34 min</div>
            <div className="text-[10px] text-[var(--text-muted)]">Baseline idle</div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <ArrowRight size={18} className="text-[var(--text-muted)]" />
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--green)]">
            <div className="text-[10px] text-[var(--green)] font-semibold">After Training</div>
            <div className="text-base font-bold mono text-[var(--green)] mt-0.5">24 min</div>
            <div className="text-[10px] text-[var(--text-muted)]">Shift average</div>
          </div>
        </div>
      </div>
    </div>
  );
}
