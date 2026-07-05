export interface BorrowedBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  category: string;
  borrowDate: string;
  dueDate: string;
  renewCount: number;
  maxRenews: number;
}

export interface HistoryItem {
  id: number | string;
  title: string;
  author: string;
  cover: string;
  category: string;
  borrowDate: string;
  returnDate: string;
  daysKept: number;
  status: 'returned' | 'overdue' | 'renewed';
}

const BORROWS_KEY = 'activeBorrows';
const HISTORY_KEY = 'borrowHistory';
const CURRENT_USER_KEY = 'bibliotech:currentUserId';

function scopedKey(key: string): string {
  const userId = localStorage.getItem(CURRENT_USER_KEY);
  return userId ? `${key}:${userId}` : `${key}:anonymous`;
}

export function getActiveBorrows(): BorrowedBook[] {
  try { return JSON.parse(localStorage.getItem(scopedKey(BORROWS_KEY)) || '[]'); }
  catch { return []; }
}

export function addBorrow(book: { id: string; title: string; author: string; cover: string; category: string }): BorrowedBook {
  const borrows = getActiveBorrows();
  if (borrows.some(b => b.id === book.id)) throw new Error('Ce livre est déjà emprunté');
  const today = new Date();
  const due = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const nb: BorrowedBook = { ...book, borrowDate: today.toISOString().split('T')[0], dueDate: due.toISOString().split('T')[0], renewCount: 0, maxRenews: 3 };
  borrows.push(nb);
  localStorage.setItem(scopedKey(BORROWS_KEY), JSON.stringify(borrows));
  window.dispatchEvent(new Event('borrowsUpdated'));
  return nb;
}

export function renewBorrow(bookId: string): BorrowedBook | null {
  const borrows = getActiveBorrows();
  const idx = borrows.findIndex(b => b.id === bookId);
  if (idx === -1) return null;
  const b = borrows[idx];
  if (b.renewCount >= b.maxRenews) return null;
  b.renewCount++;
  b.dueDate = new Date(new Date(b.dueDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  borrows[idx] = b;
  localStorage.setItem(scopedKey(BORROWS_KEY), JSON.stringify(borrows));
  window.dispatchEvent(new Event('borrowsUpdated'));
  return b;
}

export function returnBorrow(bookId: string): HistoryItem | null {
  const borrows = getActiveBorrows();
  const idx = borrows.findIndex(b => b.id === bookId);
  if (idx === -1) return null;
  const bor = borrows[idx];
  const today = new Date().toISOString().split('T')[0];
  const daysKept = Math.max(1, Math.round((new Date(today).getTime() - new Date(bor.borrowDate).getTime()) / 86400000));
  const hi: HistoryItem = { id: Date.now(), title: bor.title, author: bor.author, cover: bor.cover, category: bor.category, borrowDate: bor.borrowDate, returnDate: today, daysKept, status: daysKept > 30 ? 'overdue' : 'returned' };
  borrows.splice(idx, 1);
  localStorage.setItem(scopedKey(BORROWS_KEY), JSON.stringify(borrows));
  const history = getHistory();
  history.unshift(hi);
  localStorage.setItem(scopedKey(HISTORY_KEY), JSON.stringify(history));
  window.dispatchEvent(new Event('borrowsUpdated'));
  return hi;
}

export function isBookBorrowed(bookId: string): boolean {
  return getActiveBorrows().some(b => b.id === bookId);
}

export function getHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(scopedKey(HISTORY_KEY)) || '[]'); }
  catch { return []; }
}

export function getDaysLeft(dueDate: string): number {
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
}
