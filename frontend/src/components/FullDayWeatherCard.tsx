import React from 'react';
import {
  Sun, Cloud, CloudRain, CloudLightning, Wind,
  Thermometer, Droplets, AlertTriangle, CheckCircle2,
} from 'lucide-react';

interface HourlyForecast {
  time: string;
  temperature: number;
  precipitation_prob: number;
  precipitation_mm: number;
  condition: string;
  wind: number;
}

interface DailySummary {
  max_temp?: number;
  min_temp?: number;
  total_rain_mm?: number;
  max_rain_probability?: number;
  max_wind_kmh?: number;
  overall_condition?: string;
}

interface FullDayWeatherCardProps {
  weather: {
    location?: string;
    condition?: string;
    temperature?: number;
    precipitation?: number;
    wind?: number;
    humidity?: number;
    source?: string;
    daily?: DailySummary;
    hourly?: HourlyForecast[];
    advisories?: string[];
  };
}

function WeatherIcon({ condition = '', size = 16 }: { condition?: string; size?: number }) {
  const c = condition.toLowerCase();
  if (c.includes('thunder') || c.includes('storm'))        return <CloudLightning size={size} className="text-[var(--yellow)]" />;
  if (c.includes('rain') || c.includes('drizzle'))         return <CloudRain size={size} className="text-[var(--blue)]" />;
  if (c.includes('clear') || c.includes('sunny'))          return <Sun size={size} className="text-[var(--yellow)]" />;
  if (c.includes('wind'))                                   return <Wind size={size} className="text-teal-400" />;
  return <Cloud size={size} className="text-[var(--text-secondary)]" />;
}

export function FullDayWeatherCard({ weather }: FullDayWeatherCardProps) {
  const daily = weather.daily ?? {
    max_temp: 33.5, min_temp: 25.7, total_rain_mm: 0.6,
    max_rain_probability: 37, max_wind_kmh: 25.8,
    overall_condition: weather.condition || 'Partly Cloudy',
  };

  const defaultHourly: HourlyForecast[] = [
    { time: '06:00', temperature: 25.8, precipitation_prob: 10, precipitation_mm: 0.0, condition: 'Partly Cloudy', wind: 12.4 },
    { time: '09:00', temperature: 29.2, precipitation_prob: 15, precipitation_mm: 0.0, condition: 'Sunny', wind: 16.2 },
    { time: '12:00', temperature: 33.1, precipitation_prob: 20, precipitation_mm: 0.1, condition: 'Clear', wind: 21.0 },
    { time: '15:00', temperature: 33.5, precipitation_prob: 37, precipitation_mm: 0.5, condition: 'Rain', wind: 25.8 },
    { time: '18:00', temperature: 30.4, precipitation_prob: 25, precipitation_mm: 0.0, condition: 'Cloudy', wind: 18.5 },
    { time: '21:00', temperature: 27.6, precipitation_prob: 12, precipitation_mm: 0.0, condition: 'Clear', wind: 14.1 },
  ];

  let displayHourly = defaultHourly;
  if (weather.hourly && weather.hourly.length > 0) {
    if (weather.hourly.length > 8) {
      const targets = ['06', '09', '12', '15', '18', '21'];
      const filtered = weather.hourly.filter(h => targets.some(t => h.time.startsWith(t)));
      displayHourly = filtered.length >= 4 ? filtered : weather.hourly.slice(6, 12);
    } else {
      displayHourly = weather.hourly;
    }
  }

  const advisories = weather.advisories?.length
    ? weather.advisories
    : [
        `Heat ${daily.max_temp ?? 33.5}°C mid-day — monitor hydraulic temps and cab AC load.`,
        `Gusts up to ${daily.max_wind_kmh ?? 25.8} km/h — watch boom swing drift on slopes.`,
        `${daily.max_rain_probability ?? 37}% rain (${daily.total_rain_mm ?? 0.6} mm) — prioritise deep trenching early.`,
      ];

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="jump-card-icon bg-[var(--yellow-dim)]">
            <WeatherIcon condition={daily.overall_condition || weather.condition} size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Site Weather</span>
              <span className="dot-live" />
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {weather.location || 'Vellore, TN'} · Open-Meteo satellite sync
            </div>
          </div>
        </div>
        <span className="chip chip-blue">Whole-day model</span>
      </div>

      <hr className="divider" />

      {/* 4 KPI pills */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <div className="card-raised">
          <div className="flex items-center justify-between mb-1">
            <span className="label-caps">High / Low</span>
            <Thermometer size={12} className="text-[var(--yellow)]" />
          </div>
          <div className="text-base font-bold text-[var(--text-primary)] mono">{daily.max_temp ?? 33.5}°</div>
          <div className="text-xs text-[var(--text-muted)]">Low {daily.min_temp ?? 25.7}° · Now {weather.temperature ?? 26.5}°</div>
        </div>

        <div className="card-raised">
          <div className="flex items-center justify-between mb-1">
            <span className="label-caps">Rain Risk</span>
            <CloudRain size={12} className="text-[var(--blue)]" />
          </div>
          <div className="text-base font-bold text-[var(--blue)] mono">{daily.max_rain_probability ?? 37}%</div>
          <div className="text-xs text-[var(--text-muted)]">{daily.total_rain_mm ?? 0.6} mm expected</div>
        </div>

        <div className="card-raised">
          <div className="flex items-center justify-between mb-1">
            <span className="label-caps">Peak Wind</span>
            <Wind size={12} className="text-teal-400" />
          </div>
          <div className="text-base font-bold text-teal-300 mono">{daily.max_wind_kmh ?? 25.8}</div>
          <div className="text-xs text-[var(--text-muted)]">km/h · now {weather.wind ?? 15} km/h</div>
        </div>

        <div className="card-raised">
          <div className="flex items-center justify-between mb-1">
            <span className="label-caps">Humidity</span>
            <Droplets size={12} className="text-indigo-400" />
          </div>
          <div className="text-base font-bold text-[var(--text-primary)] mono">{weather.humidity ?? 51}%</div>
          <div className="text-xs text-[var(--text-muted)] truncate">{daily.overall_condition || 'Partly Cloudy'}</div>
        </div>
      </div>

      {/* Hourly strip */}
      <div>
        <div className="label-caps mb-2">Shift Forecast</div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {displayHourly.map((h, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-2 text-center hover:border-[var(--border-default)] transition-colors"
            >
              <span className="text-[10px] font-mono text-[var(--text-muted)]">{h.time}</span>
              <WeatherIcon condition={h.condition} size={16} />
              <span className="text-xs font-bold text-[var(--text-primary)] mono">{h.temperature}°</span>
              <div className="flex items-center gap-0.5 text-[10px] text-[var(--blue)]">
                <Droplets size={8} />
                <span>{h.precipitation_prob}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advisories */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <AlertTriangle size={12} className="text-[var(--yellow)]" />
          <span className="label-caps-brand">Shift Advisories</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {advisories.map((a, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-2.5 text-xs text-[var(--text-secondary)] leading-relaxed">
              <span className="text-[var(--yellow)] mt-0.5 flex-shrink-0">
                {i === 0 ? <Thermometer size={12} /> : i === 1 ? <Wind size={12} /> : <CloudRain size={12} />}
              </span>
              {a}
            </div>
          ))}
        </div>
      </div>

      {/* Model notice */}
      <div className="alert alert-ok text-xs">
        <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" />
        <span>
          Full-day rain + wind data is automatically factored into task duration predictions and AI copilot reasoning.
        </span>
      </div>
    </div>
  );
}
