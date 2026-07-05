import { supabase } from '@/lib/supabase';
import type { Book } from '@/types/database';
import type { GoogleBook } from './googleBooksService';

const ACTIVE_BORROW_STATUSES = ['actif', 'prolonge', 'retard'];

export interface RecommendedBook extends GoogleBook {
  matchScore: number;
  reason: string;
}

function mapBook(row: Book): GoogleBook {
  return {
    id: row.id,
    title: row.titre,
    authors: [row.auteur],
    cover: row.cover_url || '',
    coverFallback: '',
    publishedYear: row.annee_publication || 0,
    rating: Number(row.note_moyenne || 0),
    ratingsCount: Number(row.nb_emprunts || 0),
    description: row.description || 'Aucune description disponible pour ce livre.',
    previewLink: row.read_url || row.pdf_url || '',
    infoLink: '',
    category: row.categorie || 'Autre',
    pageCount: row.pages_count || 0,
    publisher: row.editeur || '',
    language: row.langue || 'fr',
    available: row.status === 'publie',
    pdfUrl: row.pdf_url || undefined,
    readUrl: row.read_url || undefined,
    prix_achat: row.prix_achat || 0,
    type: row.type || 'gratuit',
  };
}

export async function fetchPublishedBooks(): Promise<GoogleBook[]> {
  const { data, error } = await (supabase as any)
    .from('books')
    .select('*')
    .eq('status', 'publie')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapBook);
}

export async function fetchActiveBorrowedBookIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('borrows')
    .select('book_id')
    .eq('user_id', userId)
    .in('statut', ACTIVE_BORROW_STATUSES);

  if (error) throw error;
  return new Set(((data || []) as { book_id: string }[]).map(row => row.book_id));
}

export async function fetchPersonalizedSupabaseRecommendations(
  userId: string,
  preferredCategories: string[] = [],
): Promise<RecommendedBook[]> {
  const [books, borrowedIds, borrowHistory] = await Promise.all([
    fetchPublishedBooks(),
    fetchActiveBorrowedBookIds(userId),
    (supabase as any)
      .from('borrows')
      .select('book_id, books(categorie,auteur,type_acces)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  if (borrowHistory.error) throw borrowHistory.error;

  const borrowedCategories = new Set<string>();
  const borrowedAuthors = new Set<string>();
  const preferredCategorySet = new Set(preferredCategories);

  for (const row of borrowHistory.data || []) {
    const book = Array.isArray((row as any).books) ? (row as any).books[0] : (row as any).books;
    if (book?.categorie) borrowedCategories.add(book.categorie);
    if (book?.auteur) borrowedAuthors.add(book.auteur);
  }

  return books
    .filter(book => !borrowedIds.has(book.id))
    .map((book): RecommendedBook => {
      const categoryMatch = borrowedCategories.has(book.category);
      const preferredMatch = preferredCategorySet.has(book.category);
      const authorMatch = book.authors.some(author => borrowedAuthors.has(author));
      const popularityBonus = Math.min(8, Math.round((book.ratingsCount || 0) / 5));
      const score = Math.min(
        98,
        70 +
          (categoryMatch ? 14 : 0) +
          (preferredMatch ? 10 : 0) +
          (authorMatch ? 8 : 0) +
          popularityBonus,
      );

      const reason = categoryMatch
        ? `Parce que vous avez emprunte des livres en ${book.category}`
        : preferredMatch
          ? `Parce que ${book.category} fait partie de vos preferences`
          : authorMatch
            ? `Parce que vous avez deja lu ${book.authors[0]}`
            : 'Selection issue du catalogue Supabase';

      return { ...book, matchScore: score, reason };
    })
    .sort((a, b) => b.matchScore - a.matchScore || b.rating - a.rating)
    .slice(0, 12);
}

export async function searchPublishedBooks(query: string): Promise<GoogleBook[]> {
  const term = query.trim();
  if (!term) return [];

  const escapedTerm = term.replaceAll('%', '\\%').replaceAll('_', '\\_');
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('status', 'publie')
    .or(`titre.ilike.%${escapedTerm}%,auteur.ilike.%${escapedTerm}%,categorie.ilike.%${escapedTerm}%`)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data || []).map(mapBook);
}

export function groupBooksByCategory(books: GoogleBook[]): Record<string, GoogleBook[]> {
  return books.reduce<Record<string, GoogleBook[]>>((acc, book) => {
    const key = book.category || 'Autre';
    acc[key] = acc[key] || [];
    acc[key].push(book);
    return acc;
  }, {});
}

export async function isBookBorrowedInSupabase(userId: string, bookId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('borrows')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .in('statut', ACTIVE_BORROW_STATUSES);

  if (error) throw error;
  return (count || 0) > 0;
}

export async function borrowBookInSupabase(userId: string, bookId: string): Promise<void> {
  if (await isBookBorrowedInSupabase(userId, bookId)) {
    throw new Error('Ce livre est deja emprunte.');
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const { error } = await (supabase as any).from('borrows').insert({
    user_id: userId,
    book_id: bookId,
    fin_prevue: dueDate.toISOString(),
    statut: 'actif',
  });

  if (error) throw error;
}
