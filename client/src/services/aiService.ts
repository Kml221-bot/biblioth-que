// ============================================================
// BiblioTech — Service IA Frontend (Enhanced)
// Historique persistant, suggestions intelligentes,
// recommandations personnalisées "Parce que vous aimez X → Y"
// ============================================================

import { MOCK_BOOKS } from '@/data/mockBooks';
import { supabase } from '@/lib/supabase';

export interface CatalogueBook {
  id: number | string;
  title: string;
  author: string;
  category: string;
  rating: number;
  reviews: number;
  available: boolean;
  cover: string;
  description?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  books?: CatalogueBook[];
  recommendations?: PersonalizedRec[];
  suggestedFollowUps?: string[];
  timestamp: Date;
  isTyping?: boolean;
}

export interface PersonalizedRec {
  because: string;       // "Parce que vous aimez X"
  book: CatalogueBook;   // → voici Y
  reason: string;        // Explication courte
}

// ─── Catalogue synchronisé ────────────────────────────────────
export const catalogue: CatalogueBook[] = MOCK_BOOKS.map(b => ({
  id: b.id,
  title: b.title,
  author: b.authors.join(', '),
  category: b.category,
  rating: b.rating,
  reviews: b.ratingsCount,
  available: b.available,
  cover: b.coverFallback || '📚',
  description: b.description,
}));

// ─── Matrice de similarité entre livres ───────────────────────
const SIMILARITY_MAP: Record<string, string[]> = {
  'Une si longue lettre': ['Un chant écarlate', 'La Grève des Bàttu', 'Sous l\'orage'],
  'Un chant écarlate': ['Une si longue lettre', 'L\'Aventure ambiguë', 'La Grève des Bàttu'],
  'L\'Aventure ambiguë': ['Les Bouts de bois de Dieu', 'Un chant écarlate', 'Doomi Golo'],
  'Les Bouts de bois de Dieu': ['L\'Aventure ambiguë', 'Ô pays, mon beau peuple !', 'Xala'],
  'Ô pays, mon beau peuple !': ['Les Bouts de bois de Dieu', 'Xala', 'Le Mandat précédé de Borom Sarret'],
  'La Grève des Bàttu': ['Une si longue lettre', 'Un chant écarlate', 'L\'Appel des arènes'],
  'Xala': ['Les Bouts de bois de Dieu', 'Le Mandat précédé de Borom Sarret', 'Ô pays, mon beau peuple !'],
  'Doomi Golo': ['Murambi, le livre des ossements', 'L\'Aventure ambiguë', 'Things Fall Apart (Tout s\'effondre)'],
  'Murambi, le livre des ossements': ['Doomi Golo', 'Things Fall Apart (Tout s\'effondre)', 'L\'Aventure ambiguë'],
  'Things Fall Apart (Tout s\'effondre)': ['Les Bouts de bois de Dieu', 'Murambi, le livre des ossements', 'L\'Étranger'],
  'Naruto — Tome 1 : Naruto Uzumaki': ['My Hero Academia — Tome 1', 'Dragon Ball — Tome 1', 'One Piece — Tome 1 : À l\'aube d\'une grande aventure'],
  'Demon Slayer — Tome 1 : Cruauté': ['Jujutsu Kaisen — Tome 1', 'Attack on Titan — Tome 1', 'Naruto — Tome 1 : Naruto Uzumaki'],
  'One Piece — Tome 1 : À l\'aube d\'une grande aventure': ['Naruto — Tome 1 : Naruto Uzumaki', 'Dragon Ball — Tome 1', 'My Hero Academia — Tome 1'],
  'Dragon Ball — Tome 1': ['Naruto — Tome 1 : Naruto Uzumaki', 'One Piece — Tome 1 : À l\'aube d\'une grande aventure', 'My Hero Academia — Tome 1'],
  'Attack on Titan — Tome 1': ['Demon Slayer — Tome 1 : Cruauté', 'Jujutsu Kaisen — Tome 1', '1984'],
  'My Hero Academia — Tome 1': ['Naruto — Tome 1 : Naruto Uzumaki', 'One Piece — Tome 1 : À l\'aube d\'une grande aventure', 'Jujutsu Kaisen — Tome 1'],
  'Jujutsu Kaisen — Tome 1': ['Demon Slayer — Tome 1 : Cruauté', 'Attack on Titan — Tome 1', 'My Hero Academia — Tome 1'],
  'Le Petit Prince': ['L\'Étranger', 'L\'Aventure ambiguë', 'Sous l\'orage'],
  '1984': ['L\'Étranger', 'Attack on Titan — Tome 1', 'Things Fall Apart (Tout s\'effondre)'],
  'L\'Étranger': ['1984', 'Le Petit Prince', 'L\'Aventure ambiguë'],
  'Aya de Yopougon — Tome 1': ['Une si longue lettre', 'La Grève des Bàttu', 'Un chant écarlate'],
};

// ─── Raisons de recommandation ────────────────────────────────
const RECOMMENDATION_REASONS: Record<string, Record<string, string>> = {
  'Une si longue lettre': {
    'Un chant écarlate': 'Même autrice, Mariama Bâ, avec un regard profond sur le couple et la société sénégalaise',
    'La Grève des Bàttu': 'Deux voix féminines fortes qui dénoncent les injustices au Sénégal',
    'Sous l\'orage': 'Thème commun : le combat des femmes face aux traditions patriarcales',
  },
  'Naruto — Tome 1 : Naruto Uzumaki': {
    'My Hero Academia — Tome 1': 'Même esprit shōnen : un héros rejeté qui se bat pour prouver sa valeur',
    'Dragon Ball — Tome 1': 'Le manga légendaire qui a inspiré Naruto — combats épiques et aventure',
    'One Piece — Tome 1 : À l\'aube d\'une grande aventure': 'Les deux plus grands shōnen de leur génération — rêves, amitié, aventure',
  },
  'Demon Slayer — Tome 1 : Cruauté': {
    'Jujutsu Kaisen — Tome 1': 'Action surnaturelle intense, héros déterminé face aux démons',
    'Attack on Titan — Tome 1': 'Même atmosphère sombre : un héros qui se bat pour venger les siens',
  },
  'L\'Aventure ambiguë': {
    'Les Bouts de bois de Dieu': 'Deux classiques de la littérature sénégalaise sur l\'identité et la résistance',
    'Doomi Golo': 'Réflexion profonde sur l\'identité sénégalaise et le choc des cultures',
  },
};

// ─── Historique de conversation (mémoire courte) ──────────────
interface ConvMessage { role: 'user' | 'assistant'; content: string; }
const conversationHistory: ConvMessage[] = [];
const MAX_HISTORY = 12;

// ─── Suivi des préférences utilisateur ────────────────────────
const PREFS_KEY = 'bibliotech_ai_prefs';

interface UserPreferences {
  mentionedBooks: string[];
  mentionedCategories: string[];
  mentionedAuthors: string[];
  conversationCount: number;
  lastTopics: string[];
}

function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { mentionedBooks: [], mentionedCategories: [], mentionedAuthors: [], conversationCount: 0, lastTopics: [] };
}

function savePreferences(prefs: UserPreferences) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

function updatePreferences(query: string, response: string) {
  const prefs = loadPreferences();
  prefs.conversationCount++;
  
  // Détecter les livres, catégories, auteurs mentionnés
  for (const book of catalogue) {
    if (query.toLowerCase().includes(book.title.toLowerCase()) || response.includes(book.title)) {
      if (!prefs.mentionedBooks.includes(book.title)) {
        prefs.mentionedBooks.push(book.title);
        if (prefs.mentionedBooks.length > 20) prefs.mentionedBooks.shift();
      }
    }
    if (query.toLowerCase().includes(book.author.toLowerCase())) {
      if (!prefs.mentionedAuthors.includes(book.author)) {
        prefs.mentionedAuthors.push(book.author);
        if (prefs.mentionedAuthors.length > 10) prefs.mentionedAuthors.shift();
      }
    }
  }
  
  // Détecter les catégories
  const categoryKeywords: Record<string, string[]> = {
    'Littérature Africaine': ['africain', 'sénégalais', 'afrique', 'sénégal', 'wolof', 'sembène', 'mariama', 'diop'],
    'Manga & BD': ['manga', 'anime', 'naruto', 'one piece', 'dragon ball', 'shōnen', 'shonen', 'bd', 'bande dessinée'],
    'Classiques': ['classique', 'camus', 'saint-exupéry', 'orwell', 'petit prince'],
    'Dystopie': ['dystopie', 'dystopique', '1984', 'orwell'],
  };
  
  const q = query.toLowerCase();
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(k => q.includes(k))) {
      if (!prefs.mentionedCategories.includes(cat)) {
        prefs.mentionedCategories.push(cat);
      }
    }
  }
  
  savePreferences(prefs);
}

// ─── Générer des recommandations personnalisées ───────────────
export function getPersonalizedRecommendations(): PersonalizedRec[] {
  const prefs = loadPreferences();
  const recs: PersonalizedRec[] = [];
  
  for (const bookTitle of prefs.mentionedBooks) {
    const similarTitles = SIMILARITY_MAP[bookTitle];
    if (!similarTitles) continue;
    
    for (const similarTitle of similarTitles) {
      // Ne pas recommander un livre déjà mentionné
      if (prefs.mentionedBooks.includes(similarTitle)) continue;
      
      const book = catalogue.find(b => b.title === similarTitle);
      if (!book) continue;
      
      const reason = RECOMMENDATION_REASONS[bookTitle]?.[similarTitle] 
        || `Style et thèmes similaires à "${bookTitle}"`;
      
      // Éviter les doublons
      if (recs.some(r => r.book.title === similarTitle)) continue;
      
      recs.push({
        because: bookTitle,
        book,
        reason,
      });
      
      if (recs.length >= 4) return recs;
    }
  }
  
  return recs;
}

// ─── Générer des suggestions contextuelles ────────────────────
export function getSmartSuggestions(messages: AIMessage[]): string[] {
  const prefs = loadPreferences();
  const lastMessage = messages.filter(m => m.role === 'assistant').pop();
  const lastContent = lastMessage?.content?.toLowerCase() || '';
  
  // Suggestions basées sur le contexte de la conversation
  const contextual: string[] = [];
  
  // Si on parle de littérature africaine
  if (lastContent.includes('africain') || lastContent.includes('sénégal') || prefs.mentionedCategories.includes('Littérature Africaine')) {
    contextual.push(
      '📖 Quels sont les classiques sénégalais à absolument lire ?',
      '✍️ Parle-moi de Mariama Bâ',
      '🌍 Des auteurs africains contemporains ?',
    );
  }
  
  // Si on parle de manga
  if (lastContent.includes('manga') || lastContent.includes('anime') || prefs.mentionedCategories.includes('Manga & BD')) {
    contextual.push(
      '⛩️ Top 5 des mangas pour débuter ?',
      '🔥 Quel manga est le plus populaire ici ?',
      '📚 Des mangas pour les plus de 16 ans ?',
    );
  }
  
  // Si l'IA a recommandé des livres
  if (lastMessage?.books && lastMessage.books.length > 0) {
    const firstBook = lastMessage.books[0];
    contextual.push(
      `📖 Parle-moi plus de "${firstBook.title}"`,
      `📚 D'autres livres comme "${firstBook.title}" ?`,
      `✍️ Qui est ${firstBook.author} ?`,
    );
  }

  // Si on a déjà mentionné des livres, proposer des recommandations
  if (prefs.mentionedBooks.length > 0 && !lastContent.includes('parce que')) {
    contextual.push('🎯 Des recommandations personnalisées pour moi ?');
  }
  
  // Suggestions générales si pas de contexte
  if (contextual.length === 0) {
    return [
      '📚 Recommande-moi un livre',
      '🌍 Littérature sénégalaise',
      '⛩️ Meilleurs mangas',
      '🔍 Comment emprunter un livre ?',
      '🎯 Livres les mieux notés',
    ];
  }
  
  // Mélanger et limiter
  return contextual.slice(0, 4);
}

// ─── Quick Actions (boutons rapides permanents) ───────────────
export const QUICK_ACTIONS = [
  { emoji: '📚', label: 'Recommandation', query: 'Recommande-moi un livre selon mes goûts' },
  { emoji: '🌍', label: 'Afrique', query: 'Quels sont les meilleurs livres de littérature africaine ?' },
  { emoji: '⛩️', label: 'Manga', query: 'Quels mangas me conseillerais-tu ?' },
  { emoji: '🔍', label: 'Chercher', query: 'Aide-moi à trouver un livre' },
  { emoji: '⭐', label: 'Top livres', query: 'Quels sont les livres les mieux notés dans le catalogue ?' },
  { emoji: '💡', label: 'Aide', query: 'Comment fonctionne la bibliothèque ?' },
];

// ─── Trouver les livres mentionnés dans la réponse ────────────
function findMentionedBooks(response: string): CatalogueBook[] {
  const mentioned: CatalogueBook[] = [];
  for (const book of catalogue) {
    if (response.includes(book.title) || response.includes(book.author)) {
      mentioned.push(book);
      if (mentioned.length >= 3) break;
    }
  }
  return mentioned;
}

// ─── Générer des follow-ups intelligents ──────────────────────
function generateFollowUps(query: string, response: string, books: CatalogueBook[]): string[] {
  const followUps: string[] = [];
  
  if (books.length > 0) {
    followUps.push(`📖 Résumé détaillé de "${books[0].title}" ?`);
    if (books.length > 1) {
      followUps.push(`🔄 Comparer "${books[0].title}" et "${books[1].title}"`);
    }
    followUps.push(`📚 D'autres livres similaires ?`);
  }
  
  const q = query.toLowerCase();
  if (q.includes('recommand') || q.includes('conseil') || q.includes('suggest')) {
    followUps.push('🎲 Surprise-moi avec un livre au hasard !');
  }
  
  if (q.includes('auteur') || q.includes('écrivain')) {
    followUps.push('📝 Sa biographie complète ?');
  }
  
  return followUps.slice(0, 3);
}

// ─── Appel principal ──────────────────────────────────────────
export async function getAIResponse(query: string, bookId?: string): Promise<AIMessage> {
  // Ajouter à l'historique
  conversationHistory.push({ role: 'user', content: query });
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory.splice(0, 2);
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('AUTH_REQUIRED');
    }

    const body: Record<string, unknown> = {
      message: query,
      history: conversationHistory.slice(-10),
    };
    if (bookId) body.book_context_id = bookId;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const content: string = data.reply ?? 'Désolé, je n\'ai pas pu répondre. Réessaie !';

    // Sauvegarder la réponse dans l'historique
    conversationHistory.push({ role: 'assistant', content });

    // Mettre à jour les préférences utilisateur
    updatePreferences(query, content);

    // Livres mentionnés → affichés en cartes
    const mentionedBooks = findMentionedBooks(content);
    
    // Recommandations personnalisées
    const personalizedRecs = query.toLowerCase().includes('personnalis') || query.toLowerCase().includes('recommand')
      ? getPersonalizedRecommendations()
      : undefined;

    // Follow-ups intelligents
    const followUps = generateFollowUps(query, content, mentionedBooks);

    return {
      id: generateId(),
      role: 'assistant',
      content,
      books: mentionedBooks.length > 0 ? mentionedBooks : undefined,
      recommendations: personalizedRecs && personalizedRecs.length > 0 ? personalizedRecs : undefined,
      suggestedFollowUps: followUps.length > 0 ? followUps : undefined,
      timestamp: new Date(),
    };

  } catch (error) {
    console.error('BibliAI frontend error:', error);
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
      return {
        id: generateId(),
        role: 'assistant',
        content: 'Connecte-toi pour utiliser BibliAI. Cela protege la cle IA et limite les abus.',
        timestamp: new Date(),
      };
    }

    return {
      id: generateId(),
      role: 'assistant',
      content: '⚠️ Impossible de contacter BibliAI. Vérifie que le serveur tourne (`npm run dev:server`) et que la clé OPENROUTER_API_KEY est dans le fichier `.env` à la racine du projet.',
      timestamp: new Date(),
    };
  }
}

// ─── Utilitaires ─────────────────────────────────────────────
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function createUserMessage(content: string): AIMessage {
  return { id: generateId(), role: 'user', content, timestamp: new Date() };
}

export function clearConversationHistory(): void {
  conversationHistory.length = 0;
}

// ─── Persistance de l'historique ─────────────────────────────
const HISTORY_KEY = 'bibliotech_ai_history';

export function saveMessagesToStorage(messages: AIMessage[]) {
  try {
    // Ne garder que les 50 derniers messages
    const toSave = messages.slice(-50).map(m => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
    }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(toSave));
  } catch { /* ignore */ }
}

export function loadMessagesFromStorage(): AIMessage[] | null {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch { return null; }
}

export function clearStoredMessages() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch { /* ignore */ }
}
