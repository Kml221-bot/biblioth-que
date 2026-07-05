// ============================================================
// BiblioTech — Cache des URLs signées pour accélérer l'ouverture
// Cache en mémoire avec expiration automatique
// ============================================================

interface CachedSignedUrl {
  url: string;
  expiresAt: string;
  sessionId: string | null;
  accessReason: string;
  cachedAt: number;
}

const urlCache = new Map<string, CachedSignedUrl>();

// Temps avant expiration du cache (50 minutes = avant l'expiration de l'URL signée de 60min)
const CACHE_TTL_MS = 50 * 60 * 1000;

/**
 * Récupère une URL signée depuis le cache si elle est encore valide
 */
export function getCachedSignedUrl(bookId: string): string | null {
  const cached = urlCache.get(bookId);
  if (!cached) return null;

  const now = Date.now();
  const expiresAt = new Date(cached.expiresAt).getTime();
  
  // Vérifier si le cache est expiré (ou si l'URL signée expire dans moins de 5 min)
  if (now >= cached.cachedAt + CACHE_TTL_MS || expiresAt - now < 5 * 60 * 1000) {
    urlCache.delete(bookId);
    return null;
  }

  return cached.url;
}

/**
 * Met en cache une URL signée
 */
export function setCachedSignedUrl(
  bookId: string,
  url: string,
  expiresAt: string,
  sessionId: string | null,
  accessReason: string
): void {
  urlCache.set(bookId, {
    url,
    expiresAt,
    sessionId,
    accessReason,
    cachedAt: Date.now(),
  });
}

/**
 * Invalide le cache d'un livre (utile lors du retour/renouvellement)
 */
export function invalidateBookCache(bookId: string): void {
  urlCache.delete(bookId);
}

/**
 * Nettoie tous les caches expirés (à appeler périodiquement)
 */
export function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [bookId, cached] of Array.from(urlCache.entries())) {
    if (now >= cached.cachedAt + CACHE_TTL_MS) {
      urlCache.delete(bookId);
    }
  }
}

// Nettoyage automatique toutes les 10 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanExpiredCache, 10 * 60 * 1000);
}
