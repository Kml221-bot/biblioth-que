
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Snowflake, Trophy, Star, X, Zap } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastReadDate: string | null;
  freezeAvailable: boolean;
  todayCompleted: boolean;
  weeklyGoal: number;      // minutes par semaine
  weeklyProgress: number;  // minutes cette semaine
  xp: number;
  level: number;
  biblioCoins: number;
}

interface BadgeData {
  id: string;
  name: string;
  emoji: string;
  description: string;
  unlockedAt?: Date;
  progress?: number;  // 0-100
  requirement: string;
}

interface StreakBadgeProps {
  streak: StreakData;
  badges: BadgeData[];
  onFreeze?: () => void;
  compact?: boolean;
}

// ─── Badges par défaut ────────────────────────────────────
const DEFAULT_BADGES: BadgeData[] = [
  { id: 'first-read', name: 'Premier pas', emoji: '📖', description: 'Lire un premier livre', requirement: 'Lire 1 page' },
  { id: 'streak-3', name: 'Régulier', emoji: '🔥', description: 'Streak de 3 jours', requirement: '3 jours consécutifs' },
  { id: 'streak-7', name: 'Habitué', emoji: '⚡', description: 'Streak de 7 jours', requirement: '7 jours consécutifs' },
  { id: 'streak-30', name: 'Passionné', emoji: '💎', description: 'Streak de 30 jours', requirement: '30 jours consécutifs' },
  { id: 'pages-100', name: 'Explorateur', emoji: '🗺️', description: 'Lire 100 pages', requirement: '100 pages lues' },
  { id: 'pages-500', name: 'Aventurier', emoji: '⛰️', description: 'Lire 500 pages', requirement: '500 pages lues' },
  { id: 'books-5', name: 'Bibliophile', emoji: '📚', description: 'Terminer 5 livres', requirement: '5 livres terminés' },
  { id: 'books-10', name: 'Dévoreur', emoji: '🐉', description: 'Terminer 10 livres', requirement: '10 livres terminés' },
  { id: 'night-owl', name: 'Hibou', emoji: '🦉', description: 'Lire après minuit', requirement: 'Lire entre 0h et 4h' },
  { id: 'note-taker', name: 'Annotateur', emoji: '✏️', description: 'Créer 20 annotations', requirement: '20 annotations' },
];

// ─── Composant flamme streak ──────────────────────────────
function FlameIcon({ streak, size = 32 }: { streak: number; size?: number }) {
  const color = streak >= 30 ? '#EF4444' : streak >= 7 ? '#F97316' : streak >= 3 ? '#EAB308' : '#94A3B8';
  const glowColor = streak >= 30 ? 'rgba(239,68,68,0.4)' : streak >= 7 ? 'rgba(249,115,22,0.3)' : 'rgba(234,179,8,0.2)';

  return (
    <motion.div
      className="relative inline-flex items-center justify-center"
      animate={streak > 0 ? {
        scale: [1, 1.1, 1],
        filter: [`drop-shadow(0 0 0px ${glowColor})`, `drop-shadow(0 0 8px ${glowColor})`, `drop-shadow(0 0 0px ${glowColor})`],
      } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Flame size={size} fill={color} color={color} />
      {streak > 0 && (
        <motion.span
          className="absolute -bottom-1 -right-2 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black text-white"
          style={{ backgroundColor: color }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          {streak}
        </motion.span>
      )}
    </motion.div>
  );
}

// ─── Composant principal ──────────────────────────────────
export default function StreakBadge({ streak, badges, onFreeze, compact = false }: StreakBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState<'streak' | 'badges'>('streak');

  // Niveau & XP
  const xpForNextLevel = (streak.level + 1) * 500;
  const xpProgress = (streak.xp % 500) / 500 * 100;

  // Objectif hebdomadaire
  const weeklyPercent = streak.weeklyGoal > 0
    ? Math.min(100, Math.round((streak.weeklyProgress / streak.weeklyGoal) * 100))
    : 0;

  // Badges débloqués
  const unlockedBadges = badges.filter(b => b.unlockedAt);
  const lockedBadges = badges.filter(b => !b.unlockedAt);

  // Mode compact : juste la flamme
  if (compact) {
    return (
      <button
        onClick={() => setShowDetails(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:scale-105 active:scale-95"
        style={{
          backgroundColor: streak.currentStreak > 0 ? 'rgba(234,179,8,0.1)' : 'rgba(148,163,184,0.1)',
        }}
      >
        <FlameIcon streak={streak.currentStreak} size={22} />
        <div className="text-left">
          <p className="text-xs font-bold leading-none">{streak.currentStreak}j</p>
          <p className="text-[10px] opacity-60">streak</p>
        </div>
      </button>
    );
  }

  return (
    <>
      {/* ─── Carte streak résumé ─────────────────────── */}
      <motion.div
        className="rounded-2xl p-4 cursor-pointer transition-shadow hover:shadow-lg"
        style={{
          background: streak.currentStreak >= 7
            ? 'linear-gradient(135deg, #FEF3C7, #FDE68A, #FCD34D)'
            : streak.currentStreak >= 3
              ? 'linear-gradient(135deg, #FFF7ED, #FED7AA)'
              : 'linear-gradient(135deg, #F1F5F9, #E2E8F0)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}
        onClick={() => setShowDetails(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlameIcon streak={streak.currentStreak} size={36} />
            <div>
              <p className="text-2xl font-black text-gray-900">
                {streak.currentStreak} <span className="text-sm font-medium opacity-60">jours</span>
              </p>
              <p className="text-xs text-gray-600">
                {streak.todayCompleted ? '✅ Objectif atteint aujourd\'hui' : '📖 Lis pour maintenir ton streak !'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
              <Zap size={14} className="text-yellow-500" />
              <span>{streak.xp} XP</span>
            </div>
            <p className="text-[10px] text-gray-500">Niv. {streak.level}</p>
          </div>
        </div>

        {/* Barre objectif hebdomadaire */}
        {streak.weeklyGoal > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
              <span>Objectif hebdo</span>
              <span>{streak.weeklyProgress}/{streak.weeklyGoal} min</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: weeklyPercent >= 100 ? '#22C55E' : '#EAB308' }}
                initial={{ width: 0 }}
                animate={{ width: `${weeklyPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Badges aperçu */}
        {unlockedBadges.length > 0 && (
          <div className="flex items-center gap-1 mt-3 overflow-x-auto">
            {unlockedBadges.slice(0, 6).map((badge) => (
              <span key={badge.id} className="text-lg flex-shrink-0" title={badge.name}>
                {badge.emoji}
              </span>
            ))}
            {unlockedBadges.length > 6 && (
              <span className="text-xs text-gray-500 ml-1">+{unlockedBadges.length - 6}</span>
            )}
          </div>
        )}
      </motion.div>

      {/* ─── Modal détails ───────────────────────────── */}
      <AnimatePresence>
        {showDetails && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50"
              onClick={() => setShowDetails(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto"
            >
              {/* Poignée */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>

              <div className="px-6 pb-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Ma progression</h3>
                  <button onClick={() => setShowDetails(false)}>
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>

                {/* Onglets */}
                <div className="flex items-center gap-2 mb-5">
                  {[
                    { id: 'streak' as const, label: '🔥 Streak', icon: <Flame size={14} /> },
                    { id: 'badges' as const, label: '🏆 Badges', icon: <Trophy size={14} /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                          : 'bg-gray-100 text-gray-600 border border-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ─── Tab Streak ─────────────────────── */}
                {activeTab === 'streak' && (
                  <div className="space-y-5">
                    {/* Grande flamme */}
                    <div className="flex flex-col items-center py-4">
                      <FlameIcon streak={streak.currentStreak} size={64} />
                      <p className="text-4xl font-black text-gray-900 mt-3">
                        {streak.currentStreak}
                      </p>
                      <p className="text-sm text-gray-500">jours consécutifs</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
                        <p className="text-xl font-bold text-gray-900">{streak.bestStreak}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Record</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-xl">
                        <p className="text-xl font-bold text-yellow-700">{streak.xp}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">XP total</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-xl">
                        <p className="text-xl font-bold text-amber-700">{streak.biblioCoins}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">BiblioCoins</p>
                      </div>
                    </div>

                    {/* Barre XP */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Niveau {streak.level}</span>
                        <span>Niveau {streak.level + 1}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${xpProgress}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 text-right">
                        {streak.xp % 500} / {500} XP
                      </p>
                    </div>

                    {/* Gel de streak */}
                    {streak.freezeAvailable && !streak.todayCompleted && (
                      <button
                        onClick={() => {
                          onFreeze?.();
                          setShowDetails(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 text-blue-700 font-medium text-sm border border-blue-200 transition-colors hover:bg-blue-100"
                      >
                        <Snowflake size={16} />
                        Utiliser un gel de streak (1/semaine)
                      </button>
                    )}
                  </div>
                )}

                {/* ─── Tab Badges ─────────────────────── */}
                {activeTab === 'badges' && (
                  <div className="space-y-4">
                    {/* Débloqués */}
                    {unlockedBadges.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                          Débloqués ({unlockedBadges.length})
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {unlockedBadges.map((badge) => (
                            <motion.div
                              key={badge.id}
                              className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200"
                              whileHover={{ scale: 1.02 }}
                            >
                              <span className="text-2xl">{badge.emoji}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{badge.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">{badge.description}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Verrouillés */}
                    {lockedBadges.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                          À débloquer ({lockedBadges.length})
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {lockedBadges.map((badge) => (
                            <div
                              key={badge.id}
                              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 opacity-60"
                            >
                              <span className="text-2xl grayscale">{badge.emoji}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-700 truncate">{badge.name}</p>
                                <p className="text-[10px] text-gray-400 truncate">{badge.requirement}</p>
                                {badge.progress !== undefined && (
                                  <div className="h-1 rounded-full bg-gray-200 mt-1.5 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gray-400"
                                      style={{ width: `${badge.progress}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export { DEFAULT_BADGES, FlameIcon };
export type { StreakData, BadgeData };
