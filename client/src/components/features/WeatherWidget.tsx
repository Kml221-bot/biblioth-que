import React, { useEffect, useState } from 'react';
import { Wind, Droplets, Sunrise, Sunset, RefreshCw } from 'lucide-react';

interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: { description: string; icon: string; iconUrl: string };
  sunrise: string;
  sunset: string;
  cached: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Dakar',
  });
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/weather/dakar');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setWeather(json.data ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWeather(); }, []);

  // ── Skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded-full" />
        <div className="h-8 w-16 bg-muted rounded-full" />
        <div className="h-3 w-32 bg-muted rounded-full" />
      </div>
    );
  }

  // ── Clé API absente ou erreur ─────────────────────────────────
  if (error || !weather) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Dakar · Météo
        </p>
        <p className="text-xs text-muted-foreground">Données météo indisponibles</p>
      </div>
    );
  }

  // ── Dégradé selon la météo ────────────────────────────────────
  const icon = weather.condition.icon;
  const isDaytime = icon.endsWith('d');
  const isClear = icon.startsWith('01') || icon.startsWith('02');
  const isRain = icon.startsWith('09') || icon.startsWith('10');
  const isCloud = icon.startsWith('03') || icon.startsWith('04');

  const gradientClass = isDaytime
    ? isClear
      ? 'from-amber-400/15 to-orange-300/10'
      : isRain
        ? 'from-slate-400/15 to-blue-400/10'
        : isCloud
          ? 'from-slate-300/15 to-slate-400/10'
          : 'from-teal-400/15 to-cyan-300/10'
    : 'from-indigo-500/15 to-purple-400/10';

  return (
    <div
      className={`rounded-2xl border border-border bg-gradient-to-br ${gradientClass} bg-card p-4 space-y-3`}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {weather.city}, {weather.country}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Météo en direct</p>
        </div>
        <button
          onClick={fetchWeather}
          title="Actualiser"
          className="p-1 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Température principale */}
      <div className="flex items-center gap-2">
        <img
          src={weather.condition.iconUrl}
          alt={weather.condition.description}
          className="w-10 h-10 drop-shadow"
          loading="lazy"
        />
        <div>
          <span className="text-3xl font-bold text-foreground leading-none">
            {Math.round(weather.temperature)}°
          </span>
          <span className="text-base font-light text-muted-foreground ml-0.5">C</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs font-medium text-foreground capitalize">
        {weather.condition.description}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Droplets className="w-3 h-3 text-blue-400" />
          <span>{weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Wind className="w-3 h-3 text-slate-400" />
          <span>{weather.windSpeed} m/s</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Sunrise className="w-3 h-3 text-amber-400" />
          <span>{formatTime(weather.sunrise)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Sunset className="w-3 h-3 text-orange-400" />
          <span>{formatTime(weather.sunset)}</span>
        </div>
      </div>

      {/* Ressenti */}
      <p className="text-[10px] text-muted-foreground/60 border-t border-border/50 pt-2">
        Ressenti {Math.round(weather.feelsLike)}°C
        {weather.cached && <span className="ml-2 opacity-50">· cache</span>}
      </p>
    </div>
  );
}
