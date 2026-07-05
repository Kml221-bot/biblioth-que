// ============================================================
// BiblioTech — Lecteur audio flottant
// Persiste entre les navigations — Web Speech API
// Apparaît dès qu'une lecture audio est en cours.
// ============================================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, BookOpen, Volume2 } from 'lucide-react';
import { useSpeechContext } from '@/contexts/SpeechContext';

export function FloatingAudioPlayer() {
  const { isSpeaking, isPaused, track, progress, pause, resume, stop } = useSpeechContext();

  const isVisible = !!track;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg"
        >
          <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden">
            {/* Barre de progression */}
            <div className="h-1 bg-muted">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              {/* Icône livre animée */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isSpeaking ? 'bg-primary/15 animate-pulse' : 'bg-muted'
              }`}>
                {isSpeaking ? (
                  <Volume2 className="w-4 h-4 text-primary" />
                ) : (
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Infos livre */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{track?.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {isPaused ? '⏸ En pause' : isSpeaking ? '🔊 Lecture en cours...' : 'Prêt'}
                  {progress > 0 && ` · ${progress}%`}
                </p>
              </div>

              {/* Contrôles */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {isSpeaking ? (
                  <button
                    onClick={pause}
                    className="w-9 h-9 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                    title="Pause"
                  >
                    <Pause className="w-4 h-4 text-primary" />
                  </button>
                ) : (
                  <button
                    onClick={resume}
                    disabled={!isPaused}
                    className="w-9 h-9 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors disabled:opacity-40"
                    title="Reprendre"
                  >
                    <Play className="w-4 h-4 text-primary" />
                  </button>
                )}

                <button
                  onClick={stop}
                  className="w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                  title="Arrêter"
                >
                  <Square className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
