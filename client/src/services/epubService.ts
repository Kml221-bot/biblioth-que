
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────
export interface EpubAnnotationDB {
  id: string;
  user_id: string;
  book_id: string;
  page: number;
  type: 'note' | 'surlignage' | 'signet';
  contenu: string | null;
  couleur: string;
  epubcfi: string | null;
  selected_text: string | null;
  chapter_label: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface EpubBookmarkDB {
  id: string;
  user_id: string;
  book_id: string;
  page: number;
  type: 'signet';
  contenu: string | null;
  epubcfi: string;
  chapter_label: string | null;
  created_at: string;
}

export interface ReadingProgressDB {
  id?: string;
  user_id: string;
  book_id: string;
  current_page: number;
  total_pages: number;
  pourcentage_lu: number;
  temps_lecture_minutes: number;
  epubcfi: string | null;
  chapitres_lus: number;
  derniere_lecture: string;
}

export interface UserStatsDB {
  streak_jours: number;
  best_streak: number;
  xp: number;
  level: number;
  biblio_coins: number;
  weekly_goal_minutes: number;
  weekly_progress_min: number;
  freeze_used_this_week: boolean;
  last_read_at: string | null;
  livres_lus: number;
  pages_lues: number;
  minutes_lecture: number;
}

export interface UserReadingPrefsDB {
  theme: string;
  font_family: string;
  font_size: number;
  line_height: number;
  margin: string;
  justified: boolean;
  brightness: number;
  reading_mode: string;
  auto_night: boolean;
}

// ─── Couleur map (enum DB ↔ hex) ──────────────────────────
// La contrainte DB autorise : 'jaune', 'vert', 'orange', 'violet', 'bleu', '#FFFF00'
const COLOR_TO_ENUM: Record<string, string> = {
  '#FDE68A': 'jaune',
  '#A7F3D0': 'vert',
  '#BFDBFE': 'bleu',
  '#FBCFE8': 'violet',
  '#FED7AA': 'orange',
};

const ENUM_TO_COLOR: Record<string, string> = {
  'jaune':   '#FDE68A',
  'vert':    '#A7F3D0',
  'bleu':    '#BFDBFE',
  'violet':  '#FBCFE8',
  'orange':  '#FED7AA',
  '#FFFF00': '#FDE68A',
};

function colorToEnum(hex: string): string {
  return COLOR_TO_ENUM[hex] || 'yellow';
}

function enumToColor(enumVal: string): string {
  return ENUM_TO_COLOR[enumVal] || '#FDE68A';
}

// ════════════════════════════════════════════════════════════
//  ANNOTATIONS (surlignages + notes)
// ════════════════════════════════════════════════════════════

/**
 * Récupère toutes les annotations EPUB d'un livre
 */
export async function getEpubAnnotations(userId: string, bookId: string) {
    const { data, error } = await supabase
    .from('book_notes')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .in('type', ['surlignage', 'note'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erreur chargement annotations EPUB:', error);
    return [];
  }

  return ((data || []) as EpubAnnotationDB[]).map((row) => ({
    id: row.id,
    cfi: row.epubcfi || '',
    text: row.selected_text || row.contenu || '',
    color: enumToColor(row.couleur),
    note: row.type === 'note' ? (row.contenu ?? undefined) : undefined,
    chapter: row.chapter_label || undefined,
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Sauvegarde une annotation EPUB (surlignage ou note)
 */
export async function saveEpubAnnotation(
  userId: string,
  bookId: string,
  annotation: {
    cfi: string;
    text: string;
    color: string;
    note?: string;
    chapter?: string;
    page?: number;
  }
) {
    const { data, error } = await supabase
    .from('book_notes')
    .insert({
      user_id: userId,
      book_id: bookId,
      page: annotation.page || 0,
      type: annotation.note ? 'note' : 'surlignage',
      contenu: annotation.note || annotation.text,
      couleur: colorToEnum(annotation.color),
      epubcfi: annotation.cfi,
      selected_text: annotation.text,
      chapter_label: annotation.chapter || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Erreur sauvegarde annotation EPUB:', error);
    return null;
  }
  return data?.id || null;
}

/**
 * Met à jour la note d'une annotation existante
 */
export async function updateAnnotationNote(annotationId: string, note: string) {
  const { error } = await supabase
    .from('book_notes')
    .update({ contenu: note, type: 'note' })
    .eq('id', annotationId);

  if (error) {
    console.error('Erreur mise à jour note:', error);
  }
}

/**
 * Supprime une annotation EPUB
 */
export async function deleteEpubAnnotation(annotationId: string) {
  const { error } = await supabase
    .from('book_notes')
    .delete()
    .eq('id', annotationId);

  if (error) {
    console.error('Erreur suppression annotation:', error);
  }
}

// ════════════════════════════════════════════════════════════
//  MARQUE-PAGES
// ════════════════════════════════════════════════════════════

/**
 * Récupère tous les marque-pages EPUB d'un livre
 */
export async function getEpubBookmarks(userId: string, bookId: string) {
    const { data, error } = await supabase
    .from('book_notes')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('type', 'signet')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erreur chargement marque-pages:', error);
    return [];
  }

  return (data || []).map((row: EpubBookmarkDB) => ({
    id: row.id,
    cfi: row.epubcfi,
    label: row.contenu || row.chapter_label || 'Marque-page',
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Ajoute un marque-page EPUB
 */
export async function saveEpubBookmark(
  userId: string,
  bookId: string,
  bookmark: { cfi: string; label: string; page?: number }
) {
    const { data, error } = await supabase
    .from('book_notes')
    .insert({
      user_id: userId,
      book_id: bookId,
      page: bookmark.page || 0,
      type: 'signet',
      contenu: bookmark.label,
      couleur: 'jaune',
      epubcfi: bookmark.cfi,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Erreur sauvegarde marque-page:', error);
    return null;
  }
  return data?.id || null;
}

/**
 * Supprime un marque-page
 */
export async function deleteEpubBookmark(bookmarkId: string) {
  const { error } = await supabase
    .from('book_notes')
    .delete()
    .eq('id', bookmarkId);

  if (error) {
    console.error('Erreur suppression marque-page:', error);
  }
}

// ════════════════════════════════════════════════════════════
//  PROGRESSION DE LECTURE (avec epubcfi)
// ════════════════════════════════════════════════════════════

/**
 * Récupère la progression EPUB d'un livre (inclut epubcfi)
 */
export async function getEpubProgress(userId: string, bookId: string) {
    const { data, error } = await supabase
    .from('reading_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .single();

  if (error || !data) return null;

  return {
    currentPage: data.current_page as number,
    totalPages: data.total_pages as number,
    percentage: Number(data.pourcentage_lu),
    readingTimeMinutes: data.temps_lecture_minutes as number,
    epubcfi: data.epubcfi as string | null,
    chaptersRead: data.chapitres_lus as number,
    lastRead: data.derniere_lecture as string,
  };
}

/**
 * Sauvegarde la progression EPUB (upsert avec epubcfi)
 */
export async function saveEpubProgress(
  userId: string,
  bookId: string,
  progress: {
    currentPage: number;
    totalPages: number;
    percentage: number;
    readingTimeMinutes?: number;
    epubcfi?: string;
    chaptersRead?: number;
  }
) {
  const { error } = await supabase
    .from('reading_progress')
    .upsert({
      user_id: userId,
      book_id: bookId,
      current_page: progress.currentPage,
      total_pages: progress.totalPages,
      pourcentage_lu: progress.percentage,
      temps_lecture_minutes: progress.readingTimeMinutes || 0,
      epubcfi: progress.epubcfi || null,
      chapitres_lus: progress.chaptersRead || 0,
      derniere_lecture: new Date().toISOString(),
    }, {
      onConflict: 'user_id,book_id',
    });

  if (error) {
    console.error('Erreur sauvegarde progression EPUB:', error);
  }
}

// ════════════════════════════════════════════════════════════
//  STREAK & GAMIFICATION
// ════════════════════════════════════════════════════════════

/**
 * Récupère les stats de l'utilisateur (streak, XP, etc.)
 */
export async function getUserStats(userId: string) {
    const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      lastReadDate: null,
      freezeAvailable: true,
      todayCompleted: false,
      weeklyGoal: 60,
      weeklyProgress: 0,
      xp: 0,
      level: 1,
      biblioCoins: 0,
    };
  }

  const today = new Date().toISOString().split('T')[0];
  const lastRead = data.last_read_at ? new Date(data.last_read_at).toISOString().split('T')[0] : null;

  return {
    currentStreak: data.streak_jours as number,
    bestStreak: (data.best_streak || 0) as number,
    lastReadDate: data.last_read_at as string | null,
    freezeAvailable: !(data.freeze_used_this_week as boolean),
    todayCompleted: lastRead === today,
    weeklyGoal: (data.weekly_goal_minutes || 60) as number,
    weeklyProgress: (data.weekly_progress_min || 0) as number,
    xp: (data.xp || 0) as number,
    level: (data.level || 1) as number,
    biblioCoins: (data.biblio_coins || 0) as number,
  };
}

/**
 * Met à jour le streak après une session de lecture
 */
export async function updateStreakAfterReading(userId: string, readingMinutes: number) {
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (!stats) {
    await supabase.from('user_stats').insert({
      user_id: userId,
      streak_jours: 1,
      best_streak: 1,
      xp: 10 + readingMinutes,
      level: 1,
      biblio_coins: 5,
      weekly_progress_min: readingMinutes,
      last_read_at: today.toISOString(),
      minutes_lecture: readingMinutes,
    });
    return;
  }

  const lastRead = stats.last_read_at ? new Date(stats.last_read_at).toISOString().split('T')[0] : null;

  if (lastRead === todayStr) {
    await supabase
      .from('user_stats')
      .update({
        minutes_lecture: (stats.minutes_lecture || 0) + readingMinutes,
        weekly_progress_min: (stats.weekly_progress_min || 0) + readingMinutes,
        xp: (stats.xp || 0) + readingMinutes,
        last_read_at: today.toISOString(),
      })
      .eq('user_id', userId);
    return;
  }

  // Calculer si le streak continue
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const isConsecutive = lastRead === yesterdayStr;
  const newStreak = isConsecutive ? (stats.streak_jours || 0) + 1 : 1;
  const bestStreak = Math.max(newStreak, stats.best_streak || 0);

  // XP bonus pour le streak
  const streakBonus = newStreak >= 30 ? 50 : newStreak >= 7 ? 20 : newStreak >= 3 ? 10 : 5;
  const newXp = (stats.xp || 0) + readingMinutes + streakBonus;
  const newLevel = Math.floor(newXp / 500) + 1;
  const newCoins = (stats.biblio_coins || 0) + Math.floor(streakBonus / 2);

  await supabase
    .from('user_stats')
    .update({
      streak_jours: newStreak,
      best_streak: bestStreak,
      xp: newXp,
      level: newLevel,
      biblio_coins: newCoins,
      minutes_lecture: (stats.minutes_lecture || 0) + readingMinutes,
      weekly_progress_min: (stats.weekly_progress_min || 0) + readingMinutes,
      last_read_at: today.toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Utilise un gel de streak
 */
export async function useStreakFreeze(userId: string) {
  const { error } = await supabase
    .from('user_stats')
    .update({
      freeze_used_this_week: true,
      last_read_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Erreur gel de streak:', error);
  }
}

// ════════════════════════════════════════════════════════════
//  PRÉFÉRENCES DE LECTURE (sync cloud)
// ════════════════════════════════════════════════════════════

/**
 * Récupère les préférences de lecture depuis la DB
 */
export async function getReadingPreferencesFromDB(userId: string) {
    const { data, error } = await supabase
    .from('user_reading_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  return {
    theme: data.theme as string,
    font: data.font_family as string,
    fontSize: data.font_size as number,
    lineHeight: Number(data.line_height),
    margin: data.margin as string,
    justified: data.justified as boolean,
    brightness: Number(data.brightness),
    mode: data.reading_mode as string,
    autoNight: data.auto_night as boolean,
  };
}

/**
 * Sauvegarde les préférences de lecture dans la DB (upsert)
 */
export async function saveReadingPreferencesToDB(
  userId: string,
  prefs: {
    theme: string;
    font: string;
    fontSize: number;
    lineHeight: number;
    margin: string;
    justified: boolean;
    brightness: number;
    mode: string;
    autoNight: boolean;
  }
) {
  const { error } = await supabase
    .from('user_reading_preferences')
    .upsert({
      user_id: userId,
      theme: prefs.theme,
      font_family: prefs.font,
      font_size: prefs.fontSize,
      line_height: prefs.lineHeight,
      margin: prefs.margin,
      justified: prefs.justified,
      brightness: prefs.brightness,
      reading_mode: prefs.mode,
      auto_night: prefs.autoNight,
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Erreur sauvegarde préférences:', error);
  }
}

// ════════════════════════════════════════════════════════════
//  BADGES
// ════════════════════════════════════════════════════════════

/**
 * Récupère les badges débloqués par l'utilisateur
 */
export async function getUserBadges(userId: string) {
    const { data, error } = await supabase
    .from('user_badges')
    .select('*, badge:badges(*)')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });

  if (error) {
    console.error('Erreur chargement badges:', error);
    return [];
  }

  return (data || []).map((row: { badge: { code: string; nom: string; description: string; icon_url: string | null }; unlocked_at: string }) => ({
    code: row.badge.code,
    name: row.badge.nom,
    description: row.badge.description,
    iconUrl: row.badge.icon_url,
    unlockedAt: new Date(row.unlocked_at),
  }));
}
