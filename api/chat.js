// ============================================================
// BiblioTech - Vercel Serverless Function: /api/chat
// ============================================================

const WOLOF_WORDS = [
  "ndax", "baye", "xamam", "xam", "def", "dafa", "maa", "ngi", "fi",
  "dem", "waaw", "deet", "yep", "begg", "wax", "jang", "sama", "seen",
  "ngeen", "mangui", "mangi", "topp", "jox",
];
const PULAR_WORDS = ["pular", "fulani", "peul", "mbaasen", "jande", "yiyde"];

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://bibliotech.sn",
];
const requestCounts = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

function detectLang(text) {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  const wolofScore = words.filter(w => WOLOF_WORDS.includes(w)).length + (lower.includes("wolof") ? 3 : 0);
  const pularScore = words.filter(w => PULAR_WORDS.includes(w)).length + (lower.includes("pular") ? 3 : 0);
  if (wolofScore >= 1) return "wolof";
  if (pularScore >= 1) return "pular";
  return "french";
}

function buildSystemPrompt(lang) {
  const langInstruction =
    lang === "wolof"
      ? "IMPORTANT: L'utilisateur ecrit en wolof. Tu DOIS repondre entierement en wolof."
      : lang === "pular"
        ? "IMPORTANT: L'utilisateur ecrit en pular. Tu DOIS repondre entierement en pular."
        : "Reponds toujours en francais, de maniere claire et naturelle.";

  return `Tu es BibliAI, l'assistant intelligent de BiblioTech.

${langInstruction}

Regles:
- Reponses concises, maximum 200 mots.
- Recommande uniquement des livres presents dans le catalogue BiblioTech.
- Si un livre n'est pas dans le catalogue, dis-le honnetement et propose une alternative.
- Pour emprunter: l'utilisateur clique sur "Emprunter" dans la fiche du livre.

Catalogue principal:
LITTERATURE AFRICAINE: "Une si longue lettre", "L'Aventure ambigue", "Les Bouts de bois de Dieu", "La Greve des Battu".
MANGA & BD: Naruto, Demon Slayer, One Piece, Dragon Ball, Attack on Titan, My Hero Academia.
CLASSIQUES: Le Petit Prince, 1984, L'Etranger.`;
}

function getFallback(lang) {
  if (lang === "wolof") return "Baal ma, probleme ak connexion bi. Reessaie ci kanam.";
  if (lang === "pular") return "Mbaasiraama, jooni tamondiraani. Eto mi yiida e simo.";
  return "Je rencontre un probleme de connexion momentane. Reessaie dans quelques instants.";
}

function getAllowedOrigins() {
  return (process.env.CORS_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && getAllowedOrigins().includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
}

async function verifySupabaseUser(req) {
  const token = getBearerToken(req);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  return response.json();
}

function isRateLimited(key) {
  const now = Date.now();
  const entry = requestCounts.get(key);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-10)
    .filter(item =>
      item &&
      ["user", "assistant"].includes(item.role) &&
      typeof item.content === "string" &&
      item.content.trim().length > 0 &&
      item.content.length <= 1000
    )
    .map(item => ({ role: item.role, content: item.content.trim() }));
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ reply: "Method not allowed" });

  const user = await verifySupabaseUser(req);
  if (!user?.id) {
    return res.status(401).json({ reply: "Connexion requise pour utiliser BibliAI." });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(user.id || ip)) {
    return res.status(429).json({ reply: "Trop de messages en peu de temps. Attends une minute avant de reessayer." });
  }

  const { message, history = [] } = req.body || {};
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ reply: "Message vide ou invalide." });
  }
  if (message.length > 1000) {
    return res.status(400).json({ reply: "Message trop long (max 1000 caracteres)." });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ reply: "Cle API non configuree." });
  }

  const lang = detectLang(message.trim());
  const messages = [
    { role: "system", content: buildSystemPrompt(lang) },
    ...sanitizeHistory(history),
    { role: "user", content: message.trim() },
  ];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bibliotech.sn",
        "X-Title": "BiblioTech",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-24b-instruct-2501",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.json({ reply: getFallback(lang) });
    return res.json({ reply: data.choices?.[0]?.message?.content ?? getFallback(lang) });
  } catch {
    return res.json({ reply: getFallback(lang) });
  }
}
