// ============================================================
// BiblioTech — Barre d'accessibilité inclusive
// Taille texte | Contraste | Dyslexie | Lecture vocale |
// Raccourcis clavier | Malentendants
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, VolumeX, Pause, Play, Square,
  ZoomIn, ZoomOut, Accessibility, X,
  Sun, Type, Captions, Keyboard, Eye,
  ALargeSmall, Space, Ear, EarOff
} from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech';

// ─── Types ───────────────────────────────────────────────────
export interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'xl';
  highContrast: boolean;
  dyslexicFont: boolean;
  lineSpacing: 'normal' | 'relaxed' | 'loose';
  subtitles: boolean;         // lecture auto des pages
  visualAlerts: boolean;      // alertes visuelles pour malentendants
  reducedMotion: boolean;
}

const DEFAULTS: AccessibilitySettings = {
  fontSize: 'normal', highContrast: false, dyslexicFont: false,
  lineSpacing: 'normal', subtitles: false, visualAlerts: false,
  reducedMotion: false,
};

function loadSettings(): AccessibilitySettings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('a11y_settings') || '{}') }; } catch {}
  return DEFAULTS;
}

function saveSettings(s: AccessibilitySettings) {
  localStorage.setItem('a11y_settings', JSON.stringify(s));
  applySettings(s);
}

function applySettings(s: AccessibilitySettings) {
  const root = document.documentElement;
  // Font size
  root.style.fontSize = s.fontSize === 'xl' ? '20px' : s.fontSize === 'large' ? '18px' : '16px';
  // High contrast
  root.classList.toggle('high-contrast', s.highContrast);
  // Dyslexic font
  root.classList.toggle('dyslexic-font', s.dyslexicFont);
  // Line spacing
  root.classList.remove('line-spacing-relaxed', 'line-spacing-loose');
  if (s.lineSpacing === 'relaxed') root.classList.add('line-spacing-relaxed');
  if (s.lineSpacing === 'loose') root.classList.add('line-spacing-loose');
  // Reduced motion
  root.classList.toggle('reduce-motion', s.reducedMotion);
  // Visual alerts
  root.classList.toggle('visual-alerts', s.visualAlerts);
}

// ─── Toggle switch réutilisable ──────────────────────────────
const Toggle: React.FC<{ on: boolean; onToggle: () => void; label: string; icon: React.ReactNode }> = ({ on, onToggle, label, icon }) => (
  <div className="flex items-center justify-between py-1">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm text-foreground">{label}</span>
    </div>
    <button onClick={onToggle} aria-label={label}
      className={`relative w-10 h-5 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-muted'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-5' : 'left-0.5'}`} />
    </button>
  </div>
);

// ─── Composant principal ─────────────────────────────────────
export const AccessibilityBar: React.FC = () => {
  const { isSpeaking, isPaused, isSupported, speak, pause, resume, stop } = useSpeech();
  const [isOpen, setIsOpen]       = useState(false);
  const [settings, setSettings]   = useState<AccessibilitySettings>(loadSettings);
  const [lastPage, setLastPage]   = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [flashAlert, setFlashAlert] = useState(false);

  // Appliquer au montage
  useEffect(() => { applySettings(settings); }, []);

  // Lecture auto des pages
  useEffect(() => {
    if (!isSupported || !settings.subtitles) return;
    const currentPage = window.location.pathname;
    if (currentPage === lastPage) return;
    setLastPage(currentPage);
    setTimeout(() => {
      const h1 = document.querySelector('h1')?.textContent ?? '';
      const paras = Array.from(document.querySelectorAll('p')).slice(0, 2).map(p => p.textContent).join(' ');
      if (h1) speak(`Page : ${h1}. ${paras}`.substring(0, 300));
    }, 800);
  }, [isSupported]);

  // ─── Raccourcis clavier globaux ───────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Alt + A → ouvrir/fermer panel
      if (e.altKey && e.key === 'a') { e.preventDefault(); setIsOpen(v => !v); }
      // Alt + L → lecture vocale
      if (e.altKey && e.key === 'l') { e.preventDefault(); readCurrentPage(); }
      // Alt + Plus → agrandir texte
      if (e.altKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        const next = settings.fontSize === 'normal' ? 'large' : 'xl';
        updateSettings({ fontSize: next });
      }
      // Alt + Minus → réduire texte
      if (e.altKey && e.key === '-') {
        e.preventDefault();
        const next = settings.fontSize === 'xl' ? 'large' : 'normal';
        updateSettings({ fontSize: next });
      }
      // Alt + C → contraste élevé
      if (e.altKey && e.key === 'c') { e.preventDefault(); updateSettings({ highContrast: !settings.highContrast }); }
      // Alt + D → mode dyslexique
      if (e.altKey && e.key === 'd') { e.preventDefault(); updateSettings({ dyslexicFont: !settings.dyslexicFont }); }
      // Alt + S → arrêter lecture
      if (e.altKey && e.key === 's') { e.preventDefault(); stop(); }
      // Escape → fermer le panel
      if (e.key === 'Escape' && isOpen) { setIsOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settings, isOpen]);

  // Flash visuel pour malentendants (quand une notification arrive)
  useEffect(() => {
    if (!settings.visualAlerts) return;
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (node instanceof HTMLElement && (node.getAttribute('role') === 'alert' || node.classList.contains('toast'))) {
            setFlashAlert(true);
            setTimeout(() => setFlashAlert(false), 600);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [settings.visualAlerts]);

  const updateSettings = useCallback((patch: Partial<AccessibilitySettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const readCurrentPage = () => {
    if (isSpeaking) { stop(); return; }
    const h1    = document.querySelector('h1')?.textContent ?? 'BiblioTech';
    const paras = Array.from(document.querySelectorAll('p, .book-description'))
      .map(el => el.textContent ?? '').filter(t => t.length > 20).slice(0, 5).join(' ');
    const cards = Array.from(document.querySelectorAll('[data-book-title]'))
      .map(el => el.getAttribute('data-book-title')).filter(Boolean).slice(0, 5).join(', ');
    const text = `${h1}. ${paras || ''} ${cards ? 'Livres disponibles : ' + cards : ''}`.substring(0, 800);
    speak(text || `Bienvenue sur ${h1}`);
  };

  const FONT_LABELS = { normal: 'A', large: 'A+', xl: 'A++' };
  const LINE_LABELS = { normal: '1×', relaxed: '1.5×', loose: '2×' };
  const activeCount = [
    settings.fontSize !== 'normal', settings.highContrast, settings.dyslexicFont,
    settings.lineSpacing !== 'normal', settings.subtitles, settings.visualAlerts, settings.reducedMotion
  ].filter(Boolean).length;

  return (
    <>
      {/* Flash visuel pour malentendants */}
      <AnimatePresence>
        {flashAlert && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none border-[6px] border-amber-400 rounded-lg"
            style={{ boxShadow: 'inset 0 0 80px rgba(251,191,36,0.15)' }}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Panel étendu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-card border border-border/60 rounded-2xl shadow-2xl p-4 w-80 space-y-3 max-h-[80vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Accessibility className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm text-foreground">Accessibilité</span>
                  {activeCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">{activeCount}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowShortcuts(v => !v)} className="p-1.5 rounded-xl hover:bg-muted transition-colors" title="Raccourcis clavier">
                    <Keyboard className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* ── Raccourcis clavier ── */}
              <AnimatePresence>
                {showShortcuts && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
                      <p className="text-xs font-bold text-foreground mb-2">⌨️ Raccourcis clavier</p>
                      {[
                        ['Alt + A', 'Ouvrir/fermer ce panel'],
                        ['Alt + L', 'Lire la page à voix haute'],
                        ['Alt + S', 'Arrêter la lecture'],
                        ['Alt + C', 'Contraste élevé'],
                        ['Alt + D', 'Mode dyslexique'],
                        ['Alt + +', 'Agrandir le texte'],
                        ['Alt + -', 'Réduire le texte'],
                        ['Échap', 'Fermer le panel'],
                      ].map(([key, desc]) => (
                        <div key={key} className="flex items-center justify-between">
                          <kbd className="px-1.5 py-0.5 bg-card border border-border/60 rounded text-[10px] font-mono text-foreground">{key}</kbd>
                          <span className="text-[11px] text-muted-foreground">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="border-t border-border/60" />

              {/* ── Lecture vocale ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">🔊 Lecture vocale</p>
                {!isSupported ? (
                  <p className="text-xs text-red-500">Non supporté par ce navigateur</p>
                ) : (
                  <div className="space-y-2">
                    <button onClick={readCurrentPage}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        isSpeaking
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}>
                      {isSpeaking ? <><Square className="w-4 h-4" /> Arrêter</> : <><Volume2 className="w-4 h-4" /> Lire cette page</>}
                    </button>
                    {(isSpeaking || isPaused) && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                        <button onClick={isPaused ? resume : pause}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border/60 hover:bg-muted text-sm font-medium transition-colors">
                          {isPaused ? <><Play className="w-3.5 h-3.5" /> Reprendre</> : <><Pause className="w-3.5 h-3.5" /> Pause</>}
                        </button>
                        <button onClick={stop}
                          className="px-3 py-2 rounded-xl border border-border/60 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                          <Square className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )}
                    <Toggle on={settings.subtitles} label="Lecture auto des pages" icon={<Captions className="w-3.5 h-3.5 text-muted-foreground" />}
                      onToggle={() => updateSettings({ subtitles: !settings.subtitles })} />
                  </div>
                )}
              </div>

              <div className="border-t border-border/60" />

              {/* ── Taille du texte ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">🔤 Taille du texte</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateSettings({ fontSize: 'normal' })} className="p-2 rounded-xl hover:bg-muted transition-colors">
                    <ZoomOut className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <div className="flex-1 flex gap-1">
                    {(['normal','large','xl'] as const).map(size => (
                      <button key={size} onClick={() => updateSettings({ fontSize: size })}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          settings.fontSize === size ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}>
                        {FONT_LABELS[size]}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => updateSettings({ fontSize: 'xl' })} className="p-2 rounded-xl hover:bg-muted transition-colors">
                    <ZoomIn className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* ── Espacement des lignes ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">↕️ Interligne</p>
                <div className="flex gap-1">
                  {(['normal','relaxed','loose'] as const).map(sp => (
                    <button key={sp} onClick={() => updateSettings({ lineSpacing: sp })}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        settings.lineSpacing === sp ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}>
                      {LINE_LABELS[sp]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/60" />

              {/* ── Toggles ── */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">👁️ Affichage</p>
                <Toggle on={settings.highContrast} label="Contraste élevé" icon={<Sun className="w-4 h-4 text-muted-foreground" />}
                  onToggle={() => updateSettings({ highContrast: !settings.highContrast })} />
                <Toggle on={settings.dyslexicFont} label="Police dyslexique" icon={<Type className="w-4 h-4 text-muted-foreground" />}
                  onToggle={() => updateSettings({ dyslexicFont: !settings.dyslexicFont })} />
                <Toggle on={settings.reducedMotion} label="Réduire les animations" icon={<Eye className="w-4 h-4 text-muted-foreground" />}
                  onToggle={() => updateSettings({ reducedMotion: !settings.reducedMotion })} />
              </div>

              <div className="border-t border-border/60" />

              {/* ── Malentendants ── */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">👂 Malentendants</p>
                <Toggle on={settings.visualAlerts} label="Alertes visuelles (flash)" icon={<EarOff className="w-4 h-4 text-muted-foreground" />}
                  onToggle={() => updateSettings({ visualAlerts: !settings.visualAlerts })} />
                <p className="text-[10px] text-muted-foreground pl-6">Un flash visuel remplace les notifications sonores</p>
              </div>

              {/* Indicateur lecture en cours */}
              {isSpeaking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-xl">
                  <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-xs text-primary font-medium">Lecture en cours…</span>
                </motion.div>
              )}

              {/* Reset */}
              <button onClick={() => { updateSettings(DEFAULTS); setSettings(DEFAULTS); }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                Réinitialiser tous les paramètres
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bouton FAB */}
        <motion.button
          onClick={() => setIsOpen(v => !v)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all ${
            isSpeaking
              ? 'bg-red-500 text-white shadow-red-500/40'
              : isOpen
                ? 'bg-primary text-primary-foreground shadow-primary/40'
                : 'bg-card border-2 border-primary text-primary shadow-primary/20 hover:bg-primary hover:text-primary-foreground'
          }`}
          aria-label="Accessibilité (Alt+A)"
          title="Accessibilité (Alt+A)"
        >
          {isSpeaking ? (
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
              <Volume2 className="w-6 h-6" />
            </motion.div>
          ) : (
            <>
              <Accessibility className="w-6 h-6" />
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </>
          )}
        </motion.button>
      </div>

      {/* ── Styles globaux d'accessibilité ── */}
      <style>{`
        /* Contraste élevé */
        .high-contrast { filter: contrast(1.4) brightness(1.05); }
        .high-contrast .text-muted-foreground { opacity: 1 !important; }

        /* Police dyslexique (OpenDyslexic via CDN) */
        @font-face {
          font-family: 'OpenDyslexic';
          src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff') format('woff');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'OpenDyslexic';
          src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Bold.woff') format('woff');
          font-weight: bold;
          font-style: normal;
          font-display: swap;
        }
        .dyslexic-font, .dyslexic-font * {
          font-family: 'OpenDyslexic', sans-serif !important;
          letter-spacing: 0.05em !important;
          word-spacing: 0.12em !important;
        }
        .dyslexic-font h1, .dyslexic-font h2, .dyslexic-font h3 {
          letter-spacing: 0.02em !important;
        }

        /* Interligne */
        .line-spacing-relaxed { line-height: 1.8 !important; }
        .line-spacing-relaxed p, .line-spacing-relaxed span, .line-spacing-relaxed li { line-height: 1.8 !important; }
        .line-spacing-loose { line-height: 2.2 !important; }
        .line-spacing-loose p, .line-spacing-loose span, .line-spacing-loose li { line-height: 2.2 !important; }

        /* Réduire les animations */
        .reduce-motion *, .reduce-motion *::before, .reduce-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `}</style>
    </>
  );
};
