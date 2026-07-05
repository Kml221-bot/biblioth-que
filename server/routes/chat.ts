import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { validate, chatBodySchema } from "../lib/validate.js";
import { redisIncr, redisTtl } from "../lib/redis.js";

const router = Router();

type ChatRole = "user" | "assistant" | "system";
type DetectedLanguage = "francais" | "wolof" | "pular";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface AuthContext {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  plan?: string | null;
}

interface ChatRequest extends Request {
  authUser?: AuthContext;
}

interface BookContext {
  id: string;
  titre: string;
  auteur: string;
  categorie: string;
  description?: string | null;
  extract?: string | null;
  pages: Array<{ page_number: number; content: string }>;
}

interface BookRecommendation {
  id: string;
  titre: string;
  auteur: string;
  categorie: string;
  prix_achat: number;
  prix_location: number;
  cover_url?: string | null;
  reason: string;
}

const CHAT_LIMIT_PER_HOUR = Number(process.env.BIBLIAI_MAX_MESSAGES_HOUR || 30);
const CHAT_WINDOW_MS = 60 * 60 * 1000;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "mistralai/mistral-small-24b-instruct-2501";
const PRICE_MIN_FCFA = 2000;
const PRICE_MAX_FCFA = 3000;

// Note : la Map in-process est conservée comme fallback si Redis est absent.
const chatCounters = new Map<string, { count: number; resetAt: number }>();

const WOLOF_WORDS = new Set([
  "ndax",
  "waaw",
  "deet",
  "xam",
  "xamuma",
  "janga",
  "jang",
  "sama",
  "sa",
  "naka",
  "lan",
  "lu",
  "mangi",
  "maa",
  "ngi",
  "bokk",
  "wax",
  "jox",
  "dama",
  "dafa",
  "bu",
  "ak",
]);

const PULAR_WORDS = new Set([
  "pular",
  "fulfulde",
  "pulaar",
  "mi",
  "aada",
  "hol",
  "ko",
  "ngam",
  "janngude",
  "yiyde",
  "maa",
  "min",
  "en",
  "dum",
  "no",
  "mbido",
]);

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

async function requireAuth(req: ChatRequest, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "AUTH_REQUIRED", reply: "Connexion obligatoire pour utiliser BibliAI." });
    return;
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    res.status(401).json({ error: "AUTH_INVALID", reply: "Session invalide. Reconnecte-toi puis reessaie." });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,email,first_name,last_name,plan,is_active")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    res.status(403).json({ error: "PROFILE_FORBIDDEN", reply: "Profil inactif ou introuvable." });
    return;
  }

  req.authUser = {
    id: profile.id,
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    plan: profile.plan,
  };
  next();
}

async function chatLimiter(req: ChatRequest, res: Response, next: NextFunction) {
  const userId = req.authUser?.id || req.ip || "anonymous";
  const redisKey = `ratelimit:chat:${userId}`;
  const windowSec = Math.ceil(CHAT_WINDOW_MS / 1000); // 3600 s

  // ── Tentative Redis ────────────────────────────────────────────────────────
  const redisCount = await redisIncr(redisKey, windowSec);

  if (redisCount !== null) {
    // Redis disponible : utiliser le compte distribué
    if (redisCount > CHAT_LIMIT_PER_HOUR) {
      const retryAfter = await redisTtl(redisKey) || 60;
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "CHAT_RATE_LIMITED",
        reply: `Tu as atteint la limite BibliAI de ${CHAT_LIMIT_PER_HOUR} messages par heure. Reessaie un peu plus tard.`,
        retryAfterSeconds: retryAfter,
      });
      return;
    }
    next();
    return;
  }

  // ── Fallback in-process si Redis est absent ────────────────────────────────
  const now = Date.now();
  const entry = chatCounters.get(userId);

  if (!entry || now > entry.resetAt) {
    chatCounters.set(userId, { count: 1, resetAt: now + CHAT_WINDOW_MS });
    next();
    return;
  }

  entry.count += 1;
  if (entry.count > CHAT_LIMIT_PER_HOUR) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({
      error: "CHAT_RATE_LIMITED",
      reply: `Tu as atteint la limite BibliAI de ${CHAT_LIMIT_PER_HOUR} messages par heure. Reessaie un peu plus tard.`,
      retryAfterSeconds: retryAfter,
    });
    return;
  }

  // Nettoyage périodique de la Map
  if (chatCounters.size > 1000) {
    for (const [key, value] of Array.from(chatCounters.entries())) {
      if (now > value.resetAt) chatCounters.delete(key);
    }
  }

  next();
}

function normalizeText(value: unknown, maxLength: number): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function sanitizeHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-12)
    .filter((item): item is ChatMessage => {
      const row = item as ChatMessage;
      return (
        !!row &&
        (row.role === "user" || row.role === "assistant") &&
        typeof row.content === "string" &&
        row.content.trim().length > 0
      );
    })
    .map(item => ({
      role: item.role,
      content: normalizeText(item.content, 1200),
    }))
    .filter(item => item.content.length > 0);
}

function detectLanguage(message: string): DetectedLanguage {
  const text = message.toLowerCase();
  const tokens = text
    .split(/[\s,.;:!?()[\]{}"'`<>/\\|+=*_~^-]+/)
    .filter(Boolean);

  const wolofScore = tokens.filter(token => WOLOF_WORDS.has(token)).length + (text.includes("wolof") ? 3 : 0);
  const pularScore = tokens.filter(token => PULAR_WORDS.has(token)).length + (text.includes("pular") || text.includes("pulaar") ? 3 : 0);

  if (pularScore >= 2 && pularScore >= wolofScore) return "pular";
  if (wolofScore >= 2) return "wolof";
  return "francais";
}

async function getBookContext(bookId: string): Promise<BookContext | null> {
  const { data: book, error: bookError } = await supabaseAdmin
    .from("books")
    .select("id,titre,auteur,categorie,description,extract,status")
    .eq("id", bookId)
    .maybeSingle();

  if (bookError || !book || book.status !== "publie") return null;

  const { data: pages, error: pagesError } = await supabaseAdmin
    .from("book_page_texts")
    .select("page_number,content")
    .eq("book_id", bookId)
    .order("page_number", { ascending: true })
    .limit(10);

  const fallbackPages = [
    { page_number: 1, content: normalizeText((book as any).extract || book.description || "", 6000) },
  ].filter(page => page.content);

  return {
    id: book.id,
    titre: book.titre,
    auteur: book.auteur,
    categorie: book.categorie,
    description: book.description,
    extract: (book as any).extract || null,
    pages: pagesError || !pages?.length
      ? fallbackPages
      : pages.map(page => ({
          page_number: Number(page.page_number || 1),
          content: normalizeText(page.content, 2500),
        })).filter(page => page.content),
  };
}

async function getRecommendations(userId: string): Promise<BookRecommendation[]> {
  const { data: borrowRows } = await supabaseAdmin
    .from("borrows")
    .select("book_id,created_at,books:book_id(id,titre,auteur,categorie)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  const borrowedIds = new Set<string>();
  const categories = new Set<string>();
  const anchors: string[] = [];

  for (const row of borrowRows || []) {
    if (row.book_id) borrowedIds.add(row.book_id);
    const book = Array.isArray(row.books) ? row.books[0] : row.books;
    if (book?.categorie) categories.add(book.categorie);
    if (book?.titre && anchors.length < 3) anchors.push(book.titre);
  }

  let query = supabaseAdmin
    .from("books")
    .select("id,titre,auteur,categorie,prix_achat,prix_location,cover_url")
    .eq("status", "publie")
    .gte("prix_achat", PRICE_MIN_FCFA)
    .lte("prix_achat", PRICE_MAX_FCFA)
    .limit(6);

  if (categories.size > 0) {
    query = query.in("categorie", Array.from(categories));
  }

  const { data, error } = await query;
  if (error) return [];

  return (data || [])
    .filter(book => !borrowedIds.has(book.id))
    .slice(0, 4)
    .map(book => ({
      id: book.id,
      titre: book.titre,
      auteur: book.auteur,
      categorie: book.categorie,
      prix_achat: Number(book.prix_achat || 0),
      prix_location: Number(book.prix_location || 0),
      cover_url: book.cover_url,
      reason: anchors.length
        ? `Selon tes emprunts recents: ${anchors.slice(0, 2).join(", ")}`
        : "Livre dans la fourchette recommandee 2000-3000 FCFA",
    }));
}

function formatBookContext(context: BookContext): string {
  const pagesText = context.pages.length
    ? context.pages.map(page => `Page ${page.page_number}: ${page.content}`).join("\n\n")
    : "Aucun texte de page indexe pour ce livre.";

  return `Tu as acces au livre "${context.titre}" de ${context.auteur}. Reponds UNIQUEMENT base sur ce contenu quand la question concerne ce livre. Citation de page autorisee, par exemple "Page 3 explique que...". Si le contenu fourni ne suffit pas, dis clairement que le passage n'est pas disponible dans les pages indexees. Tu peux produire un resume de chapitre, un quiz, ou expliquer un passage, mais sans inventer hors du contenu.

CONTENU DU LIVRE:
${pagesText}`;
}

function formatRecommendations(recommendations: BookRecommendation[]): string {
  if (!recommendations.length) {
    return "Aucune recommandation personnalisee disponible pour l'instant. Si tu suggeres des livres payants, privilegie la fourchette validee 2000-3000 FCFA.";
  }

  return recommendations
    .map(book => `- "${book.titre}" par ${book.auteur}, ${book.categorie}, achat ${book.prix_achat} FCFA. ${book.reason}`)
    .join("\n");
}

function buildSystemPrompt(
  language: DetectedLanguage,
  context: BookContext | null,
  recommendations: BookRecommendation[],
): string {
  const langInstruction = {
    francais: "Reponds en francais clair, naturel et pedagogique.",
    wolof: "L'utilisateur ecrit en wolof. Reponds en wolof simple et naturel, avec des explications accessibles.",
    pular: "L'utilisateur ecrit en pular. Reponds en pular simple quand possible. Si une notion est difficile, ajoute une courte clarification en francais.",
  }[language];

  const contextBlock = context
    ? formatBookContext(context)
    : "Mode general: tu peux aider a chercher un livre, expliquer un sujet, proposer des lectures, resumer une oeuvre connue, creer un quiz, ou guider l'utilisateur dans BiblioTech.";

  return `Tu es BibliAI, tuteur contextuel de BiblioTech.

${langInstruction}

Regles:
- Authentique, bienveillant, concis, utile pour un eleve/etudiant.
- Si un contexte livre est fourni, reponds seulement a partir du contenu indexe du livre pour toute question sur ce livre.
- Cite les pages quand le contexte contient des pages.
- Pour les recommandations payantes, suggere en priorite des livres dans la fourchette 2000-3000 FCFA.
- Ne promets pas un livre, un audio ou un telechargement si les donnees fournies ne le confirment pas.
- En cas de doute, dis ce qui manque et propose l'etape suivante.

${contextBlock}

Recommandations personnalisees disponibles:
${formatRecommendations(recommendations)}`;
}

function getFallback(language: DetectedLanguage, context: BookContext | null): string {
  if (context?.pages.length) {
    return `Je n'arrive pas a joindre le moteur IA pour l'instant, mais le contexte de "${context.titre}" est bien charge. Reessaie dans quelques secondes pour le resume, le quiz ou l'explication de passage.`;
  }

  if (language === "wolof") return "BibliAI am na jafe-jafe leegi. Jangal bi dina dellusi, jemaalaat ci kanam.";
  if (language === "pular") return "BibliAI woodi cadeele jooni. Tiidno eto kadi e yeeso.";
  return "BibliAI est momentanement indisponible. Reessaie dans quelques instants.";
}

async function callOpenRouter(messages: ChatMessage[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || "https://bibliotech.sn",
      "X-Title": "BiblioTech",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      max_tokens: 850,
      temperature: 0.45,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("OpenRouter error:", data);
    return null;
  }

  const reply = data?.choices?.[0]?.message?.content;
  return typeof reply === "string" && reply.trim() ? reply.trim() : null;
}

router.post("/", requireAuth, chatLimiter, validate("body", chatBodySchema), async (req: ChatRequest, res: Response) => {
  try {
    const user = req.authUser!;
    const message = normalizeText(req.body?.message, 1800);
    const bookContextId = normalizeText(req.body?.book_context_id || req.body?.bookContextId, 80);

    if (!message) {
      res.status(400).json({ error: "MESSAGE_REQUIRED", reply: "Message vide ou invalide." });
      return;
    }

    const [context, recommendations] = await Promise.all([
      bookContextId ? getBookContext(bookContextId) : Promise.resolve(null),
      getRecommendations(user.id),
    ]);

    if (bookContextId && !context) {
      res.status(404).json({
        error: "BOOK_CONTEXT_NOT_FOUND",
        reply: "Je n'ai pas trouve ce livre publie dans le catalogue BiblioTech.",
      });
      return;
    }

    const language = detectLanguage(message);
    const messages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(language, context, recommendations) },
      ...sanitizeHistory(req.body?.history),
      { role: "user", content: message },
    ];

    const reply = await callOpenRouter(messages);
    res.json({
      reply: reply || getFallback(language, context),
      language,
      book_context: context
        ? {
            id: context.id,
            titre: context.titre,
            auteur: context.auteur,
            pages_loaded: context.pages.length,
          }
        : null,
      recommendations,
      fallback: !reply,
    });
  } catch (error) {
    console.error("BibliAI error:", error);
    res.status(500).json({
      error: "BIBLIAI_FAILED",
      reply: "BibliAI n'a pas pu traiter ce message pour le moment.",
    });
  }
});

export default router;
