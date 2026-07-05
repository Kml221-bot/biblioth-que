// ============================================================
// BiblioTech — Service NestJS API
// Toutes les routes qui passent par le backend NestJS (port 3002)
// sont proxiées automatiquement par Vite en développement.
// ============================================================

import { supabase } from '@/lib/supabase';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function nestGet<T>(path: string, auth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) Object.assign(headers, await getAuthHeaders());
  const res = await fetch(path, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? json.error ?? `Erreur ${res.status}`);
  return json.data as T;
}

async function nestPost<T>(path: string, body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) Object.assign(headers, await getAuthHeaders());
  const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? json.error ?? `Erreur ${res.status}`);
  return json.data as T;
}

// ── Health ─────────────────────────────────────────────────
export const nestHealth = () => nestGet<{ status: string }>('/api/health');

// ── Auth ───────────────────────────────────────────────────
export const nestLogin = (email: string, password: string) =>
  nestPost<{ accessToken: string; user: unknown }>('/api/auth/login', { email, password }, false);

export const nestRegister = (data: {
  email: string; password: string; nom: string; prenom?: string;
}) => nestPost<{ accessToken: string; user: unknown }>('/api/auth/register', data, false);

export const nestGetMe = () => nestGet<unknown>('/api/auth/me', true);

// ── Books ──────────────────────────────────────────────────
export const nestGetBooks = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return nestGet<unknown[]>(`/api/books${qs}`, false);
};

export const nestGetBook = (id: string) =>
  nestGet<unknown>(`/api/books/${id}`, false);

export const nestSearchBooks = (q: string) =>
  nestGet<unknown>(`/api/search?q=${encodeURIComponent(q)}`, false);

// ── Chapters ───────────────────────────────────────────────
export interface NestChapter {
  id: string;
  bookId: string;
  titre: string;
  ordre: number;
  isFree: boolean;
  prixPieces: number;
  isAccessible: boolean;
  isUnlocked: boolean;
  contentUrl?: string | null;
  description?: string | null;
}

export const nestGetChapters = (bookId: string) =>
  nestGet<NestChapter[]>(`/api/books/${bookId}/chapters`, true);

export const nestUnlockChapter = (chapterId: string) =>
  nestPost<NestChapter>(`/api/chapters/${chapterId}/unlock`, undefined, true);

// ── Paiement Wave / Orange Money (Naboopay) ─────────────────
export const nestInitiateCoinsPayment = (packId: string) =>
  nestPost<{ transactionId: string; paymentUrl: string; montantFcfa: number }>(
    '/api/payments/initiate',
    { type: 'WALLET_RECHARGE', packId },
    true
  );

// ── Coins ──────────────────────────────────────────────────
export interface CoinPack {
  id: string; label: string; coins: number; prixFcfa: number; isPopular: boolean;
}

export const nestGetCoinBalance = () =>
  nestGet<{ balance: number }>('/api/coins/balance', true);

export const nestGetCoinPacks = () =>
  nestGet<CoinPack[]>('/api/coins/packs', true);

export const nestPurchaseCoins = (packId: string) =>
  nestPost<{ balance: number }>(`/api/coins/purchase/${packId}`, undefined, true);

export const nestGetCoinTransactions = () =>
  nestGet<unknown[]>('/api/coins/transactions', true);

// ── Weather ────────────────────────────────────────────────
export interface WeatherData {
  city: string; country: string; temperature: number; feelsLike: number;
  humidity: number; windSpeed: number; cached: boolean;
  condition: { description: string; icon: string; iconUrl: string };
  sunrise: string; sunset: string; timestamp: string;
}

export const nestGetWeather = () =>
  nestGet<WeatherData | null>('/api/weather/dakar', false);

// ── Open Library ───────────────────────────────────────────
export interface OlBook {
  key: string; title: string; authors?: string[]; publishYear?: number;
  pages?: number; isbn?: string[]; coverUrl?: string | null; publisher?: string;
}

export const nestSearchOpenLibrary = (q: string, limit = 10) =>
  nestGet<{ total: number; books: OlBook[] }>(
    `/api/open-library/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    false
  );

export const nestGetByIsbn = (isbn: string) =>
  nestGet<OlBook | null>(`/api/open-library/isbn/${isbn}`, false);
