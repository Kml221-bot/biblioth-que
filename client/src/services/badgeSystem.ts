
import { getActiveBorrows, getHistory, type BorrowedBook, type HistoryItem } from './borrowStore';

// ─── Types ──────────────────────────────────────────────────
export interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  category: 'lecture' | 'collection' | 'culture' | 'fidelite' | 'special';
  unlocked: boolean;
  unlockedAt?: string;
  rarity: 'commun' | 'rare' | 'epique' | 'legendaire';
  progress?: number;   // 0-100 si badge à progression
  progressLabel?: string;
}

export interface Level {
  level: number;
  name: string;
  emoji: string;
  minBooks: number;
  maxBooks: number;
  color: string;
  bgColor: string;
}

export interface GamificationData {
  totalBorrows: number;
  activeBorrows: number;
  returnedBooks: number;
  africanBooks: number;
  mangaBooks: number;
  hasLateReturn: boolean;
  profileComplete: boolean;
  currentLevel: Level;
  nextLevel: Level | null;
  progressToNext: number;
  badges: Badge[];
  unlockedCount: number;
  totalCount: number;
  xp: number;
}

// ─── Niveaux de lecture ──────────────────────────────────────
export const LEVELS: Level[] = [
  { level: 1, name: 'Lecteur Novice',   emoji: '🌱', minBooks: 0,  maxBooks: 1,  color: 'text-green-600',  bgColor: 'bg-green-100 dark:bg-green-900/30' },
  { level: 2, name: 'Lecteur Curieux',  emoji: '📖', minBooks: 2,  maxBooks: 5,  color: 'text-blue-600',   bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { level: 3, name: 'Lecteur Assidu',   emoji: '🎯', minBooks: 6,  maxBooks: 10, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  { level: 4, name: 'Lecteur Expert',   emoji: '🏆', minBooks: 11, maxBooks: 20, color: 'text-amber-600',  bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  { level: 5, name: 'Grand Lecteur',    emoji: '👑', minBooks: 21, maxBooks: 50, color: 'text-rose-600',   bgColor: 'bg-rose-100 dark:bg-rose-900/30' },
  { level: 6, name: 'Légende BiblioTech', emoji: '⭐', minBooks: 51, maxBooks: 9999, color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
];

// ─── Définition des 12 badges ────────────────────────────────
function buildBadges(data: {
  total: number; returned: number; active: number;
  africanBooks: number; mangaBooks: number;
  hasLate: boolean; profileComplete: boolean;
  categories: string[];
}): Badge[] {
  const t = data.total;

  return [
    {
      id: 'premier-pas',
      emoji: '🎉',
      name: 'Premier Pas',
      description: 'Emprunter ton premier livre',
      category: 'lecture',
      rarity: 'commun',
      unlocked: t >= 1,
      progress: Math.min(100, t * 100),
      progressLabel: `${Math.min(t, 1)}/1 emprunt`,
    },
    {
      id: 'boulimique',
      emoji: '📚',
      name: 'Boulimique de livres',
      description: 'Emprunter 5 livres au total',
      category: 'lecture',
      rarity: 'commun',
      unlocked: t >= 5,
      progress: Math.min(100, (t / 5) * 100),
      progressLabel: `${Math.min(t, 5)}/5 livres`,
    },
    {
      id: 'erudit',
      emoji: '🎓',
      name: 'Érudit',
      description: 'Emprunter 10 livres au total',
      category: 'lecture',
      rarity: 'rare',
      unlocked: t >= 10,
      progress: Math.min(100, (t / 10) * 100),
      progressLabel: `${Math.min(t, 10)}/10 livres`,
    },
    {
      id: 'legende',
      emoji: '👑',
      name: 'Légende',
      description: 'Emprunter 20 livres — statut de légende',
      category: 'lecture',
      rarity: 'legendaire',
      unlocked: t >= 20,
      progress: Math.min(100, (t / 20) * 100),
      progressLabel: `${Math.min(t, 20)}/20 livres`,
    },
    {
      id: 'africaniste',
      emoji: '🌍',
      name: 'Africaniste',
      description: 'Lire un livre de littérature africaine',
      category: 'culture',
      rarity: 'commun',
      unlocked: data.africanBooks >= 1,
      progress: Math.min(100, data.africanBooks * 100),
      progressLabel: `${Math.min(data.africanBooks, 1)}/1 livre africain`,
    },
    {
      id: 'otaku',
      emoji: '⛩️',
      name: 'Otaku',
      description: 'Emprunter un manga ou une BD',
      category: 'culture',
      rarity: 'commun',
      unlocked: data.mangaBooks >= 1,
      progress: Math.min(100, data.mangaBooks * 100),
      progressLabel: `${Math.min(data.mangaBooks, 1)}/1 manga`,
    },
    {
      id: 'explorateur',
      emoji: '🗺️',
      name: 'Explorateur culturel',
      description: 'Lire dans 3 catégories différentes',
      category: 'culture',
      rarity: 'rare',
      unlocked: data.categories.length >= 3,
      progress: Math.min(100, (data.categories.length / 3) * 100),
      progressLabel: `${Math.min(data.categories.length, 3)}/3 catégories`,
    },
    {
      id: 'ponctuel',
      emoji: '⏰',
      name: 'Toujours à l\'heure',
      description: 'N\'avoir aucun retard sur ses emprunts',
      category: 'fidelite',
      rarity: 'rare',
      unlocked: t >= 1 && !data.hasLate,
      progressLabel: data.hasLate ? 'Retard détecté' : 'Aucun retard !',
    },
    {
      id: 'actif',
      emoji: '🔥',
      name: 'Lecteur Actif',
      description: 'Avoir au moins 1 emprunt en cours',
      category: 'fidelite',
      rarity: 'commun',
      unlocked: data.active >= 1,
      progressLabel: `${data.active} emprunt(s) actif(s)`,
    },
    {
      id: 'collectionneur',
      emoji: '💎',
      name: 'Collectionneur',
      description: 'Avoir 3 emprunts actifs en même temps',
      category: 'collection',
      rarity: 'epique',
      unlocked: data.active >= 3,
      progress: Math.min(100, (data.active / 3) * 100),
      progressLabel: `${Math.min(data.active, 3)}/3 emprunts actifs`,
    },
    {
      id: 'profil-complet',
      emoji: '⭐',
      name: 'Profil Complet',
      description: 'Compléter toutes les infos de profil',
      category: 'special',
      rarity: 'commun',
      unlocked: data.profileComplete,
      progressLabel: data.profileComplete ? 'Profil complété !' : 'Remplis ton profil',
    },
    {
      id: 'senegalais',
      emoji: '🇸🇳',
      name: 'Fier Sénégalais',
      description: 'Lire 3 livres d\'auteurs sénégalais',
      category: 'special',
      rarity: 'epique',
      unlocked: data.africanBooks >= 3,
      progress: Math.min(100, (data.africanBooks / 3) * 100),
      progressLabel: `${Math.min(data.africanBooks, 3)}/3 livres sénégalais`,
    },
  ];
}

// ─── Calcul principal ─────────────────────────────────────────
export function computeGamificationFromActivity(active: BorrowedBook[], history: HistoryItem[]): GamificationData {
  const profile = (() => { try { return JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch { return {}; } })();

  const total     = active.length + history.length;
  const returned  = history.length;
  const hasLate   = active.some(b => new Date(b.dueDate) < new Date());

  // Catégories lues
  const allBorrows  = [...active, ...history];
  const categories  = Array.from(new Set(allBorrows.map((b: any) => b.category).filter(Boolean)));
  const africanBooks = allBorrows.filter((b: any) =>
    b.category === 'Littérature Africaine' || (b.id && String(b.id).startsWith('af-'))
  ).length;
  const mangaBooks = allBorrows.filter((b: any) =>
    b.category === 'Manga & BD' || (b.id && String(b.id).startsWith('mg-'))
  ).length;

  const profileComplete = !!(
    profile.firstName && profile.lastName && profile.email &&
    profile.phone && profile.address
  );

  // Niveau actuel
  const currentLevel = LEVELS.find(l => total >= l.minBooks && total <= l.maxBooks) ?? LEVELS[0];
  const nextLevelIdx = LEVELS.findIndex(l => l.level === currentLevel.level) + 1;
  const nextLevel    = nextLevelIdx < LEVELS.length ? LEVELS[nextLevelIdx] : null;

  const progressToNext = nextLevel
    ? Math.round(((total - currentLevel.minBooks) / (nextLevel.minBooks - currentLevel.minBooks)) * 100)
    : 100;

  // Badges
  const badges = buildBadges({ total, returned, active: active.length, africanBooks, mangaBooks, hasLate, profileComplete, categories });
  const unlockedCount = badges.filter(b => b.unlocked).length;

  // XP : 10 par livre + 50 par badge
  const xp = total * 10 + unlockedCount * 50;

  return {
    totalBorrows: total, activeBorrows: active.length, returnedBooks: returned,
    africanBooks, mangaBooks, hasLateReturn: hasLate, profileComplete,
    currentLevel, nextLevel, progressToNext,
    badges, unlockedCount, totalCount: badges.length, xp,
  };
}

export function computeGamification(): GamificationData {
  return computeGamificationFromActivity(getActiveBorrows(), getHistory());
}
