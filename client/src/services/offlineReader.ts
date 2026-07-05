import { openDB, type IDBPDatabase } from 'idb';
import { supabase } from '@/lib/supabase';
import type { GoogleBook } from './googleBooksService';
import { addSyncAction } from './offlineStorage';
import { syncPendingActions } from './syncService';

const DB_NAME = 'bibliotech-offline-reader';
const DB_VERSION = 1;
const STORE_BOOKS = 'books';

export interface OfflineReaderBook {
  id: string;
  titre: string;
  auteur: string;
  cover_url: string | null;
  mime_type: string;
  encrypted_data: ArrayBuffer;
  encryption_iv: Uint8Array;
  size_bytes: number;
  token: string;
  token_id: string;
  token_expires_at: string;
  downloaded_at: string;
  current_page: number;
  total_pages: number;
}

export interface OfflineReadableBook {
  id: string;
  titre: string;
  auteur: string;
  cover_url: string | null;
  mime_type: string;
  data: ArrayBuffer;
  current_page: number;
  total_pages: number;
  token_expires_at: string;
}

interface OfflineTokenResponse {
  token: string;
  tokenId: string;
  downloadUrl: string;
  expiresAt: string;
  book: {
    id: string;
    titre: string;
    pages_count: number;
  };
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_BOOKS)) {
          db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
        }
      },
    });
  }

  return dbPromise;
}

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('AUTH_REQUIRED');
  return session.access_token;
}

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

async function deriveKeyFromOfflineToken(token: string): Promise<CryptoKey> {
  const tokenBytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', tokenBytes);
  return crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptWithToken(data: ArrayBuffer, token: string): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const key = await deriveKeyFromOfflineToken(token);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { encrypted, iv };
}

async function decryptWithToken(data: ArrayBuffer, iv: Uint8Array, token: string): Promise<ArrayBuffer> {
  const key = await deriveKeyFromOfflineToken(token);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
}

function assertTokenValid(book: OfflineReaderBook) {
  if (new Date(book.token_expires_at).getTime() <= Date.now()) {
    throw new Error('OFFLINE_TOKEN_EXPIRED');
  }
}

async function requestOfflineToken(bookId: string): Promise<OfflineTokenResponse> {
  const authToken = await getAuthToken();
  const response = await fetch(`/api/reader/${encodeURIComponent(bookId)}/offline-token`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'OFFLINE_TOKEN_FAILED');
  }

  return data as OfflineTokenResponse;
}

export async function downloadBookForOffline(book: GoogleBook): Promise<OfflineReaderBook> {
  const tokenData = await requestOfflineToken(book.id);
  const pdfResponse = await fetch(tokenData.downloadUrl);

  if (!pdfResponse.ok) {
    throw new Error('PDF_DOWNLOAD_FAILED');
  }

  const mimeType = pdfResponse.headers.get('content-type') || 'application/pdf';
  const pdfBuffer = await pdfResponse.arrayBuffer();
  const encrypted = await encryptWithToken(pdfBuffer, tokenData.token);

  const offlineBook: OfflineReaderBook = {
    id: book.id,
    titre: book.title || tokenData.book.titre,
    auteur: book.authors?.join(', ') || '',
    cover_url: book.cover || null,
    mime_type: mimeType,
    encrypted_data: encrypted.encrypted,
    encryption_iv: encrypted.iv,
    size_bytes: pdfBuffer.byteLength,
    token: tokenData.token,
    token_id: tokenData.tokenId,
    token_expires_at: tokenData.expiresAt,
    downloaded_at: new Date().toISOString(),
    current_page: 1,
    total_pages: book.pageCount || tokenData.book.pages_count || 0,
  };

  const db = await getDB();
  await db.put(STORE_BOOKS, offlineBook);
  window.dispatchEvent(new Event('offlineReaderUpdated'));
  return offlineBook;
}

export async function getOfflineReaderBook(bookId: string): Promise<OfflineReadableBook | null> {
  const db = await getDB();
  const stored = await db.get(STORE_BOOKS, bookId) as OfflineReaderBook | undefined;
  if (!stored) return null;

  assertTokenValid(stored);
  const data = await decryptWithToken(stored.encrypted_data, stored.encryption_iv, stored.token);

  return {
    id: stored.id,
    titre: stored.titre,
    auteur: stored.auteur,
    cover_url: stored.cover_url,
    mime_type: stored.mime_type,
    data,
    current_page: stored.current_page,
    total_pages: stored.total_pages,
    token_expires_at: stored.token_expires_at,
  };
}

export async function isOfflineReaderBookAvailable(bookId: string): Promise<boolean> {
  const db = await getDB();
  const stored = await db.get(STORE_BOOKS, bookId) as OfflineReaderBook | undefined;
  if (!stored) return false;

  if (new Date(stored.token_expires_at).getTime() <= Date.now()) {
    await db.delete(STORE_BOOKS, bookId);
    return false;
  }

  return true;
}

export async function listOfflineReaderBookIds(): Promise<string[]> {
  const db = await getDB();
  const books = await db.getAll(STORE_BOOKS) as OfflineReaderBook[];
  const validIds: string[] = [];

  for (const book of books) {
    if (new Date(book.token_expires_at).getTime() <= Date.now()) {
      await db.delete(STORE_BOOKS, book.id);
    } else {
      validIds.push(book.id);
    }
  }

  return validIds;
}

export async function removeOfflineReaderBook(bookId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_BOOKS, bookId);
  window.dispatchEvent(new Event('offlineReaderUpdated'));
}

export async function updateOfflineReaderProgress(
  bookId: string,
  currentPage: number,
  totalPages: number,
  tempsLectureMinutes = 0,
): Promise<void> {
  const db = await getDB();
  const stored = await db.get(STORE_BOOKS, bookId) as OfflineReaderBook | undefined;
  if (stored) {
    stored.current_page = currentPage;
    stored.total_pages = totalPages;
    await db.put(STORE_BOOKS, stored);
  }

  const userId = await getCurrentUserId();
  if (!userId) return;

  const payload = {
    user_id: userId,
    book_id: bookId,
    current_page: currentPage,
    total_pages: totalPages,
    temps_lecture_minutes: tempsLectureMinutes,
  };

  if (!navigator.onLine) {
    await addSyncAction({ type: 'reading_progress', payload });
    return;
  }

  const percentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 10000) / 100 : 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('reading_progress')
    .upsert({
      ...payload,
      pourcentage_lu: percentage,
      derniere_lecture: new Date().toISOString(),
      offline_disponible: true,
    }, {
      onConflict: 'user_id,book_id',
    });

  if (error) {
    await addSyncAction({ type: 'reading_progress', payload });
  }
}

export interface OfflineReaderBookMeta {
  id: string;
  titre: string;
  auteur: string;
  cover_url: string | null;
  mime_type: string;
  size_bytes: number;
  token_expires_at: string;
  downloaded_at: string;
  current_page: number;
  total_pages: number;
}

export async function listOfflineReaderBooks(): Promise<OfflineReaderBookMeta[]> {
  const db = await getDB();
  const books = await db.getAll(STORE_BOOKS) as OfflineReaderBook[];
  const valid: OfflineReaderBookMeta[] = [];

  for (const book of books) {
    if (new Date(book.token_expires_at).getTime() <= Date.now()) {
      await db.delete(STORE_BOOKS, book.id);
    } else {
      valid.push({
        id: book.id,
        titre: book.titre,
        auteur: book.auteur,
        cover_url: book.cover_url,
        mime_type: book.mime_type,
        size_bytes: book.size_bytes,
        token_expires_at: book.token_expires_at,
        downloaded_at: book.downloaded_at,
        current_page: book.current_page,
        total_pages: book.total_pages,
      });
    }
  }

  return valid;
}

export async function syncOfflineReaderProgress(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };
  return syncPendingActions();
}

export function startOfflineReaderAutoSync(onSync?: (result: { synced: number; failed: number }) => void): () => void {
  const handler = async () => {
    const result = await syncOfflineReaderProgress();
    if (result.synced > 0 || result.failed > 0) onSync?.(result);
  };

  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
