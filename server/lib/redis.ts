// ─── Client Redis partagé ─────────────────────────────────────────────────────
// Connexion unique et lazy ; silencieuse si REDIS_URL manque.
// Toutes les fonctions "fail-open" : une erreur Redis ne bloque pas l'app.

import { Redis } from "ioredis";
import { logger } from "./logger.js";

let _client: InstanceType<typeof Redis> | null = null;

function getClient(): InstanceType<typeof Redis> | null {
  if (_client) return _client;

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn("REDIS_URL absent — rate limiting Redis désactivé (fallback in-process).");
    return null;
  }

  _client = new Redis(url, {
    lazyConnect: true,
    // Rejette immédiatement si Redis est offline (pas de queue bloquante)
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    commandTimeout: 2000,
  });

  _client.on("error", (err: Error) => {
    logger.warn(`Redis error (non-fatal): ${err.message}`);
  });

  return _client;
}

/**
 * Incrémente un compteur Redis avec une fenêtre glissante.
 * Retourne le compte actuel, ou null si Redis est indisponible.
 *
 * Algorithme : INCR + EXPIRE (si première incrémentation de la fenêtre).
 * Garantit que la fenêtre expire exactement `windowSeconds` après le
 * premier appel, quelle que soit la cadence suivante.
 */
export async function redisIncr(key: string, windowSeconds: number): Promise<number | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const count = await client.incr(key);
    if (count === 1) {
      // Premier appel dans la fenêtre → positionner l'expiration
      await client.expire(key, windowSeconds);
    }
    return count;
  } catch (err) {
    logger.warn(`Redis INCR échoué pour la clé "${key}" (fail-open): ${err}`);
    return null;
  }
}

/**
 * Retourne le TTL restant (secondes) pour une clé.
 * Retourne 0 si Redis est indisponible ou si la clé n'existe pas.
 */
export async function redisTtl(key: string): Promise<number> {
  const client = getClient();
  if (!client) return 0;

  try {
    const ttl = await client.ttl(key);
    return Math.max(0, ttl);
  } catch {
    return 0;
  }
}

/**
 * Ferme la connexion Redis proprement (pour les tests ou l'arrêt gracieux).
 */
export async function closeRedis(): Promise<void> {
  if (_client) {
    await _client.quit().catch(() => _client?.disconnect());
    _client = null;
  }
}
