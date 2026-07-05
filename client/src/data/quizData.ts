// ============================================================
// 🎮 BiblioTech — Quiz Data
// Questions sur livres & culture générale, par niveau
// ============================================================

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: 'litterature-africaine' | 'manga' | 'classiques' | 'culture-generale';
  difficulty: 'debutant' | 'intermediaire' | 'expert';
  bookRecommendation?: { title: string; author: string; };
}

// ─── DÉBUTANT ────────────────────────────────────────────────
const DEBUTANT_QUESTIONS: QuizQuestion[] = [
  {
    id: 'd-001',
    question: 'Qui a écrit "Une si longue lettre" ?',
    options: ['Aminata Sow Fall', 'Mariama Bâ', 'Ousmane Sembène', 'Fatou Diome'],
    correctIndex: 1,
    explanation: 'Mariama Bâ a écrit ce chef-d\'œuvre en 1979, un roman épistolaire sur la condition féminine au Sénégal.',
    category: 'litterature-africaine',
    difficulty: 'debutant',
    bookRecommendation: { title: 'Une si longue lettre', author: 'Mariama Bâ' },
  },
  {
    id: 'd-002',
    question: 'Comment s\'appelle le héros de Naruto ?',
    options: ['Sasuke Uchiha', 'Naruto Uzumaki', 'Kakashi Hatake', 'Itachi Uchiha'],
    correctIndex: 1,
    explanation: 'Naruto Uzumaki est le protagoniste principal, un jeune ninja qui rêve de devenir Hokage.',
    category: 'manga',
    difficulty: 'debutant',
    bookRecommendation: { title: 'Naruto — Tome 1', author: 'Masashi Kishimoto' },
  },
  {
    id: 'd-003',
    question: 'Qui a écrit "Le Petit Prince" ?',
    options: ['Victor Hugo', 'Albert Camus', 'Antoine de Saint-Exupéry', 'Émile Zola'],
    correctIndex: 2,
    explanation: 'Antoine de Saint-Exupéry a écrit ce conte poétique en 1943, traduit dans plus de 300 langues.',
    category: 'classiques',
    difficulty: 'debutant',
    bookRecommendation: { title: 'Le Petit Prince', author: 'Antoine de Saint-Exupéry' },
  },
  {
    id: 'd-004',
    question: 'Quel manga met en scène Monkey D. Luffy ?',
    options: ['Dragon Ball', 'Naruto', 'One Piece', 'Bleach'],
    correctIndex: 2,
    explanation: 'Luffy est le héros de One Piece, la saga manga la plus vendue de l\'Histoire !',
    category: 'manga',
    difficulty: 'debutant',
    bookRecommendation: { title: 'One Piece — Tome 1', author: 'Eiichiro Oda' },
  },
  {
    id: 'd-005',
    question: 'Quel est le genre littéraire de "1984" de George Orwell ?',
    options: ['Romance', 'Dystopie', 'Fantasy', 'Autobiographie'],
    correctIndex: 1,
    explanation: '1984 est un roman dystopique décrivant une société totalitaire sous la surveillance de Big Brother.',
    category: 'classiques',
    difficulty: 'debutant',
    bookRecommendation: { title: '1984', author: 'George Orwell' },
  },
  {
    id: 'd-006',
    question: 'Quel auteur sénégalais a écrit "Les Bouts de bois de Dieu" ?',
    options: ['Cheikh Hamidou Kane', 'Léopold Sédar Senghor', 'Ousmane Sembène', 'Birago Diop'],
    correctIndex: 2,
    explanation: 'Ousmane Sembène s\'est inspiré de la grève des cheminots de 1947-1948 en Afrique de l\'Ouest.',
    category: 'litterature-africaine',
    difficulty: 'debutant',
    bookRecommendation: { title: 'Les Bouts de bois de Dieu', author: 'Ousmane Sembène' },
  },
  {
    id: 'd-007',
    question: 'Quel est le pouvoir de Luffy dans One Piece ?',
    options: ['Le feu', 'L\'élasticité', 'L\'invisibilité', 'La super vitesse'],
    correctIndex: 1,
    explanation: 'Luffy a mangé le Gomu Gomu no Mi, un Fruit du Démon qui a rendu son corps élastique.',
    category: 'manga',
    difficulty: 'debutant',
  },
  {
    id: 'd-008',
    question: 'Quel animal dessine le narrateur du "Petit Prince" au début ?',
    options: ['Un éléphant', 'Un chapeau', 'Un serpent boa avalant un éléphant', 'Un mouton'],
    correctIndex: 2,
    explanation: 'Le narrateur dessine un serpent boa qui a avalé un éléphant, mais les adultes y voient un chapeau.',
    category: 'classiques',
    difficulty: 'debutant',
  },
];

// ─── INTERMÉDIAIRE ───────────────────────────────────────────
const INTERMEDIAIRE_QUESTIONS: QuizQuestion[] = [
  {
    id: 'i-001',
    question: 'Quel roman de Cheikh Hamidou Kane explore le choc des civilisations ?',
    options: ['Le Regard du roi', 'L\'Aventure ambiguë', 'L\'Enfant noir', 'Le Devoir de violence'],
    correctIndex: 1,
    explanation: 'L\'Aventure ambiguë (1961) suit Samba Diallo tiraillé entre tradition islamique et éducation occidentale.',
    category: 'litterature-africaine',
    difficulty: 'intermediaire',
    bookRecommendation: { title: 'L\'Aventure ambiguë', author: 'Cheikh Hamidou Kane' },
  },
  {
    id: 'i-002',
    question: 'Dans Demon Slayer, pourquoi Tanjiro rejoint-il les pourfendeurs de démons ?',
    options: ['Pour devenir riche', 'Pour venger et sauver sa sœur Nezuko', 'Par tradition familiale', 'Pour devenir Hokage'],
    correctIndex: 1,
    explanation: 'Sa famille est massacrée par un démon et sa sœur Nezuko est transformée en démon. Il veut la sauver.',
    category: 'manga',
    difficulty: 'intermediaire',
    bookRecommendation: { title: 'Demon Slayer — Tome 1', author: 'Koyoharu Gotouge' },
  },
  {
    id: 'i-003',
    question: 'Quel roman d\'Albert Camus commence par "Aujourd\'hui, maman est morte" ?',
    options: ['La Peste', 'L\'Étranger', 'La Chute', 'Le Mythe de Sisyphe'],
    correctIndex: 1,
    explanation: 'L\'Étranger (1942) s\'ouvre sur cette phrase célèbre, devenue emblématique de l\'absurde camusien.',
    category: 'classiques',
    difficulty: 'intermediaire',
    bookRecommendation: { title: 'L\'Étranger', author: 'Albert Camus' },
  },
  {
    id: 'i-004',
    question: 'Quel roman de Sembène est une satire de la bourgeoisie africaine post-indépendance ?',
    options: ['Les Bouts de bois de Dieu', 'Xala', 'Le Docker noir', 'Voltaïque'],
    correctIndex: 1,
    explanation: 'Xala (1973) raconte l\'histoire d\'El Hadji frappé d\'impuissance lors de son 3e mariage — une métaphore politique.',
    category: 'litterature-africaine',
    difficulty: 'intermediaire',
    bookRecommendation: { title: 'Xala', author: 'Ousmane Sembène' },
  },
  {
    id: 'i-005',
    question: 'Quel est le premier roman écrit entièrement en wolof puis traduit en français ?',
    options: ['Xala', 'Doomi Golo', 'Vehi-Ciosane', 'Karim'],
    correctIndex: 1,
    explanation: 'Doomi Golo de Boubacar Boris Diop (2003) est le premier roman majeur en wolof, traduit sous le titre "Les petits de la guenon".',
    category: 'litterature-africaine',
    difficulty: 'intermediaire',
    bookRecommendation: { title: 'Doomi Golo', author: 'Boubacar Boris Diop' },
  },
  {
    id: 'i-006',
    question: 'Dans My Hero Academia, quel est le nom du pouvoir de All Might transmis à Deku ?',
    options: ['Explosion', 'One For All', 'All For One', 'Full Cowling'],
    correctIndex: 1,
    explanation: 'One For All est un pouvoir qui se transmet de génération en génération, accumulant la force de chaque porteur.',
    category: 'manga',
    difficulty: 'intermediaire',
  },
  {
    id: 'i-007',
    question: 'Qui a écrit "Things Fall Apart" (Tout s\'effondre), le roman africain le plus traduit ?',
    options: ['Wole Soyinka', 'Chinua Achebe', 'Ngugi wa Thiong\'o', 'Ben Okri'],
    correctIndex: 1,
    explanation: 'Chinua Achebe a publié ce roman fondateur en 1958, traduit en plus de 50 langues.',
    category: 'litterature-africaine',
    difficulty: 'intermediaire',
    bookRecommendation: { title: 'Things Fall Apart', author: 'Chinua Achebe' },
  },
  {
    id: 'i-008',
    question: 'Quelle BD africaine se déroule à Yopougon, en Côte d\'Ivoire ?',
    options: ['Tintin au Congo', 'Aya de Yopougon', 'L\'Afrique de Papa', 'Les Aventures de Pili'],
    correctIndex: 1,
    explanation: 'Aya de Yopougon de Marguerite Abouet et Clément Oubrerie raconte la vie quotidienne en Côte d\'Ivoire en 1978.',
    category: 'manga',
    difficulty: 'intermediaire',
    bookRecommendation: { title: 'Aya de Yopougon — Tome 1', author: 'Marguerite Abouet' },
  },
];

// ─── EXPERT ──────────────────────────────────────────────────
const EXPERT_QUESTIONS: QuizQuestion[] = [
  {
    id: 'e-001',
    question: 'En quelle année a eu lieu la grève des cheminots qui inspira "Les Bouts de bois de Dieu" ?',
    options: ['1945-1946', '1947-1948', '1950-1951', '1953-1954'],
    correctIndex: 1,
    explanation: 'La grève de 1947-1948 des cheminots du Dakar-Niger a paralysé l\'Afrique Occidentale Française pendant 5 mois.',
    category: 'litterature-africaine',
    difficulty: 'expert',
  },
  {
    id: 'e-002',
    question: 'Quel roman de B. B. Diop traite du génocide rwandais de 1994 ?',
    options: ['Doomi Golo', 'Le Temps de Tamango', 'Murambi, le livre des ossements', 'Les Tambours de la mémoire'],
    correctIndex: 2,
    explanation: 'Murambi (2000) a été écrit après le séjour de Diop au Rwanda dans le cadre du projet "Écrire par devoir de mémoire".',
    category: 'litterature-africaine',
    difficulty: 'expert',
    bookRecommendation: { title: 'Murambi, le livre des ossements', author: 'Boubacar Boris Diop' },
  },
  {
    id: 'e-003',
    question: 'Quel manga a dépassé les 500 millions d\'exemplaires vendus dans le monde ?',
    options: ['Naruto', 'Dragon Ball', 'One Piece', 'Demon Slayer'],
    correctIndex: 2,
    explanation: 'One Piece d\'Eiichiro Oda a dépassé 500 millions d\'exemplaires, en faisant le manga le plus vendu.',
    category: 'manga',
    difficulty: 'expert',
  },
  {
    id: 'e-004',
    question: 'Quel est le mouvement littéraire fondé par Senghor, Césaire et Damas ?',
    options: ['Le Réalisme magique', 'La Négritude', 'Le Naturalisme', 'L\'Existentialisme'],
    correctIndex: 1,
    explanation: 'La Négritude (1930s) est un mouvement qui affirme l\'identité culturelle noire face au colonialisme.',
    category: 'culture-generale',
    difficulty: 'expert',
  },
  {
    id: 'e-005',
    question: 'Qui est le premier auteur africain à avoir reçu le prix Nobel de littérature ?',
    options: ['Chinua Achebe', 'Wole Soyinka', 'Ngugi wa Thiong\'o', 'Nadine Gordimer'],
    correctIndex: 1,
    explanation: 'Wole Soyinka (Nigeria) a reçu le Nobel de littérature en 1986, devenant le premier Africain lauréat.',
    category: 'culture-generale',
    difficulty: 'expert',
  },
  {
    id: 'e-006',
    question: 'Dans Attack on Titan, quel est le vrai nom du Titan Colossal ?',
    options: ['Reiner Braun', 'Bertolt Hoover', 'Annie Leonhart', 'Zeke Yeager'],
    correctIndex: 1,
    explanation: 'Bertolt Hoover est le détenteur du pouvoir du Titan Colossal, révélé lors de l\'arc de la trahison.',
    category: 'manga',
    difficulty: 'expert',
  },
  {
    id: 'e-007',
    question: 'Quel roman d\'Aminata Sow Fall raconte la "grève" des mendiants de Dakar ?',
    options: ['L\'Appel des arènes', 'Le Jujubier du patriarche', 'La Grève des Bàttu', 'Douceurs du bercail'],
    correctIndex: 2,
    explanation: 'La Grève des Bàttu (1979) — les mendiants, expulsés pour une visite officielle, se mettent en grève.',
    category: 'litterature-africaine',
    difficulty: 'expert',
    bookRecommendation: { title: 'La Grève des Bàttu', author: 'Aminata Sow Fall' },
  },
  {
    id: 'e-008',
    question: 'Quel concept philosophique Albert Camus développe-t-il dans "Le Mythe de Sisyphe" ?',
    options: ['L\'existentialisme', 'L\'absurde', 'Le nihilisme', 'Le structuralisme'],
    correctIndex: 1,
    explanation: 'Camus y développe la philosophie de l\'absurde : la confrontation entre l\'appel humain de sens et le silence du monde.',
    category: 'culture-generale',
    difficulty: 'expert',
  },
];

// ─── Export complet ──────────────────────────────────────────
export const ALL_QUESTIONS: QuizQuestion[] = [
  ...DEBUTANT_QUESTIONS,
  ...INTERMEDIAIRE_QUESTIONS,
  ...EXPERT_QUESTIONS,
];

export function getQuestionsByDifficulty(difficulty: QuizQuestion['difficulty']): QuizQuestion[] {
  return ALL_QUESTIONS.filter(q => q.difficulty === difficulty);
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Système de niveaux Quiz ─────────────────────────────────
export interface QuizLevel {
  name: string;
  emoji: string;
  minScore: number;
  color: string;
  bgColor: string;
  message: string;
}

export const QUIZ_LEVELS: QuizLevel[] = [
  { name: 'Novice', emoji: '🌱', minScore: 0, color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800', message: 'Continue à lire, tu progresseras vite !' },
  { name: 'Apprenti', emoji: '📖', minScore: 25, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', message: 'Pas mal ! Tu connais déjà quelques bases.' },
  { name: 'Connaisseur', emoji: '🎯', minScore: 50, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30', message: 'Impressionnant ! Tu as de solides connaissances.' },
  { name: 'Expert', emoji: '🏆', minScore: 75, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30', message: 'Bravo ! Tu es un véritable expert littéraire !' },
  { name: 'Légende', emoji: '👑', minScore: 90, color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', message: 'Incroyable ! Tu es une légende de la culture !' },
];

export function getQuizLevel(scorePercent: number): QuizLevel {
  return [...QUIZ_LEVELS].reverse().find(l => scorePercent >= l.minScore) ?? QUIZ_LEVELS[0];
}

// ─── Badges Quiz ─────────────────────────────────────────────
export interface QuizBadge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  condition: (stats: QuizStats) => boolean;
  rarity: 'commun' | 'rare' | 'epique' | 'legendaire';
}

export interface QuizStats {
  totalQuizzes: number;
  totalCorrect: number;
  totalAnswered: number;
  perfectScores: number;
  streakBest: number;
  categoriesPlayed: string[];
  difficultiesPlayed: string[];
}

export const QUIZ_BADGES: QuizBadge[] = [
  { id: 'qb-first', emoji: '🎉', name: 'Premier Quiz', description: 'Terminer ton premier quiz', condition: s => s.totalQuizzes >= 1, rarity: 'commun' },
  { id: 'qb-five', emoji: '🔥', name: 'Quizzeur Assidu', description: 'Terminer 5 quiz', condition: s => s.totalQuizzes >= 5, rarity: 'rare' },
  { id: 'qb-perfect', emoji: '💯', name: 'Score Parfait', description: 'Obtenir 100% à un quiz', condition: s => s.perfectScores >= 1, rarity: 'epique' },
  { id: 'qb-streak3', emoji: '⚡', name: 'Série de 3', description: '3 bonnes réponses d\'affilée', condition: s => s.streakBest >= 3, rarity: 'commun' },
  { id: 'qb-streak5', emoji: '🌟', name: 'Série de 5', description: '5 bonnes réponses d\'affilée', condition: s => s.streakBest >= 5, rarity: 'rare' },
  { id: 'qb-allcat', emoji: '🗺️', name: 'Explorateur', description: 'Jouer dans toutes les catégories', condition: s => s.categoriesPlayed.length >= 4, rarity: 'epique' },
  { id: 'qb-expert', emoji: '🎓', name: 'Mode Expert', description: 'Terminer un quiz en mode Expert', condition: s => s.difficultiesPlayed.includes('expert'), rarity: 'rare' },
  { id: 'qb-legend', emoji: '👑', name: 'Légende Quiz', description: '10 quiz terminés avec 75%+ de réussite', condition: s => s.totalQuizzes >= 10 && (s.totalCorrect / Math.max(s.totalAnswered, 1)) >= 0.75, rarity: 'legendaire' },
];

// ─── Persistance localStorage ────────────────────────────────
const QUIZ_STATS_KEY = 'bibliotech_quiz_stats';

export function loadQuizStats(): QuizStats {
  try {
    const raw = localStorage.getItem(QUIZ_STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { totalQuizzes: 0, totalCorrect: 0, totalAnswered: 0, perfectScores: 0, streakBest: 0, categoriesPlayed: [], difficultiesPlayed: [] };
}

export function saveQuizStats(stats: QuizStats): void {
  localStorage.setItem(QUIZ_STATS_KEY, JSON.stringify(stats));
}
