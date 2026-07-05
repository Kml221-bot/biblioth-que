import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Trophy, Zap, Star, ChevronRight, RotateCcw, BookOpen, Award, Sparkles, CheckCircle2, XCircle, Timer, Target, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { playCorrect, playWrong, playBadge, playTimerWarning } from '@/services/audioFeedback';
import { Card, CardBody } from '@/components/ui/Card';
import {
  type QuizQuestion, type QuizStats, type QuizBadge,
  getQuestionsByDifficulty, shuffleArray, getQuizLevel,
  QUIZ_LEVELS, QUIZ_BADGES, loadQuizStats, saveQuizStats,
} from '@/data/quizData';

type Difficulty = 'debutant' | 'intermediaire' | 'expert';
type Phase = 'menu' | 'playing' | 'result';

const QUESTIONS_PER_QUIZ = 5;

const containerV = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemV = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

// ─── Difficulty selector cards ───────────────────────────────
const DIFFICULTY_OPTIONS: { key: Difficulty; label: string; emoji: string; desc: string; color: string; bg: string; border: string }[] = [
  { key: 'debutant', label: 'Débutant', emoji: '🌱', desc: 'Questions simples pour commencer', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800 hover:border-green-400' },
  { key: 'intermediaire', label: 'Intermédiaire', emoji: '🎯', desc: 'Pour les lecteurs réguliers', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800 hover:border-blue-400' },
  { key: 'expert', label: 'Expert', emoji: '🏆', desc: 'Réservé aux vrais passionnés', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800 hover:border-purple-400' },
];

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('debutant');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [stats, setStats] = useState<QuizStats>(loadQuizStats());
  const [newBadges, setNewBadges] = useState<QuizBadge[]>([]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || answered) return;
    if (timeLeft <= 0) { handleAnswer(-1); return; }
    if (timeLeft <= 5 && timeLeft > 0) playTimerWarning();
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, answered, timeLeft]);

  const startQuiz = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    const pool = getQuestionsByDifficulty(diff);
    setQuestions(shuffleArray(pool).slice(0, QUESTIONS_PER_QUIZ));
    setCurrentIdx(0); setScore(0); setStreak(0); setBestStreak(0);
    setSelected(null); setAnswered(false); setTimeLeft(20);
    setPhase('playing'); setNewBadges([]);
  }, []);

  const handleAnswer = useCallback((idx: number) => {
    if (answered) return;
    setSelected(idx); setAnswered(true);
    const correct = idx === questions[currentIdx]?.correctIndex;
    if (correct) {
      playCorrect();
      setScore(s => s + 1);
      setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n; });
    } else {
      playWrong();
      setStreak(0);
    }
  }, [answered, questions, currentIdx]);

  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      // Finish quiz — update stats
      const newStats = { ...stats };
      newStats.totalQuizzes += 1;
      newStats.totalCorrect += score + (selected === questions[currentIdx]?.correctIndex ? 0 : 0); // already counted
      newStats.totalAnswered += questions.length;
      if (score === questions.length) newStats.perfectScores += 1;
      newStats.streakBest = Math.max(newStats.streakBest, bestStreak);
      const cats = new Set(newStats.categoriesPlayed);
      questions.forEach(q => cats.add(q.category));
      newStats.categoriesPlayed = Array.from(cats);
      if (!newStats.difficultiesPlayed.includes(difficulty)) newStats.difficultiesPlayed.push(difficulty);
      // Recalculate correct count properly
      newStats.totalCorrect = stats.totalCorrect + score;

      // Check new badges
      const oldUnlocked = QUIZ_BADGES.filter(b => b.condition(stats)).map(b => b.id);
      const nowUnlocked = QUIZ_BADGES.filter(b => b.condition(newStats));
      const fresh = nowUnlocked.filter(b => !oldUnlocked.includes(b.id));
      if (fresh.length > 0) playBadge();
      setNewBadges(fresh);

      saveQuizStats(newStats);
      setStats(newStats);
      setPhase('result');
    } else {
      setCurrentIdx(i => i + 1);
      setSelected(null); setAnswered(false); setTimeLeft(20);
    }
  }, [currentIdx, questions, score, bestStreak, difficulty, stats, selected]);

  const scorePercent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const quizLevel = getQuizLevel(scorePercent);
  const q = questions[currentIdx];

  return (
    <DashboardLayout>
      <motion.div className="max-w-4xl mx-auto space-y-6" variants={containerV} initial="hidden" animate="visible">
        {/* ═══════ HEADER ═══════ */}
        <motion.div variants={itemV} className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quiz Littéraire</h1>
            <p className="text-muted-foreground">Teste tes connaissances sur les livres et la culture</p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ═══════ MENU ═══════ */}
          {phase === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              {/* Stats bar */}
              <motion.div variants={itemV} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Target, label: 'Quiz joués', value: stats.totalQuizzes, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20' },
                  { icon: CheckCircle2, label: 'Bonnes réponses', value: stats.totalCorrect, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/20' },
                  { icon: Zap, label: 'Meilleure série', value: stats.streakBest, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/20' },
                  { icon: Award, label: 'Scores parfaits', value: stats.perfectScores, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/20' },
                ].map((s, i) => (
                  <Card key={i}>
                    <CardBody className="flex items-center gap-3 !py-4">
                      <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                      <div><p className="text-2xl font-bold text-foreground">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
                    </CardBody>
                  </Card>
                ))}
              </motion.div>


              {/* Difficulty selection */}
              <motion.div variants={itemV}>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-violet-500" /> Choisis ton niveau</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {DIFFICULTY_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => startQuiz(opt.key)}
                      className={`text-left p-6 rounded-2xl border-2 ${opt.border} ${opt.bg} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}>
                      <span className="text-4xl block mb-3">{opt.emoji}</span>
                      <h3 className={`text-lg font-bold ${opt.color} mb-1`}>{opt.label}</h3>
                      <p className="text-sm text-muted-foreground">{opt.desc}</p>
                      <div className={`mt-4 flex items-center gap-1 text-sm font-semibold ${opt.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        Commencer <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Badges section */}
              <motion.div variants={itemV}>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Mes Badges Quiz</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {QUIZ_BADGES.map(badge => {
                    const unlocked = badge.condition(stats);
                    const rarityColors: Record<string, string> = {
                      commun: 'border-gray-200 dark:border-gray-700',
                      rare: 'border-blue-300 dark:border-blue-700',
                      epique: 'border-purple-300 dark:border-purple-700',
                      legendaire: 'border-amber-300 dark:border-amber-700',
                    };
                    return (
                      <div key={badge.id} className={`p-4 rounded-xl border-2 ${rarityColors[badge.rarity]} transition-all duration-300 ${unlocked ? 'bg-card' : 'bg-muted/50 opacity-50 grayscale'}`}>
                        <span className="text-2xl">{badge.emoji}</span>
                        <p className="font-semibold text-sm mt-2 text-foreground">{badge.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{badge.description}</p>
                        {unlocked && <span className="inline-block mt-2 text-xs font-semibold text-green-600 dark:text-green-400">✓ Débloqué</span>}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ═══════ PLAYING ═══════ */}
          {phase === 'playing' && q && (
            <motion.div key={`q-${currentIdx}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }} className="space-y-6">
              {/* Progress & timer bar */}
              <Card>
                <CardBody className="!py-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">Question {currentIdx + 1}/{questions.length}</span>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle2 className="w-4 h-4" /> {score}</span>
                      {streak >= 2 && <span className="flex items-center gap-1 text-amber-500 font-bold"><Zap className="w-4 h-4" /> x{streak}</span>}
                      <span className={`flex items-center gap-1 font-mono font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}>
                        <Timer className="w-4 h-4" /> {timeLeft}s
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} transition={{ duration: 0.5 }} />
                  </div>
                </CardBody>
              </Card>

              {/* Question */}
              <Card>
                <CardBody className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold capitalize">{q.category.replace('-', ' ')}</span>
                    <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-semibold capitalize">{q.difficulty === 'debutant' ? '🌱 Débutant' : q.difficulty === 'intermediaire' ? '🎯 Intermédiaire' : '🏆 Expert'}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground leading-snug">{q.question}</h2>
                </CardBody>
              </Card>

              {/* Options */}
              <div className="grid gap-3">
                {q.options.map((opt, idx) => {
                  const isCorrect = idx === q.correctIndex;
                  const isSelected = idx === selected;
                  let cls = 'border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5';
                  if (answered) {
                    if (isCorrect) cls = 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500/30';
                    else if (isSelected) cls = 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500/30';
                    else cls = 'border-border/40 bg-muted/50 opacity-60';
                  }
                  return (
                    <motion.button key={idx} whileHover={!answered ? { scale: 1.01 } : {}} whileTap={!answered ? { scale: 0.99 } : {}}
                      onClick={() => handleAnswer(idx)} disabled={answered}
                      className={`w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 ${cls}`}>
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0
                        ${answered && isCorrect ? 'bg-green-500 text-white' : answered && isSelected ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {answered && isCorrect ? <CheckCircle2 className="w-5 h-5" /> : answered && isSelected ? <XCircle className="w-5 h-5" /> : String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-medium text-foreground">{opt}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation + next */}
              <AnimatePresence>
                {answered && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card>
                      <CardBody className="space-y-3">
                        <div className={`flex items-start gap-3 ${selected === q.correctIndex ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          {selected === q.correctIndex ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" /> : <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                          <div>
                            <p className="font-bold">{selected === q.correctIndex ? 'Bonne réponse !' : selected === -1 ? 'Temps écoulé !' : 'Mauvaise réponse'}</p>
                            <p className="text-sm text-muted-foreground mt-1">{q.explanation}</p>
                          </div>
                        </div>
                        {q.bookRecommendation && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                            <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                            <p className="text-sm"><span className="font-semibold text-violet-700 dark:text-violet-300">📖 À lire :</span> <span className="text-foreground">{q.bookRecommendation.title}</span> <span className="text-muted-foreground">— {q.bookRecommendation.author}</span></p>
                          </div>
                        )}
                        <button onClick={nextQuestion}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center justify-center gap-2">
                          {currentIdx + 1 >= questions.length ? 'Voir les résultats' : 'Question suivante'} <ChevronRight className="w-5 h-5" />
                        </button>
                      </CardBody>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══════ RESULT ═══════ */}
          {phase === 'result' && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Score card */}
              <Card>
                <CardBody className="text-center py-10 space-y-4">
                  <motion.span className="text-6xl block" initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, -10, 10, 0] }} transition={{ type: 'spring', delay: 0.2 }}>
                    {quizLevel.emoji}
                  </motion.span>
                  <h2 className="text-3xl font-bold text-foreground">Résultat : {scorePercent}%</h2>
                  <p className={`text-xl font-bold ${quizLevel.color}`}>{quizLevel.name}</p>
                  <p className="text-muted-foreground max-w-md mx-auto">{quizLevel.message}</p>
                  <div className="flex items-center justify-center gap-6 pt-2">
                    <div className="text-center"><p className="text-2xl font-bold text-green-600">{score}</p><p className="text-xs text-muted-foreground">Correctes</p></div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center"><p className="text-2xl font-bold text-red-500">{questions.length - score}</p><p className="text-xs text-muted-foreground">Erreurs</p></div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center"><p className="text-2xl font-bold text-amber-500">{bestStreak}</p><p className="text-xs text-muted-foreground">Meilleure série</p></div>
                  </div>
                  {/* Score bar */}
                  <div className="w-full max-w-xs mx-auto h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${scorePercent}%` }} transition={{ duration: 1, delay: 0.5 }} />
                  </div>
                </CardBody>
              </Card>

              {/* New badges */}
              {newBadges.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                  <Card>
                    <CardBody className="space-y-3">
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" /> Nouveaux Badges Débloqués !</h3>
                      <div className="flex flex-wrap gap-3">
                        {newBadges.map(b => (
                          <motion.div key={b.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                            className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <span className="text-2xl">{b.emoji}</span>
                            <div><p className="font-semibold text-sm">{b.name}</p><p className="text-xs text-muted-foreground">{b.description}</p></div>
                          </motion.div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              )}

              {/* Book recommendations */}
              {questions.some(q => q.bookRecommendation) && (
                <Card>
                  <CardBody className="space-y-3">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><BookOpen className="w-5 h-5 text-violet-500" /> Livres recommandés pour toi</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {questions.filter(q => q.bookRecommendation).slice(0, 4).map((q, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                          <span className="text-2xl">📚</span>
                          <div><p className="font-semibold text-sm text-foreground">{q.bookRecommendation!.title}</p><p className="text-xs text-muted-foreground">{q.bookRecommendation!.author}</p></div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Actions */}
              <div className="grid md:grid-cols-2 gap-4">
                <button onClick={() => startQuiz(difficulty)}
                  className="py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">
                  <RotateCcw className="w-5 h-5" /> Rejouer ({DIFFICULTY_OPTIONS.find(d => d.key === difficulty)?.label})
                </button>
                <button onClick={() => setPhase('menu')}
                  className="py-4 rounded-xl border-2 border-border/60 bg-card text-foreground font-semibold hover:bg-muted transition-all flex items-center justify-center gap-2">
                  <TrendingUp className="w-5 h-5" /> Changer de niveau
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </DashboardLayout>
  );
}
