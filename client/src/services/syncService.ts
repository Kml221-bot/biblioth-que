// ============================================================
// BiblioTech — Service de synchronisation offline → online
// Synchronise les données accumulées hors-ligne quand
// la connexion revient (progression, notes, sessions)
// ============================================================

import { supabase } from '@/lib/supabase';
import {
  getPendingSyncActions,
  removeSyncAction,
  cleanExpiredBooks,
  type SyncAction,
} from './offlineStorage';

/** Synchronise toutes les actions en attente */
export async function syncPendingActions(): Promise<{
  synced: number;
  failed: number;
}> {
  const actions = await getPendingSyncActions();
  let synced = 0;
  let failed = 0;

  for (const action of actions) {
    try {
      await processAction(action);
      await removeSyncAction(action.id);
      synced++;
    } catch (err) {
      console.error(`Sync échouée pour ${action.type}:`, err);
      failed++;
    }
  }

  // Nettoyer les livres expirés
  await cleanExpiredBooks();

  return { synced, failed };
}

/** Traite une action individuelle */
async function processAction(action: SyncAction): Promise<void> {
  const { type, payload } = action;

  switch (type) {
    case 'reading_progress': {
      const { user_id, book_id, current_page, total_pages, temps_lecture_minutes } = payload as {
        user_id: string;
        book_id: string;
        current_page: number;
        total_pages: number;
        temps_lecture_minutes: number;
      };

      const pourcentage = total_pages > 0 ? Math.round((current_page / total_pages) * 100) : 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('reading_progress')
        .upsert(
          {
            user_id,
            book_id,
            current_page,
            total_pages,
            pourcentage_lu: pourcentage,
            temps_lecture_minutes,
            derniere_lecture: new Date().toISOString(),
          },
          { onConflict: 'user_id,book_id' }
        );
      break;
    }

    case 'book_note': {
      const { user_id, book_id, page, contenu, couleur, note_type } = payload as {
        user_id: string;
        book_id: string;
        page: number;
        contenu: string;
        couleur: string;
        note_type: 'note' | 'surlignage';
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('book_notes')
        .insert({
          user_id,
          book_id,
          page,
          contenu,
          couleur,
          type: note_type,
        });
      break;
    }

    case 'reading_session': {
      const { user_id, book_id, debut, fin, pages_lues, duree_minutes } = payload as {
        user_id: string;
        book_id: string;
        debut: string;
        fin: string;
        pages_lues: number;
        duree_minutes: number;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('reading_sessions')
        .insert({
          user_id,
          book_id,
          debut,
          fin,
          pages_lues,
          duree_minutes,
        });
      break;
    }

    default:
      console.warn(`Type d'action sync inconnu: ${type}`);
  }
}

/** Démarre l'écoute de la reconnexion pour sync auto */
export function startAutoSync(onSync?: (result: { synced: number; failed: number }) => void): () => void {
  const handler = async () => {
    if (navigator.onLine) {
      // Petit délai pour laisser la connexion se stabiliser
      await new Promise(resolve => setTimeout(resolve, 2000));
      const result = await syncPendingActions();
      if (result.synced > 0 || result.failed > 0) {
        onSync?.(result);
      }
    }
  };

  window.addEventListener('online', handler);

  return () => {
    window.removeEventListener('online', handler);
  };
}
