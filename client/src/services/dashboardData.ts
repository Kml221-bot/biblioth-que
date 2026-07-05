import { supabase } from '@/lib/supabase';
import type { Book, Borrow } from '@/types/database';
import type { BorrowedBook, HistoryItem } from './borrowStore';

export interface DashboardData {
  activeBorrows: BorrowedBook[];
  history: HistoryItem[];
  totalBooks: number;
  favoritesCount: number;
}

type BorrowWithBook = Borrow & {
  books: Pick<Book, 'id' | 'titre' | 'auteur' | 'categorie' | 'cover_url'> | null;
};

const ACTIVE_STATUSES = ['actif', 'prolonge', 'retard'];

function daysBetween(start: string, end: string): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return 1;
  return Math.max(1, Math.round((endTime - startTime) / 86400000));
}

function toBorrowedBook(row: BorrowWithBook): BorrowedBook {
  const book = row.books;

  return {
    id: row.id,
    title: book?.titre || 'Livre sans titre',
    author: book?.auteur || 'Auteur inconnu',
    cover: book?.cover_url || '',
    category: book?.categorie || 'Autre',
    borrowDate: row.debut,
    dueDate: row.fin_prevue,
    renewCount: row.prolongation_auto_utilisee || row.statut === 'prolonge' ? 1 : 0,
    maxRenews: 1,
  };
}

function toHistoryItem(row: BorrowWithBook): HistoryItem {
  const borrowedBook = toBorrowedBook(row);
  const returnDate = row.fin_reelle || row.updated_at || row.fin_prevue;

  return {
    id: row.id,
    title: borrowedBook.title,
    author: borrowedBook.author,
    cover: borrowedBook.cover,
    category: borrowedBook.category,
    borrowDate: row.debut,
    returnDate,
    daysKept: daysBetween(row.debut, returnDate),
    status: row.statut === 'retard' ? 'overdue' : row.statut === 'prolonge' ? 'renewed' : 'returned',
  };
}

export async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const [borrowsRes, booksRes, favoritesRes] = await Promise.all([
    (supabase as any)
      .from('borrows')
      .select('*, books(id, titre, auteur, categorie, cover_url)')
      .eq('user_id', userId)
      .order('debut', { ascending: false }),
    supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'publie'),
    supabase
      .from('favorites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  if (borrowsRes.error) throw borrowsRes.error;
  if (booksRes.error) throw booksRes.error;
  if (favoritesRes.error) throw favoritesRes.error;

  const rows = ((borrowsRes.data || []) as BorrowWithBook[]);

  return {
    activeBorrows: rows
      .filter(row => ACTIVE_STATUSES.includes(row.statut) && !row.fin_reelle)
      .map(toBorrowedBook),
    history: rows
      .filter(row => row.statut === 'rendu' || !!row.fin_reelle)
      .map(toHistoryItem),
    totalBooks: booksRes.count || 0,
    favoritesCount: favoritesRes.count || 0,
  };
}
