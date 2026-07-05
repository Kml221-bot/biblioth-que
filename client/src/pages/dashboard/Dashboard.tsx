import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, BookMarked, TrendingUp, Star, Clock, Trophy, Zap, BarChart3, PieChart as PieIcon, Activity, Flame, Coins, Target } from 'lucide-react';
import { getUserStats } from '@/services/epubService';
import { computeGamificationFromActivity, type GamificationData } from '@/services/badgeSystem';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { BookCoverPlaceholder } from '@/components/features/BookCoverPlaceholder';
import { WeatherWidget } from '@/components/features/WeatherWidget';
import { DynamicGreeting } from '@/components/features/DynamicGreeting';
import { getDaysLeft, type BorrowedBook, type HistoryItem } from '@/services/borrowStore';
import { fetchDashboardData } from '@/services/dashboardData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  RadialBarChart, RadialBar,
} from 'recharts';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

// ─── Couleurs pour les graphiques ────────────────────────────
const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];
const CATEGORY_COLORS: Record<string, string> = {
  'Littérature Africaine': '#8b5cf6',
  'Manga & BD': '#06b6d4',
  'Classiques': '#f59e0b',
  'Dystopie': '#ef4444',
  'Autre': '#64748b',
};

// ─── Custom Tooltip ──────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-xl px-4 py-2.5 shadow-xl">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: p.color }} />
          {p.name}: <span className="font-bold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [borrows, setBorrows] = useState<BorrowedBook[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [gamif, setGamif] = useState<GamificationData | null>(null);
  const [totalBooks, setTotalBooks] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<{ streak: number; weeklyGoal: number; weeklyProgress: number; biblioCoins: number; xp: number } | null>(null);
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const resetDashboard = () => {
      setBorrows([]);
      setHistory([]);
      setTotalBooks(0);
      setFavoritesCount(0);
      setGamif(computeGamificationFromActivity([], []));
    };

    const update = async () => {
      if (!user?.id) {
        resetDashboard();
        setIsDashboardLoading(false);
        return;
      }

      setIsDashboardLoading(true);
      setDashboardError(null);

      try {
        const data = await fetchDashboardData(user.id);
        if (!mounted) return;
        setBorrows(data.activeBorrows);
        setHistory(data.history);
        setTotalBooks(data.totalBooks);
        setFavoritesCount(data.favoritesCount);
        setGamif(computeGamificationFromActivity(data.activeBorrows, data.history));

        // Charger les stats de lecture (streak, objectif hebdo, BibliCoins)
        if (user?.id) {
          const stats = await getUserStats(user.id);
          setUserStats({
            streak:        stats.currentStreak,
            weeklyGoal:    stats.weeklyGoal,
            weeklyProgress: stats.weeklyProgress,
            biblioCoins:   stats.biblioCoins,
            xp:            stats.xp,
          });
        }
      } catch (err) {
        if (!mounted) return;
        if (import.meta.env.DEV) console.error('Erreur chargement dashboard Supabase:', err);
        resetDashboard();
        setDashboardError(
          err instanceof Error
            ? err.message
            : 'Impossible de charger les donnees du dashboard depuis Supabase.'
        );
      } finally {
        if (mounted) setIsDashboardLoading(false);
      }
    };

    update();
    window.addEventListener('borrowsUpdated', update);
    return () => {
      mounted = false;
      window.removeEventListener('borrowsUpdated', update);
    };
  }, [user?.id]);

  // Récupérer la température Dakar pour le message de bienvenue
  useEffect(() => {
    fetch('/api/weather/dakar')
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data?.temperature) setWeatherTemp(json.data.temperature); })
      .catch(() => {});
  }, []);

  const soonDue = borrows.filter(b => getDaysLeft(b.dueDate) <= 7).length;

  // ─── Données pour les graphiques ───────────────────────────
  const allBooks = useMemo(() => [...borrows, ...history.map(h => ({ ...h, category: h.category || 'Autre' }))], [borrows, history]);

  // Pie: répartition par catégorie
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    allBooks.forEach(b => { counts[b.category || 'Autre'] = (counts[b.category || 'Autre'] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allBooks]);

  // Bar: activité de lecture par mois (6 derniers mois)
  const monthlyData = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString('fr-FR', { month: 'short' }));
    }
    const data = months.map((month, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const lectures = allBooks.filter(b => {
        const bd = new Date('borrowDate' in b ? b.borrowDate : '');
        return bd >= d && bd < nextMonth;
      }).length;
      return { name: month, lectures };
    });
    return data;
  }, [allBooks]);

  // Area: activité de lecture (livres lus cumulés par mois)
  const activityData = useMemo(() => {
    let cumul = 0;
    return monthlyData.map(m => {
      cumul += m.lectures;
      return { name: m.name, total: cumul };
    });
  }, [monthlyData]);

  // Radial: progression de niveau
  const levelProgress = gamif ? gamif.progressToNext : 0;
  const radialData = [{ name: 'Progression', value: levelProgress, fill: '#8b5cf6' }];

  const stats = [
    { icon: BookOpen,  label: 'Livres au catalogue', value: String(totalBooks),       color: 'text-blue-600 dark:text-blue-400',   bgColor: 'bg-blue-100 dark:bg-blue-900/20'   },
    { icon: BookMarked,label: 'Livres lus',            value: String(history.length),   color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/20' },
    { icon: Star,      label: 'Livres favoris',       value: String(favoritesCount),   color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/20' },
    { icon: Zap,       label: 'XP total',             value: String(userStats?.xp ?? gamif?.xp ?? 0), color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/20' },
  ];

  return (
    <DashboardLayout>
      <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <DynamicGreeting
            firstName={user?.firstName || user?.email?.split('@')[0]}
            weatherTemp={weatherTemp}
          />
        </motion.div>

        {dashboardError && (
          <motion.div variants={itemVariants} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
            Donnees Supabase indisponibles pour le moment : {dashboardError}
          </motion.div>
        )}

        {/* Niveau & XP */}
        {gamif && (
          <motion.div variants={itemVariants}
            className={`flex items-center justify-between px-6 py-5 rounded-2xl border border-border/60 ${gamif.currentLevel.bgColor}`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{gamif.currentLevel.emoji}</span>
              <div>
                <p className={`font-bold ${gamif.currentLevel.color}`}>{gamif.currentLevel.name}</p>
                <p className="text-xs text-muted-foreground">Niveau {gamif.currentLevel.level} · {userStats?.xp ?? gamif.xp} XP</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {gamif.nextLevel && (
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-muted-foreground mb-1">Prochain : {gamif.nextLevel.emoji} {gamif.nextLevel.name}</p>
                  <div className="w-32 h-1.5 bg-background/50 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${gamif.progressToNext}%` }} />
                  </div>
                </div>
              )}
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-foreground">{gamif.xp} XP</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 justify-end">
                  <Trophy className="w-3 h-3 text-amber-500" />
                  <span className="text-xs text-muted-foreground">{gamif.unlockedCount} badges</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Objectif hebdomadaire + Streak + BibliCoins + Météo */}
        {userStats && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Objectif hebdo */}
            <div className="rounded-2xl border border-border/60 bg-card px-5 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Objectif hebdo</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{userStats.weeklyProgress} min lus</span>
                  <span>{userStats.weeklyGoal} min</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.round((userStats.weeklyProgress / Math.max(userStats.weeklyGoal, 1)) * 100))}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
                <p className="text-xs text-primary font-semibold">
                  {Math.min(100, Math.round((userStats.weeklyProgress / Math.max(userStats.weeklyGoal, 1)) * 100))}% atteint
                </p>
              </div>
            </div>

            {/* Streak */}
            <div className="rounded-2xl border border-border/60 bg-card px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{userStats.streak}<span className="text-base font-normal text-muted-foreground ml-1">jours</span></p>
                <p className="text-xs text-muted-foreground">Série de lecture</p>
                {userStats.streak >= 7 && (
                  <p className="text-xs text-orange-500 font-semibold mt-0.5">🔥 En feu !</p>
                )}
              </div>
            </div>

            {/* BibliCoins */}
            <div className="rounded-2xl border border-border/60 bg-card px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🪙</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{userStats.biblioCoins.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">BibliCoins gagnés</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-0.5">+{userStats.xp} XP total</p>
              </div>
            </div>

            {/* Météo Dakar */}
            <WeatherWidget />
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" variants={containerVariants}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div key={index} variants={itemVariants}>
                <Card>
                  <CardBody className="space-y-4">
                    <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}><Icon className={`w-6 h-6 ${stat.color}`} /></div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ═══════ GRAPHIQUES ═══════ */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={containerVariants}>
          {/* Bar Chart — Activité de lecture par mois */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-violet-500" />
                  <h3 className="text-lg font-bold text-foreground">Activité de lecture</h3>
                </div>
              </CardHeader>
              <CardBody>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="lectures" name="Livres lus" radius={[8, 8, 0, 0]} fill="url(#barGradient)" />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          </motion.div>

          {/* Pie Chart — Répartition par catégorie */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-cyan-500" />
                  <h3 className="text-lg font-bold text-foreground">Répartition par catégorie</h3>
                </div>
              </CardHeader>
              <CardBody>
                <div className="h-64">
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {categoryData.map((entry, i) => (
                            <Cell key={i} fill={CATEGORY_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          iconSize={8}
                          formatter={(value: string) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Aucune donnée</div>
                  )}
                </div>
              </CardBody>
            </Card>
          </motion.div>

          {/* Area Chart — Progression de lecture */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-bold text-foreground">Progression de lecture</h3>
                </div>
              </CardHeader>
              <CardBody>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="total" name="Livres lus" stroke="#10b981" strokeWidth={2.5} fill="url(#areaGradient)" dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#fff' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          </motion.div>

          {/* Radial — Progression de niveau */}
          {gamif && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-bold text-foreground">Progression de niveau</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="h-64 flex items-center justify-center">
                    <div className="relative">
                      <ResponsiveContainer width={220} height={220}>
                        <RadialBarChart
                          cx="50%"
                          cy="50%"
                          innerRadius="70%"
                          outerRadius="100%"
                          data={radialData}
                          startAngle={90}
                          endAngle={-270}
                          barSize={14}
                        >
                          <RadialBar
                            dataKey="value"
                            cornerRadius={10}
                            fill="#8b5cf6"
                            background={{ fill: 'var(--muted)' }}
                          />
                        </RadialBarChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl">{gamif.currentLevel.emoji}</span>
                        <span className="text-2xl font-bold text-foreground">{levelProgress}%</span>
                        <span className="text-xs text-muted-foreground">vers {gamif.nextLevel?.name || 'Max'}</span>
                      </div>
                    </div>
                    <div className="ml-4 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Niveau actuel</p>
                        <p className={`font-bold text-sm ${gamif.currentLevel.color}`}>{gamif.currentLevel.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">XP total</p>
                        <p className="font-bold text-sm text-foreground flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" /> {gamif.xp}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Badges</p>
                        <p className="font-bold text-sm text-foreground flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-amber-500" /> {gamif.unlockedCount}/{gamif.totalCount}</p>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          )}
        </motion.div>

        {/* Emprunts récents */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="border-b"><h2 className="text-2xl font-bold text-foreground">Mes lectures récentes</h2></CardHeader>
            <CardBody>
              {borrows.length > 0 ? (
                <div className="space-y-4">
                  {borrows.slice(0, 5).map((borrow) => {
                    const daysLeft = getDaysLeft(borrow.dueDate);
                    return (
                      <div key={borrow.id} className="flex items-center justify-between p-4 rounded-xl border border-border/60 hover:bg-muted/50 transition-all duration-200">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                            <BookCoverPlaceholder title={borrow.title} author={borrow.author} id={borrow.id} variant="sm" category={borrow.category} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{borrow.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">{borrow.author}</p>
                          </div>
                        </div>
                        <Badge variant={daysLeft <= 5 ? 'warning' : 'success'} size="sm">
                          {daysLeft > 0 ? `${daysLeft} jours restants` : 'Dépassé'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune lecture récente. Visitez le catalogue pour commencer à lire !</p>
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* Quick links */}
        <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={containerVariants}>
          <motion.div variants={itemVariants}>
            <Card hoverable>
              <CardBody className="text-center py-8">
                <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Parcourir le catalogue</h3>
                <p className="text-muted-foreground mb-4">
                  {isDashboardLoading ? 'Chargement du catalogue...' : `Decouvrez ${totalBooks} livre${totalBooks > 1 ? 's' : ''} disponible${totalBooks > 1 ? 's' : ''}`}
                </p>
                <a href="/catalogue" className="btn-primary">Voir le catalogue</a>
              </CardBody>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card hoverable>
              <CardBody className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Recommandations</h3>
                <p className="text-muted-foreground mb-4">Livres recommandés basés sur vos préférences</p>
                <a href="/recommandations" className="btn-primary">Voir les recommandations</a>
              </CardBody>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
