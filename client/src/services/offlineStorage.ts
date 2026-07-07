
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'bibliotech-offline';
const DB_VERSION = 2;
const STORE_BOOKS = 'offline-books';
const STORE_SYNC = 'sync-queue';
const STORE_KEYS = 'crypto-keys';
const OFFLINE_BOOKS_KEY_ID = 'offline-books-v1';

// ── Types ────────────────────────────────────────────────────

export interface OfflineBook {
  id: string;               // book_id
  titre: string;
  auteur: string;
  cover_url: string | null;
  format: 'pdf' | 'epub';
  data: ArrayBuffer;         // contenu du fichier chiffré
  size_bytes: number;
  downloaded_at: number;     // timestamp
  expires_at: number | null; // null = achat, timestamp = emprunt
  current_page: number;
  total_pages: number;
}

export interface SyncAction {
  id: string;
  type: 'reading_progress' | 'book_note' | 'reading_session';
  payload: Record<string, unknown>;
  created_at: number;
  retries: number;
}

interface StoredOfflineBook extends OfflineBook {
  encrypted?: true;
  encryption_iv?: Uint8Array;
}

// ── Limites par plan ─────────────────────────────────────────

const OFFLINE_LIMITS: Record<string, number> = {
  free: 5,
  student: 15,
  premium: -1, // illimité
  school: -1,
};

// ── Initialisation de la base IndexedDB ──────────────────────

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store pour les livres téléchargés
        if (!db.objectStoreNames.contains(STORE_BOOKS)) {
          db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
        }
        // Store pour les actions en attente de sync
        if (!db.objectStoreNames.contains(STORE_SYNC)) {
          db.createObjectStore(STORE_SYNC, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_KEYS)) {
          db.createObjectStore(STORE_KEYS, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

async function getOfflineCryptoKey(): Promise<CryptoKey> {
  const db = await getDB();
  const existing = await db.get(STORE_KEYS, OFFLINE_BOOKS_KEY_ID) as { id: string; key: CryptoKey } | undefined;
  if (existing?.key) return existing.key;

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  await db.put(STORE_KEYS, { id: OFFLINE_BOOKS_KEY_ID, key });
  return key;
}

async function encryptOfflineData(data: ArrayBuffer): Promise<{ data: ArrayBuffer; iv: Uint8Array }> {
  const key = await getOfflineCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { data: encrypted, iv };
}

async function decryptOfflineBook(book: StoredOfflineBook): Promise<OfflineBook> {
  if (!book.encrypted || !book.encryption_iv) return book;

  const key = await getOfflineCryptoKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: book.encryption_iv },
    key,
    book.data
  );

  const { encrypted: _encrypted, encryption_iv: _iv, ...plainBook } = book;
  return { ...plainBook, data: decrypted };
}

// ── API publique : Livres offline ────────────────────────────

/** Sauvegarder un livre pour lecture hors-ligne */
export async function saveBookOffline(book: OfflineBook): Promise<void> {
  const db = await getDB();
  const encrypted = await encryptOfflineData(book.data);
  const storedBook: StoredOfflineBook = {
    ...book,
    data: encrypted.data,
    encrypted: true,
    encryption_iv: encrypted.iv,
  };
  await db.put(STORE_BOOKS, storedBook);
}

/** Récupérer un livre offline par son ID */
export async function getOfflineBook(bookId: string): Promise<OfflineBook | undefined> {
  const db = await getDB();
  const book = await db.get(STORE_BOOKS, bookId) as StoredOfflineBook | undefined;
  return book ? decryptOfflineBook(book) : undefined;
}

/** Lister tous les livres offline */
export async function getAllOfflineBooks(): Promise<OfflineBook[]> {
  const db = await getDB();
  const books = await db.getAll(STORE_BOOKS) as StoredOfflineBook[];
  return Promise.all(books.map(book => decryptOfflineBook(book)));
}

/** Supprimer un livre offline */
export async function removeOfflineBook(bookId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_BOOKS, bookId);
}

/** Vérifier si un livre est disponible offline */
export async function isBookOffline(bookId: string): Promise<boolean> {
  const book = await getOfflineBook(bookId);
  if (!book) return false;
  // Vérifier si l'emprunt n'a pas expiré
  if (book.expires_at && book.expires_at < Date.now()) {
    await removeOfflineBook(bookId);
    return false;
  }
  return true;
}

/** Nombre de livres offline */
export async function getOfflineCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_BOOKS);
}

/** Espace total utilisé (en bytes) */
export async function getOfflineStorageUsed(): Promise<number> {
  const books = await getAllOfflineBooks();
  return books.reduce((total, book) => total + book.size_bytes, 0);
}

/** Vérifier si on peut télécharger un livre supplémentaire */
export async function canDownloadMore(plan: string): Promise<boolean> {
  const limit = OFFLINE_LIMITS[plan] ?? 5;
  if (limit === -1) return true; // illimité
  const count = await getOfflineCount();
  return count < limit;
}

/** Limite offline pour un plan donné */
export function getOfflineLimit(plan: string): number {
  return OFFLINE_LIMITS[plan] ?? 5;
}

/** Supprimer les livres expirés */
export async function cleanExpiredBooks(): Promise<number> {
  const books = await getAllOfflineBooks();
  const now = Date.now();
  let removed = 0;

  for (const book of books) {
    if (book.expires_at && book.expires_at < now) {
      await removeOfflineBook(book.id);
      removed++;
    }
  }

  return removed;
}

/** Mettre à jour la progression d'un livre offline */
export async function updateOfflineProgress(
  bookId: string,
  currentPage: number
): Promise<void> {
  const book = await getOfflineBook(bookId);
  if (book) {
    book.current_page = currentPage;
    await saveBookOffline(book);
  }
}

// ── API publique : File d'attente de synchronisation ─────────

/** Ajouter une action à synchroniser */
export async function addSyncAction(action: Omit<SyncAction, 'id' | 'created_at' | 'retries'>): Promise<void> {
  const db = await getDB();
  const syncAction: SyncAction = {
    ...action,
    id: crypto.randomUUID(),
    created_at: Date.now(),
    retries: 0,
  };
  await db.put(STORE_SYNC, syncAction);
}

/** Récupérer toutes les actions en attente */
export async function getPendingSyncActions(): Promise<SyncAction[]> {
  const db = await getDB();
  return db.getAll(STORE_SYNC);
}

/** Supprimer une action synchronisée */
export async function removeSyncAction(actionId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_SYNC, actionId);
}

/** Nombre d'actions en attente */
export async function getPendingSyncCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_SYNC);
}

/** Vider toutes les actions synchronisées */
export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_SYNC);
}
