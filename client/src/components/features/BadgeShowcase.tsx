import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Lock, Star, TrendingUp, Zap } from 'lucide-react';
import type { Badge, GamificationData, Level } from '@/services/badgeSystem';

// ─── Couleurs par rareté ─────────────────────────────────────
const RARITY_STYLES: Record<string, { border: string; glow: string; label: string; labelStyle: string }> = {
  commun:    { border: 'border-gray-300 dark:border-gray-600',   glow: '',                         label: 'Commun',    labelStyle: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  rare:      { border: 'border-blue-400 dark:border-blue-500',   glow: 'shadow-blue-200 dark:shadow-blue-900/50',    label: 'Rare',      labelStyle: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  epique:    { border: 'border-purple-400 dark:border-purple-500', glow: 'shadow-purple-200 dark:shadow-purple-900/50', label: 'Épique',   labelStyle: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
  legendaire:{ border: 'border-amber-400 dark:border-amber-500', glow: 'shadow-amber-200 dark:shadow-amber-900/50',  label: 'Légendaire', labelStyle: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
};

// ─── Carte badge individuelle ────────────────────────────────
const BadgeCard: React.FC<{ badge: Badge; index: number }> = ({ badge, index }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const r = RARITY_STYLES[badge.rarity];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip(v => !v)}
    >
      <div className={`
        relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 cursor-pointer
        transition-all duration-300 select-none
        ${badge.unlocked
          ? `${r.border} bg-card hover:scale-105 hover:shadow-lg ${r.glow}`
          : 'border-dashed border-border bg-muted/50 opacity-50 grayscale'
        }
      `}>
        {/* Emoji badge */}
        <div className={`text-3xl transition-transform duration-300 ${badge.unlocked ? 'drop-shadow-md' : ''}`}>
          {badge.unlocked ? badge.emoji : '🔒'}
        </div>

        {/* Nom */}
        <p className={`text-xs font-semibold text-center leading-tight ${badge.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
          {badge.name}
        </p>

        {/* Rareté */}
        {badge.unlocked && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.labelStyle}`}>
            {r.label}
          </span>
        )}

        {/* Barre progression */}
        {!badge.unlocked && badge.progress !== undefined && (
          <div className="w-full mt-1">
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary/50 rounded-full transition-all duration-500"
                style={{ width: `${badge.progress}%` }} />
            </div>
            <p className="text-[9px] text-muted-foreground text-center mt-0.5">{badge.progressLabel}</p>
          </div>
        )}

        {/* Badge "nouveau" animé */}
        {badge.unlocked && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: index * 0.05 + 0.3 }}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
        )}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-popover border border-border rounded-xl shadow-xl p-3 pointer-events-none">
            <p className="text-xs font-bold text-foreground text-center mb-1">{badge.emoji} {badge.name}</p>
            <p className="text-[11px] text-muted-foreground text-center">{badge.description}</p>
            {badge.progressLabel && (
              <p className="text-[11px] text-primary text-center mt-1 font-medium">{badge.progressLabel}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Barre de niveau ─────────────────────────────────────────
const LevelBar: React.FC<{ data: GamificationData }> = ({ data }) => {
  const { currentLevel, nextLevel, progressToNext, xp, totalBorrows } = data;

  return (
    <div className={`rounded-2xl p-6 ${currentLevel.bgColor} border border-current/10`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{currentLevel.emoji}</span>
          <div>
            <p className={`text-lg font-bold ${currentLevel.color}`}>{currentLevel.name}</p>
            <p className="text-sm text-muted-foreground">Niveau {currentLevel.level}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xl font-bold text-foreground">{xp} XP</span>
          </div>
          <p className="text-xs text-muted-foreground">{totalBorrows} livre(s) lu(s)</p>
        </div>
      </div>

      {nextLevel && (
        <>
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{currentLevel.name}</span>
            <span>{nextLevel.emoji} {nextLevel.name}</span>
          </div>
          <div className="h-3 bg-background/60 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              className={`h-full rounded-full bg-gradient-to-r from-primary to-primary/70`}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {nextLevel.minBooks - totalBorrows} livre(s) pour atteindre <strong>{nextLevel.name}</strong> {nextLevel.emoji}
          </p>
        </>
      )}
      {!nextLevel && (
        <p className="text-center text-sm font-bold text-amber-600 mt-2">
          🏆 Niveau maximum atteint — Tu es une légende !
        </p>
      )}
    </div>
  );
};

// ─── Composant principal ─────────────────────────────────────
interface BadgeShowcaseProps {
  data: GamificationData;
}

const CATEGORIES = [
  { id: 'all',       label: 'Tous' },
  { id: 'lecture',   label: '📖 Lecture' },
  { id: 'culture',   label: '🌍 Culture' },
  { id: 'fidelite',  label: '🔥 Fidélité' },
  { id: 'collection',label: '💎 Collection' },
  { id: 'special',   label: '⭐ Spécial' },
];

export const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({ data }) => {
  const [filter, setFilter] = useState('all');
  const [showUnlocked, setShowUnlocked] = useState<'all' | 'unlocked' | 'locked'>('all');

  const filteredBadges = data.badges.filter(b => {
    const catOk = filter === 'all' || b.category === filter;
    const stateOk = showUnlocked === 'all'
      || (showUnlocked === 'unlocked' && b.unlocked)
      || (showUnlocked === 'locked' && !b.unlocked);
    return catOk && stateOk;
  });

  return (
    <div className="space-y-6">

      {/* Niveau & XP */}
      <LevelBar data={data} />

      {/* Résumé badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{data.unlockedCount}</p>
          <p className="text-xs text-muted-foreground">Badges obtenus</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Lock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{data.totalCount - data.unlockedCount}</p>
          <p className="text-xs text-muted-foreground">À débloquer</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Star className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">
            {Math.round((data.unlockedCount / data.totalCount) * 100)}%
          </p>
          <p className="text-xs text-muted-foreground">Complétion</p>
        </div>
      </div>

      {/* Filtres catégorie */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setFilter(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === cat.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}>
            {cat.label}
          </button>
        ))}
        <div className="ml-auto">
          <select value={showUnlocked} onChange={e => setShowUnlocked(e.target.value as any)}
            className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none">
            <option value="all">Tous les badges</option>
            <option value="unlocked">Obtenus seulement</option>
            <option value="locked">À débloquer</option>
          </select>
        </div>
      </div>

      {/* Grille de badges */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {filteredBadges.map((badge, i) => (
          <BadgeCard key={badge.id} badge={badge} index={i} />
        ))}
      </div>

      {filteredBadges.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun badge dans cette catégorie</p>
        </div>
      )}
    </div>
  );
};
