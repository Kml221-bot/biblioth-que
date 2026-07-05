import { useState, useEffect, useCallback, useRef } from 'react';

export interface SpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
}

export interface UseSpeechReturn {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  speak: (text: string, options?: SpeechOptions) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  speakBook: (title: string, author: string, description: string, options?: SpeechOptions) => void;
  currentText: string;
}

function splitSpeechText(text: string, maxLength = 1200): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let current = '';

  for (const word of cleaned.split(' ')) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function useSpeech(): UseSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [voicesReady, setVoicesReady] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<string[]>([]);
  const cancelledRef = useRef(false);
  const onEndRef = useRef<(() => void) | undefined>(undefined);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!isSupported) return;

    const refreshVoices = () => {
      window.speechSynthesis.getVoices();
      setVoicesReady(true);
    };

    refreshVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', refreshVoices);
  }, [isSupported]);

  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) return;
    const synth = window.speechSynthesis;

    const checkState = () => {
      setIsSpeaking(synth.speaking && !synth.paused);
      setIsPaused(synth.paused);
    };

    const interval = window.setInterval(checkState, 200);
    return () => window.clearInterval(interval);
  }, [isSupported]);

  const chooseVoice = useCallback((lang: string) => {
    if (!isSupported) return null;

    const voices = window.speechSynthesis.getVoices();
    const normalizedLang = lang.toLowerCase();
    const langPrefix = normalizedLang.split('-')[0];

    return voices.find(v => v.lang.toLowerCase() === normalizedLang && v.localService)
      ?? voices.find(v => v.lang.toLowerCase().startsWith(langPrefix) && v.localService)
      ?? voices.find(v => v.lang.toLowerCase() === normalizedLang)
      ?? voices.find(v => v.lang.toLowerCase().startsWith(langPrefix))
      ?? voices[0]
      ?? null;
  }, [isSupported, voicesReady]);

  const finish = useCallback(() => {
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentText('');
    queueRef.current = [];
    utteranceRef.current = null;
  }, []);

  const speak = useCallback((text: string, options: SpeechOptions = {}) => {
    if (!isSupported || !text.trim()) return;

    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    cancelledRef.current = false;

    const chunks = splitSpeechText(text);
    if (chunks.length === 0) return;

    const lang = options.lang ?? 'fr-FR';
    const rate = options.rate ?? 0.9;
    const pitch = options.pitch ?? 1.0;
    const volume = options.volume ?? 1.0;
    onEndRef.current = options.onEnd;

    queueRef.current = chunks;
    setIsSpeaking(true);
    setIsPaused(false);

    const speakChunk = (index: number) => {
      if (cancelledRef.current) {
        finish();
        return;
      }

      const chunk = queueRef.current[index];
      if (!chunk) {
        const cb = onEndRef.current;
        onEndRef.current = undefined;
        finish();
        cb?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      const voice = chooseVoice(lang);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setCurrentText(chunk);
      };
      utterance.onend = () => speakChunk(index + 1);
      utterance.onerror = () => finish();

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    speakChunk(0);
  }, [chooseVoice, finish, isSupported]);

  const speakBook = useCallback((
    title: string,
    author: string,
    description: string,
    options: SpeechOptions = {},
  ) => {
    const cleanDescription = stripHtml(description).slice(0, 2000);
    const text = `${title}, par ${author}. ${cleanDescription}`;
    speak(text, options);
  }, [speak]);

  const pause = useCallback(() => {
    if (isSupported && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    cancelledRef.current = true;
    queueRef.current = [];
    window.speechSynthesis.cancel();
    finish();
  }, [finish, isSupported]);

  return { isSpeaking, isPaused, isSupported, speak, pause, resume, stop, speakBook, currentText };
}
