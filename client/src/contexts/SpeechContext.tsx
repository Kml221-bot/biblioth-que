import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

export interface SpeechTrack {
  bookId: string;
  title: string;
  author: string;
  text: string;
}

interface SpeechContextValue {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  track: SpeechTrack | null;
  progress: number;       // 0–100
  play: (track: SpeechTrack, options?: { rate?: number; lang?: string }) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

const SpeechCtx = createContext<SpeechContextValue | null>(null);

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function chunkText(text: string, max = 1200): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max && cur) { chunks.push(cur); cur = w; }
    else cur = next;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang.split('-')[0].toLowerCase();
  return (
    voices.find(v => v.lang.toLowerCase() === lang.toLowerCase() && v.localService) ??
    voices.find(v => v.lang.toLowerCase().startsWith(prefix) && v.localService) ??
    voices.find(v => v.lang.toLowerCase().startsWith(prefix)) ??
    voices[0] ?? null
  );
}

export function SpeechProvider({ children }: { children: React.ReactNode }) {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [track, setTrack] = useState<SpeechTrack | null>(null);
  const [progress, setProgress] = useState(0);

  const chunksRef   = useRef<string[]>([]);
  const indexRef    = useRef(0);
  const cancelledRef = useRef(false);

  const finish = useCallback(() => {
    setIsSpeaking(false);
    setIsPaused(false);
    setProgress(0);
    indexRef.current = 0;
    chunksRef.current = [];
  }, []);

  const speakChunk = useCallback((
    idx: number,
    rate: number,
    lang: string,
  ) => {
    if (cancelledRef.current) { finish(); return; }
    const chunk = chunksRef.current[idx];
    if (!chunk) { finish(); return; }

    const total = chunksRef.current.length;
    setProgress(Math.round((idx / total) * 100));

    const utt = new SpeechSynthesisUtterance(chunk);
    utt.lang = lang;
    utt.rate = rate;
    utt.pitch = 1.0;
    utt.volume = 1.0;
    const voice = pickVoice(lang);
    if (voice) utt.voice = voice;

    utt.onend = () => speakChunk(idx + 1, rate, lang);
    utt.onerror = () => finish();

    window.speechSynthesis.speak(utt);
  }, [finish]);

  const play = useCallback((newTrack: SpeechTrack, opts?: { rate?: number; lang?: string }) => {
    if (!isSupported) return;

    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    cancelledRef.current = false;

    const fullText = `${newTrack.title}, par ${newTrack.author}. ${stripHtml(newTrack.text)}`;
    chunksRef.current = chunkText(fullText);
    indexRef.current = 0;

    setTrack(newTrack);
    setIsSpeaking(true);
    setIsPaused(false);
    setProgress(0);

    const rate = opts?.rate ?? 0.92;
    const lang = opts?.lang ?? 'fr-FR';

    // Petit délai pour laisser les voix se charger
    setTimeout(() => speakChunk(0, rate, lang), 80);
  }, [isSupported, speakChunk]);

  const pause = useCallback(() => {
    if (!isSupported || !window.speechSynthesis.speaking) return;
    window.speechSynthesis.pause();
    setIsSpeaking(false);
    setIsPaused(true);
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported || !window.speechSynthesis.paused) return;
    window.speechSynthesis.resume();
    setIsSpeaking(true);
    setIsPaused(false);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    setTrack(null);
    finish();
  }, [isSupported, finish]);

  return (
    <SpeechCtx.Provider value={{ isSupported, isSpeaking, isPaused, track, progress, play, pause, resume, stop }}>
      {children}
    </SpeechCtx.Provider>
  );
}

export function useSpeechContext(): SpeechContextValue {
  const ctx = useContext(SpeechCtx);
  if (!ctx) throw new Error('useSpeechContext must be used inside SpeechProvider');
  return ctx;
}
