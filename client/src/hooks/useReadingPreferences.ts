// ============================================================
// BiblioTech — Hook de préférences de lecture
// Partagé entre EPUB et PDF. Persiste localStorage + sync DB.
// ============================================================

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────
export type ReadingTheme = 'light' | 'dark' | 'sepia' | 'green' | 'blue';
export type ReadingFont = 'jakarta' | 'georgia' | 'merriweather' | 'dyslexic' | 'mono';
export type ReadingMargin = 'narrow' | 'normal' | 'wide';
export type ReadingMode = 'paginated' | 'scroll';

export interface ReadingPreferences {
  theme: ReadingTheme;
  font: ReadingFont;
  fontSize: number;        // 12-32
  lineHeight: number;      // 1.2-2.5
  margin: ReadingMargin;
  justified: boolean;
  brightness: number;      // 0.5-1.5
  mode: ReadingMode;
  autoNight: boolean;
}

// ─── Thèmes ───────────────────────────────────────────────
export const READING_THEMES: Record<ReadingTheme, {
  label: string;
  emoji: string;
  bg: string;
  text: string;
  headerBg: string;
  headerBorder: string;
  accent: string;
  mutedText: string;
}> = {
  light: {
    label: 'Jour',
    emoji: '☀️',
    bg: '#FFFFFF',
    text: '#1D1D1F',
    headerBg: 'rgba(249, 249, 249, 0.95)',
    headerBorder: '#E5E5E7',
    accent: '#007AFF',
    mutedText: '#8E8E93',
  },
  dark: {
    label: 'Nuit',
    emoji: '🌙',
    bg: '#1C1C1E',
    text: '#E5E5E7',
    headerBg: 'rgba(28, 28, 30, 0.95)',
    headerBorder: '#38383A',
    accent: '#0A84FF',
    mutedText: '#8E8E93',
  },
  sepia: {
    label: 'Sépia',
    emoji: '📜',
    bg: '#F4ECD8',
    text: '#5B4636',
    headerBg: 'rgba(244, 236, 216, 0.95)',
    headerBorder: '#D4C5A9',
    accent: '#A0522D',
    mutedText: '#8B7355',
  },
  green: {
    label: 'Vert',
    emoji: '🍃',
    bg: '#E8F5E9',
    text: '#2E4C2E',
    headerBg: 'rgba(232, 245, 233, 0.95)',
    headerBorder: '#C8E6C9',
    accent: '#2E7D32',
    mutedText: '#558B2F',
  },
  blue: {
    label: 'Bleu',
    emoji: '🔵',
    bg: '#1A2332',
    text: '#B3C7E0',
    headerBg: 'rgba(26, 35, 50, 0.95)',
    headerBorder: '#2C3E50',
    accent: '#5DADE2',
    mutedText: '#7F8C9B',
  },
};

// ─── Polices ──────────────────────────────────────────────
export const READING_FONTS: Record<ReadingFont, {
  label: string;
  family: string;
  css: string;
}> = {
  jakarta: {
    label: 'Plus Jakarta Sans',
    family: 'Plus Jakarta Sans',
    css: '"Plus Jakarta Sans", sans-serif',
  },
  georgia: {
    label: 'Georgia',
    family: 'Georgia',
    css: 'Georgia, "Times New Roman", serif',
  },
  merriweather: {
    label: 'Merriweather',
    family: 'Merriweather',
    css: 'Merriweather, Georgia, serif',
  },
  dyslexic: {
    label: 'OpenDyslexic',
    family: 'OpenDyslexic',
    css: 'OpenDyslexic, "Comic Sans MS", sans-serif',
  },
  mono: {
    label: 'Roboto Mono',
    family: 'Roboto Mono',
    css: '"Roboto Mono", "JetBrains Mono", monospace',
  },
};

// ─── Marges ───────────────────────────────────────────────
export const READING_MARGINS: Record<ReadingMargin, { label: string; value: number }> = {
  narrow: { label: 'Étroit', value: 8 },
  normal: { label: 'Normal', value: 24 },
  wide:   { label: 'Large', value: 48 },
};

// ─── Valeurs par défaut ───────────────────────────────────
const STORAGE_KEY = 'bibliotech:reading-preferences';

const DEFAULT_PREFERENCES: ReadingPreferences = {
  theme: 'sepia',
  font: 'jakarta',
  fontSize: 18,
  lineHeight: 1.8,
  margin: 'normal',
  justified: true,
  brightness: 1.0,
  mode: 'paginated',
  autoNight: true,
};

// ─── Hook ─────────────────────────────────────────────────
export function useReadingPreferences() {
  const [preferences, setPreferencesState] = useState<ReadingPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_PREFERENCES;
  });

  // Détection automatique du thème nuit
  useEffect(() => {
    if (!preferences.autoNight) return;

    const hour = new Date().getHours();
    const isNight = hour >= 21 || hour < 6;

    if (isNight && preferences.theme !== 'dark') {
      setPreferencesState(prev => ({ ...prev, theme: 'dark' }));
    }
  }, [preferences.autoNight]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage errors
    }
  }, [preferences]);

  // Setters typés
  const setPreferences = useCallback((update: Partial<ReadingPreferences>) => {
    setPreferencesState(prev => ({ ...prev, ...update }));
  }, []);

  const setTheme = useCallback((theme: ReadingTheme) => {
    setPreferencesState(prev => ({ ...prev, theme }));
  }, []);

  const setFont = useCallback((font: ReadingFont) => {
    setPreferencesState(prev => ({ ...prev, font }));
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    setPreferencesState(prev => ({
      ...prev,
      fontSize: Math.max(12, Math.min(32, fontSize)),
    }));
  }, []);

  const setLineHeight = useCallback((lineHeight: number) => {
    setPreferencesState(prev => ({
      ...prev,
      lineHeight: Math.max(1.2, Math.min(2.5, lineHeight)),
    }));
  }, []);

  const setMargin = useCallback((margin: ReadingMargin) => {
    setPreferencesState(prev => ({ ...prev, margin }));
  }, []);

  const setBrightness = useCallback((brightness: number) => {
    setPreferencesState(prev => ({
      ...prev,
      brightness: Math.max(0.5, Math.min(1.5, brightness)),
    }));
  }, []);

  const toggleJustified = useCallback(() => {
    setPreferencesState(prev => ({ ...prev, justified: !prev.justified }));
  }, []);

  const toggleMode = useCallback(() => {
    setPreferencesState(prev => ({
      ...prev,
      mode: prev.mode === 'paginated' ? 'scroll' : 'paginated',
    }));
  }, []);

  const resetDefaults = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
  }, []);

  // Helpers dérivés
  const currentTheme = READING_THEMES[preferences.theme];
  const currentFont = READING_FONTS[preferences.font];
  const currentMargin = READING_MARGINS[preferences.margin];

  return {
    preferences,
    setPreferences,
    setTheme,
    setFont,
    setFontSize,
    setLineHeight,
    setMargin,
    setBrightness,
    toggleJustified,
    toggleMode,
    resetDefaults,
    currentTheme,
    currentFont,
    currentMargin,
  };
}
