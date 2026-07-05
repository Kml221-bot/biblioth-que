import { createCipheriv, createHash, randomBytes, randomUUID } from "crypto";
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { signedUrlExpiresAt } from "../services/domainRules.js";
import { validate, uuidParams } from "../lib/validate.js";

const router = Router();

type AccessReason = "borrow" | "purchase" | "subscription" | "free";

interface AuthContext {
  id: string;
  email: string;
  plan: string;
  is_active: boolean;
}

interface ReaderRequest extends Request {
  authUser?: AuthContext;
}

interface BookRow {
  id: string;
  titre: string;
  type: string;
  pdf_url: string | null;
  read_url: string | null;
  pages_count: number | null;
}

interface StorageRef {
  bucket: string;
  path: string;
}

const SIGNED_URL_EXPIRES_SECONDS = 60 * 60;
const OFFLINE_TOKEN_DAYS = 30;
const OFFLINE_ALLOWED_PLANS = new Set(["student", "premium", "school", "school_s", "school_l"]);

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || null;
  return req.socket.remoteAddress || null;
}

function getTokenSecret(): Buffer {
  const raw = process.env.OFFLINE_TOKEN_SECRET;
  if (!raw) throw new Error("OFFLINE_TOKEN_SECRET manquant dans les variables d'environnement.");
  return createHash("sha256").update(raw).digest();
}

function encryptOfflinePayload(payload: Record<string, unknown>): string {
  const iv = randomBytes(12);
  const key = getTokenSecret();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "bt-offline-v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

async function requireAuth(req: ReaderRequest, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "AUTH_REQUIRED", message: "Connexion obligatoire." });
    return;
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    res.status(401).json({ error: "AUTH_INVALID", message: "Session invalide." });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,email,plan,is_active")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    res.status(403).json({ error: "PROFILE_FORBIDDEN", message: "Profil inactif ou introuvable." });
    return;
  }

  req.authUser = {
    id: profile.id,
    email: profile.email,
    plan: profile.plan,
    is_active: profile.is_active,
  };
  next();
}

function parseSupabaseStorageUrl(rawUrl: string | null): StorageRef | null {
  if (!rawUrl) return null;

  if (!/^https?:\/\//i.test(rawUrl)) {
    const [bucket, ...pathParts] = rawUrl.split("/").filter(Boolean);
    if (bucket && pathParts.length > 0) return { bucket, path: pathParts.join("/") };
    return null;
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const marker = "/storage/v1/object/";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex === -1) return null;

  const afterMarker = url.pathname.slice(markerIndex + marker.length);
  const parts = afterMarker.split("/").filter(Boolean);
  if (parts[0] === "public" || parts[0] === "sign") parts.shift();
  const bucket = parts.shift();
  if (!bucket || parts.length === 0) return null;

  return {
    bucket,
    path: decodeURIComponent(parts.join("/")),
  };
}

function getBookStorageRef(book: BookRow): StorageRef | null {
  return parseSupabaseStorageUrl(book.pdf_url) || parseSupabaseStorageUrl(book.read_url);
}

async function getBook(bookId: string): Promise<BookRow | null> {
  const { data, error } = await supabaseAdmin
    .from("books")
    .select("id,titre,type,pdf_url,read_url,pages_count,status")
    .eq("id", bookId)
    .maybeSingle();

  if (error || !data || data.status !== "publie") return null;
  return data as BookRow;
}

async function hasActiveBorrow(userId: string, bookId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from("borrows")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .in("statut", ["actif", "prolonge"]);

  return !error && (count || 0) > 0;
}

async function hasPurchase(userId: string, bookId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("type", "achat")
    .eq("statut", "completed");

  return !error && (count || 0) > 0;
}

async function hasActiveSubscription(userId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("statut", "active")
    .gte("fin", new Date().toISOString());

  return !error && (count || 0) > 0;
}

async function getAccessReason(user: AuthContext, book: BookRow): Promise<AccessReason | null> {
  if (book.type === "gratuit") return "free";

  // ⚡ OPTIMISATION: Exécuter les 3 requêtes en parallèle au lieu de séquentiellement
  const [borrow, purchase, subscription] = await Promise.all([
    hasActiveBorrow(user.id, book.id),
    hasPurchase(user.id, book.id),
    hasActiveSubscription(user.id),
  ]);

  if (purchase) return "purchase";
  if (borrow) return "borrow";
  if (subscription) return "subscription";
  return null;
}

async function logReaderAccess(
  req: ReaderRequest,
  action: "signed_url" | "offline_token" | "offline_download",
  bookId: string,
  metadata: Record<string, unknown>,
) {
  const user = req.authUser!;
  const { error } = await supabaseAdmin.from("reader_access_logs").insert({
    user_id: user.id,
    book_id: bookId,
    action,
    metadata,
    ip_address: getClientIp(req),
    user_agent: String(req.headers["user-agent"] || ""),
  });

  if (error) {
    console.warn("Impossible de journaliser l'acces lecteur:", error.message);
  }
}

async function upsertReadingProgressOfflineFlag(userId: string, book: BookRow, offline: boolean) {
  const { data: existing } = await supabaseAdmin
    .from("reading_progress")
    .select("current_page,total_pages,pourcentage_lu,temps_lecture_minutes")
    .eq("user_id", userId)
    .eq("book_id", book.id)
    .maybeSingle();

  await supabaseAdmin.from("reading_progress").upsert({
    user_id: userId,
    book_id: book.id,
    current_page: existing?.current_page || 0,
    total_pages: existing?.total_pages || book.pages_count || 0,
    pourcentage_lu: existing?.pourcentage_lu || 0,
    temps_lecture_minutes: existing?.temps_lecture_minutes || 0,
    offline_disponible: offline,
    derniere_lecture: new Date().toISOString(),
  }, {
    onConflict: "user_id,book_id",
  });
}

router.get("/:bookId/url", requireAuth, validate("params", uuidParams("bookId")), async (req: ReaderRequest, res: Response) => {
  try {
    const user = req.authUser!;
    const book = await getBook(req.params.bookId);
    if (!book) {
      res.status(404).json({ error: "BOOK_NOT_FOUND", message: "Livre introuvable ou non publie." });
      return;
    }

    const accessReason = await getAccessReason(user, book);
    if (!accessReason) {
      res.status(403).json({ error: "BOOK_ACCESS_DENIED", message: "Emprunt, achat ou abonnement actif requis." });
      return;
    }

    const storageRef = getBookStorageRef(book);
    if (!storageRef) {
      res.status(400).json({ error: "BOOK_STORAGE_MISSING", message: "Ce livre n'a pas de PDF Supabase Storage signe." });
      return;
    }

    // ⚡ OPTIMISATION: Exécuter en parallèle la création d'URL signée + session + log
    const [signedUrlResult, sessionResult] = await Promise.all([
      supabaseAdmin.storage
        .from(storageRef.bucket)
        .createSignedUrl(storageRef.path, SIGNED_URL_EXPIRES_SECONDS, {
          download: false,
        }),
      supabaseAdmin
        .from("reading_sessions")
        .insert({
          user_id: user.id,
          book_id: book.id,
          debut: new Date().toISOString(),
        })
        .select("id")
        .single(),
    ]);

    const { data, error } = signedUrlResult;
    if (error || !data?.signedUrl) throw error || new Error("SIGNED_URL_FAILED");

    // Log en async (ne pas bloquer la réponse)
    logReaderAccess(req, "signed_url", book.id, {
      accessReason,
      bucket: storageRef.bucket,
      path: storageRef.path,
      expiresInSeconds: SIGNED_URL_EXPIRES_SECONDS,
      sessionId: sessionResult.data?.id || null,
    }).catch(err => console.warn("Erreur log accès:", err));

    res.json({
      url: data.signedUrl,
      expiresAt: signedUrlExpiresAt(new Date(), SIGNED_URL_EXPIRES_SECONDS),
      sessionId: sessionResult.data?.id || null,
      accessReason,
      book: {
        id: book.id,
        titre: book.titre,
        pages_count: book.pages_count || 0,
      },
    });
  } catch (error) {
    console.error("Erreur URL lecteur:", error);
    res.status(500).json({ error: "READER_URL_FAILED", message: "Impossible de generer l'URL de lecture." });
  }
});

router.get("/:bookId/offline-token", requireAuth, validate("params", uuidParams("bookId")), async (req: ReaderRequest, res: Response) => {
  try {
    const user = req.authUser!;
    if (!OFFLINE_ALLOWED_PLANS.has(user.plan)) {
      res.status(403).json({ error: "OFFLINE_PLAN_REQUIRED", message: "Plan Etudiant ou Premium requis pour le hors-ligne." });
      return;
    }

    const book = await getBook(req.params.bookId);
    if (!book) {
      res.status(404).json({ error: "BOOK_NOT_FOUND", message: "Livre introuvable ou non publie." });
      return;
    }

    const accessReason = await getAccessReason(user, book);
    if (!accessReason) {
      res.status(403).json({ error: "BOOK_ACCESS_DENIED", message: "Emprunt, achat ou abonnement actif requis." });
      return;
    }

    const storageRef = getBookStorageRef(book);
    if (!storageRef) {
      res.status(400).json({ error: "BOOK_STORAGE_MISSING", message: "Ce livre n'a pas de PDF Supabase Storage signe." });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + OFFLINE_TOKEN_DAYS);

    const tokenId = randomUUID();
    const token = encryptOfflinePayload({
      jti: tokenId,
      sub: user.id,
      bookId: book.id,
      bucket: storageRef.bucket,
      path: storageRef.path,
      accessReason,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    });

    const { data, error } = await supabaseAdmin.storage
      .from(storageRef.bucket)
      .createSignedUrl(storageRef.path, SIGNED_URL_EXPIRES_SECONDS, {
        download: true,
      });

    if (error || !data?.signedUrl) throw error || new Error("SIGNED_URL_FAILED");

    await Promise.all([
      logReaderAccess(req, "offline_token", book.id, {
        tokenId,
        accessReason,
        expiresAt: expiresAt.toISOString(),
        bucket: storageRef.bucket,
        path: storageRef.path,
      }),
      logReaderAccess(req, "offline_download", book.id, {
        tokenId,
        accessReason,
        expiresAt: expiresAt.toISOString(),
      }),
      upsertReadingProgressOfflineFlag(user.id, book, true),
    ]);

    res.json({
      token,
      tokenId,
      downloadUrl: data.signedUrl,
      expiresAt: expiresAt.toISOString(),
      tokenTtlDays: OFFLINE_TOKEN_DAYS,
      book: {
        id: book.id,
        titre: book.titre,
        pages_count: book.pages_count || 0,
      },
    });
  } catch (error) {
    console.error("Erreur token hors-ligne:", error);
    res.status(500).json({ error: "OFFLINE_TOKEN_FAILED", message: "Impossible de preparer le livre hors-ligne." });
  }
});

export default router;
