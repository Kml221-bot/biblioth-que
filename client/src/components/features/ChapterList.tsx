import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, BookOpen, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface Chapter {
  id: string;
  titre: string;
  ordre: number;
  isFree: boolean;
  prixPieces: number;
  isAccessible: boolean;
  isUnlocked: boolean;
  description?: string | null;
}

interface ChapterListProps {
  bookId: string;
  onRead?: (chapter: Chapter) => void;
}

export function ChapterList({ bookId, onRead }: ChapterListProps) {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchChapters = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      // Essayer NestJS d'abord (avec timeout de 4s)
      let nestOk = false;
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`/api/books/${bookId}/chapters`, { headers, signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const json = await res.json();
          const rows = json.data ?? json;
          if (Array.isArray(rows) && rows.length > 0) {
            setChapters(rows);
            nestOk = true;
          }
        }
      } catch { /* NestJS indisponible — fallback Supabase */ }

      if (nestOk) return;

      // Fallback : requête directe Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error: dbErr } = await (supabase as any)
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('ordre');

      if (dbErr || !rows) { setChapters([]); return; }

      let unlockedIds = new Set<string>();
      if (session?.user?.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: access } = await (supabase as any)
          .from('user_chapter_access')
          .select('chapter_id')
          .eq('user_id', session.user.id);
        unlockedIds = new Set((access ?? []).map((a: { chapter_id: string }) => a.chapter_id));
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setChapters((rows as any[]).map(ch => ({
        id: ch.id,
        titre: ch.titre,
        ordre: ch.ordre,
        isFree: ch.is_free ?? ch.isFree ?? false,
        prixPieces: ch.prix_pieces ?? ch.prixPieces ?? 10,
        isAccessible: (ch.is_free ?? ch.isFree) || unlockedIds.has(ch.id),
        isUnlocked: unlockedIds.has(ch.id),
        description: ch.description ?? null,
      })));
    } catch {
      setError('Impossible de charger les chapitres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChapters(); }, [bookId]);

  const handleUnlock = async (chapter: Chapter) => {
    if (!user) return;
    setUnlocking(chapter.id);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Connexion requise');

      const res = await fetch(`/api/chapters/${chapter.id}/unlock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message || json.error || 'Erreur lors du déblocage');
        return;
      }

      await fetchChapters();
      window.dispatchEvent(new Event('coinsUpdated'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setUnlocking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Aucun chapitre disponible pour ce livre.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {chapters.map((chapter, idx) => (
        <motion.div
          key={chapter.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.04 }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
            chapter.isAccessible
              ? 'bg-card border-border hover:border-primary/30'
              : 'bg-muted/30 border-border/50'
          }`}
        >
          {/* Numéro */}
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            chapter.isAccessible
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}>
            {chapter.ordre}
          </span>

          {/* Titre + description */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${
              chapter.isAccessible ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {chapter.titre}
            </p>
            {chapter.description && (
              <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                {chapter.description}
              </p>
            )}
          </div>

          {/* Badge accès */}
          <div className="flex-shrink-0">
            {chapter.isFree ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                Gratuit
              </span>
            ) : chapter.isUnlocked ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Débloqué
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <span>🪙</span> {chapter.prixPieces}
              </span>
            )}
          </div>

          {/* Action */}
          {chapter.isAccessible ? (
            <button
              onClick={() => onRead?.(chapter)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Lire
            </button>
          ) : (
            <button
              onClick={() => handleUnlock(chapter)}
              disabled={!user || unlocking === chapter.id}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {unlocking === chapter.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              Débloquer
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}
