
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, BookOpen, Star, Crown, Medal, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { LEVELS } from '@/services/badgeSystem';

// ─── Types ───────────────────────────────────────────────────
interface LeaderEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  levelName: string;
  levelEmoji: string;
  streak: number;
  livresLus: number;
  biblioCoins: number;
  isCurrentUser: boolean;
}

type Period = 'alltime';

// ─── Helpers ─────────────────────────────────────────────────
function getLevelInfo(xp: number) {
  const totalBooks = Math.floor(xp / 10); // approximation
  return LEVELS.find(l => totalBooks >= l.minBooks && totalBooks <= l.maxBooks) ?? LEVELS[0];
}

function getRankStyle(rank: number) {
  if (rank === 1) return { icon: Crown,  color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' };
  if (rank === 2) return { icon: Trophy, color: 'text-slate-400',  bg: 'bg-slate-400/10 border-slate-400/30' };
  if (rank === 3) return { icon: Medal,  color: 'text-amber-600',  bg: 'bg-amber-600/10 border-amber-600/30' };
  return { icon: null, color: 'text-muted-foreground', bg: 'bg-muted/20 border-border/30' };
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Composant ───────────────────────────────────────────────
export default function Classement() {
  const { user, session } = useAuth();
  const [entries, setEntries]         = useState<LeaderEntry[]>([]);
  const [myRank, setMyRank]           = useState<LeaderEntry | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Récupérer les stats + profils (top 20)
        const { data, error: err } = await supabase
          .from('user_stats')
          .select('user_id, xp, level, streak_jours, livres_lus, biblio_coins, profiles:user_id(first_name, last_name, avatar_url)')
          .order('xp', { ascending: false })
          .limit(20);

        if (err) throw err;

        const rows = (data || []) as unknown as Array<{
          user_id: string;
          xp: number;
          level: number;
          streak_jours: number;
          livres_lus: number;
          biblio_coins: number;
          profiles: { first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
        }>;

        const mapped: LeaderEntry[] = rows.map((row, idx) => {
          const profile = row.profiles;
          const firstName = profile?.first_name || '';
          const lastName  = profile?.last_name  || '';
          const name      = `${firstName} ${lastName}`.trim() || 'Lecteur';
          const lvlInfo   = getLevelInfo(row.xp);
          return {
            rank:        idx + 1,
            userId:      row.user_id,
            name,
            avatarUrl:   profile?.avatar_url ?? null,
            xp:          row.xp ?? 0,
            level:       row.level ?? 1,
            levelName:   lvlInfo.name,
            levelEmoji:  lvlInfo.emoji,
            streak:      row.streak_jours ?? 0,
            livresLus:   row.livres_lus ?? 0,
            biblioCoins: row.biblio_coins ?? 0,
            isCurrentUser: row.user_id === user?.id,
          };
        });

        setEntries(mapped.slice(0, 10));

        // Rang de l'utilisateur courant
        const me = mapped.find(e => e.isCurrentUser);
        if (me) setMyRank(me);
        else if (user?.id) {
          // Si pas dans le top 20, récupérer son rang approximatif
          const { count } = await supabase
            .from('user_stats')
            .select('user_id', { count: 'exact', head: true })
            .gte('xp', 0);
          const myStats = await supabase
            .from('user_stats')
            .select('xp, level, streak_jours, livres_lus, biblio_coins')
            .eq('user_id', user.id)
            .single();

          if (myStats.data) {
            const myXp = myStats.data.xp ?? 0;
            const { count: ahead } = await supabase
              .from('user_stats')
              .select('user_id', { count: 'exact', head: true })
              .gt('xp', myXp);

            const lvlInfo = getLevelInfo(myXp);
            setMyRank({
              rank:        (ahead ?? 0) + 1,
              userId:      user.id,
              name:        `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Moi',
              avatarUrl:   null,
              xp:          myXp,
              level:       myStats.data.level ?? 1,
              levelName:   lvlInfo.name,
              levelEmoji:  lvlInfo.emoji,
              streak:      myStats.data.streak_jours ?? 0,
              livresLus:   myStats.data.livres_lus ?? 0,
              biblioCoins: myStats.data.biblio_coins ?? 0,
              isCurrentUser: true,
            });
          }
        }
      } catch (e) {
        setError('Impossible de charger le classement. Réessaie plus tard.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <h1 className="text-2xl font-bold text-foreground">Classement des Lecteurs</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Les lecteurs les plus actifs de BiblioTech, classés par XP
          </p>
        </motion.div>

        {/* Mon rang (si hors top 10) */}
        {myRank && myRank.rank > 10 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4"
          >
            <p className="text-xs text-primary font-semibold mb-2">Ton classement</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-primary">#{myRank.rank}</span>
              <div>
                <p className="font-semibold text-sm">{myRank.name}</p>
                <p className="text-xs text-muted-foreground">{myRank.xp} XP · {myRank.livresLus} livres</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Liste du classement */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-1 opacity-60">Le classement se remplit quand les lecteurs commencent à lire.</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun lecteur classé pour l'instant.</p>
            <p className="text-xs mt-1">Commence à lire pour apparaître ici !</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, idx) => {
              const rankStyle = getRankStyle(entry.rank);
              const RankIcon  = rankStyle.icon;

              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    entry.isCurrentUser
                      ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                      : `${rankStyle.bg}`
                  }`}
                >
                  {/* Rang */}
                  <div className="w-10 flex items-center justify-center flex-shrink-0">
                    {RankIcon ? (
                      <RankIcon className={`w-6 h-6 ${rankStyle.color}`} />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                    {entry.avatarUrl
                      ? <img src={entry.avatarUrl} alt={entry.name} className="w-full h-full object-cover" loading="lazy" />
                      : initials(entry.name)
                    }
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {entry.name}
                        {entry.isCurrentUser && (
                          <span className="ml-1.5 text-[10px] text-primary font-bold">(toi)</span>
                        )}
                      </p>
                      <span className="text-sm">{entry.levelEmoji}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.levelName}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 flex-shrink-0 text-right">
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span>{entry.streak}j</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end mt-0.5">
                        <BookOpen className="w-3 h-3 text-blue-400" />
                        <span>{entry.livresLus} livres</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-foreground">{entry.xp.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">XP</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Explication du calcul */}
        <div className="rounded-xl bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground text-sm mb-2">Comment gagner de l'XP ?</p>
          <p>📚 +10 XP par livre lu</p>
          <p>🔥 +5 à +50 XP bonus selon la régularité de lecture (streak)</p>
          <p>🏆 +50 XP par badge débloqué</p>
          <p>⏱️ +1 XP par minute de lecture</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
