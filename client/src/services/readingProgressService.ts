// ============================================================
// BiblioTech — Service de progression de lecture (Supabase)
// Sauvegarde et récupère la progression en temps réel
// ============================================================

import { supabase } from '@/lib/supabase';

export interface ReadingProgressData {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentageLu: number;
  tempsLectureMinutes: number;
  derniereLecture: string;
}

/**
 * Récupère la progression de lecture d'un livre
 */
export async function getReadingProgress(userId: string, bookId: string): Promise<ReadingProgressData | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('reading_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .single();

  if (error || !data) return null;

  return {
    bookId: data.book_id,
    currentPage: data.current_page,
    totalPages: data.total_pages,
    percentageLu: data.pourcentage_lu,
    tempsLectureMinutes: data.temps_lecture_minutes,
    derniereLecture: data.derniere_lecture,
  };
}

/**
 * Sauvegarde la progression de lecture (upsert)
 */
export async function saveReadingProgress(
  userId: string,
  bookId: string,
  currentPage: number,
  totalPages: number,
  tempsLectureMinutes: number = 0,
  epubcfi: string | null = null,
) {
  const pourcentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 10000) / 100 : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('reading_progress')
    .upsert({
      user_id: userId,
      book_id: bookId,
      current_page: currentPage,
      total_pages: totalPages,
      pourcentage_lu: pourcentage,
      temps_lecture_minutes: tempsLectureMinutes,
      epubcfi: epubcfi,
      derniere_lecture: new Date().toISOString(),
    }, {
      onConflict: 'user_id,book_id',
    });

  if (error) {
    console.error('Erreur sauvegarde progression:', error);
  }
}

/**
 * Démarre une session de lecture
 */
export async function startReadingSession(userId: string, bookId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('reading_sessions')
    .insert({
      user_id: userId,
      book_id: bookId,
      debut: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Erreur début session:', error);
    return null;
  }
  return data?.id || null;
}

/**
 * Termine une session de lecture
 */
export async function endReadingSession(
  sessionId: string,
  pagesLues: number,
  dureeMinutes: number,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('reading_sessions')
    .update({
      fin: new Date().toISOString(),
      pages_lues: pagesLues,
      duree_minutes: dureeMinutes,
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Erreur fin session:', error);
  }
}

/**
 * Sauvegarde une note/surlignage
 */
export async function saveBookNote(
  userId: string,
  bookId: string,
  page: number,
  contenu: string,
  type: 'note' | 'surlignage' = 'note',
  couleur: string = '#FFFF00',
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('book_notes')
    .insert({
      user_id: userId,
      book_id: bookId,
      page,
      contenu,
      type,
      couleur,
    })
    .select()
    .single();

  if (error) {
    console.error('Erreur sauvegarde note:', error);
    return null;
  }
  return data;
}

/**
 * Récupère les notes d'un livre
 */
export async function getBookNotes(userId: string, bookId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('book_notes')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .order('page', { ascending: true });

  if (error) {
    console.error('Erreur chargement notes:', error);
    return [];
  }
  return data || [];
}

/**
 * Supprime une note
 */
export async function deleteBookNote(noteId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('book_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('Erreur suppression note:', error);
  }
}
