import { createHash } from "crypto";
import { Router } from "express";
import type { Request } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

type SearchSort = "pertinence" | "popularite" | "popularité" | "popularity" | "note" | "date";

interface SearchFilters {
  categorie?: string;
  filiere?: string;
  type_acces?: string;
  prix_max?: number;
}

function normalizeQuery(value: unknown): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = normalizeQuery(value);
  return normalized || null;
}

function hashValue(value: string): string {
  const salt = process.env.SEARCH_LOG_SALT || "bibliotech-search";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || "";
  return req.socket.remoteAddress || "";
}

function parseFilters(req: Request): SearchFilters {
  let parsed: Record<string, unknown> = {};
  const rawFilters = req.query.filters;

  if (typeof rawFilters === "string" && rawFilters.trim()) {
    try {
      parsed = JSON.parse(rawFilters) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }

  const prixMaxSource = req.query.prix_max ?? parsed.prix_max;
  const prixMax = prixMaxSource === undefined || prixMaxSource === ""
    ? undefined
    : Number(prixMaxSource);

  return {
    categorie: normalizeOptionalString(req.query.categorie ?? parsed.categorie) || undefined,
    filiere: normalizeOptionalString(req.query.filiere ?? parsed.filiere) || undefined,
    type_acces: normalizeOptionalString(req.query.type_acces ?? parsed.type_acces) || undefined,
    prix_max: Number.isFinite(prixMax) ? Math.max(0, Number(prixMax)) : undefined,
  };
}

function parseSort(value: unknown): SearchSort {
  const sort = normalizeQuery(value || "pertinence").toLowerCase() as SearchSort;
  if (["popularite", "popularité", "popularity", "note", "date"].includes(sort)) return sort;
  return "pertinence";
}

function parsePagination(req: Request) {
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 50);
  const page = Math.max(Number(req.query.page || 1), 1);
  const offset = Math.max(Number(req.query.offset || (page - 1) * limit), 0);
  return { limit, offset, page };
}

async function logSearch(req: Request, query: string, filters: SearchFilters, resultsCount: number) {
  const userAgent = String(req.headers["user-agent"] || "");
  const { error } = await supabaseAdmin.from("search_logs").insert({
    query_hash: hashValue(query.toLowerCase()),
    query_length: query.length,
    filters,
    results_count: resultsCount,
    ip_hash: getClientIp(req) ? hashValue(getClientIp(req)) : null,
    user_agent_hash: userAgent ? hashValue(userAgent) : null,
  });

  if (error) {
    console.warn("Impossible de journaliser la recherche:", error.message);
  }
}

async function getSuggestions(query: string, limit = 5) {
  if (!query) return [];

  const { data, error } = await supabaseAdmin.rpc("search_book_suggestions", {
    p_query: query,
    p_limit: limit,
  });

  if (error) {
    const fallback = await fallbackSuggestions(query, limit);
    return fallback;
  }

  return data || [];
}

async function fallbackSuggestions(query: string, limit = 5) {
  const safeQuery = query.replaceAll("%", "\\%").replaceAll("_", "\\_");
  const { data, error } = await supabaseAdmin
    .from("books")
    .select("titre,auteur")
    .eq("status", "publie")
    .or(`titre.ilike.%${safeQuery}%,auteur.ilike.%${safeQuery}%`)
    .limit(limit);

  if (error) return [];

  const suggestions = new Map<string, { value: string; type: string; score: number }>();
  for (const row of data || []) {
    if (row.titre && suggestions.size < limit) {
      suggestions.set(`title:${row.titre}`, { value: row.titre, type: "title", score: 0 });
    }
    if (row.auteur && suggestions.size < limit) {
      suggestions.set(`author:${row.auteur}`, { value: row.auteur, type: "author", score: 0 });
    }
  }

  return Array.from(suggestions.values()).slice(0, limit);
}

async function fallbackSearch(query: string, filters: SearchFilters, sort: SearchSort, limit: number, offset: number) {
  const safeQuery = query.replaceAll("%", "\\%").replaceAll("_", "\\_");
  let request = supabaseAdmin
    .from("books")
    .select("*")
    .eq("status", "publie");

  if (query) {
    request = request.or(`titre.ilike.%${safeQuery}%,auteur.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
  }
  if (filters.categorie) request = request.eq("categorie", filters.categorie);
  if (filters.type_acces) request = request.eq("type", filters.type_acces);
  if (filters.prix_max !== undefined) {
    request = request.or(`prix_achat.lte.${filters.prix_max},prix_location.lte.${filters.prix_max}`);
  }

  if (sort === "date") request = request.order("created_at", { ascending: false });
  else request = request.order("titre", { ascending: true });

  const { data, error } = await request.range(offset, offset + limit - 1);
  if (error) throw error;

  return (data || []).map(row => ({
    ...row,
    popularity: 0,
    note: 0,
    rank: 0,
    similarity_score: 0,
  }));
}

router.get("/", async (req, res) => {
  const query = normalizeQuery(req.query.q);
  const filters = parseFilters(req);
  const sort = parseSort(req.query.sort);
  const { limit, offset, page } = parsePagination(req);

  try {
    const { data, error } = await supabaseAdmin.rpc("search_books", {
      p_query: query,
      p_categorie: filters.categorie || null,
      p_filiere: filters.filiere || null,
      p_type_acces: filters.type_acces || null,
      p_prix_max: filters.prix_max ?? null,
      p_sort: sort,
      p_limit: limit,
      p_offset: offset,
    });

    const results = error
      ? await fallbackSearch(query, filters, sort, limit, offset)
      : data || [];

    const suggestions = results.length === 0 ? await getSuggestions(query, 5) : [];
    await logSearch(req, query, filters, results.length);

    res.json({
      query,
      filters,
      sort,
      pagination: {
        page,
        limit,
        offset,
        returned: results.length,
      },
      suggestions: suggestions.length > 0 ? { label: "Voulez-vous dire...", items: suggestions } : null,
      results,
      engine: error ? "fallback-ilike" : "postgres-full-text-trgm",
    });
  } catch (error) {
    console.error("Erreur recherche:", error);
    res.status(500).json({ error: "SEARCH_FAILED", message: "Impossible d'executer la recherche." });
  }
});

router.get("/suggestions", async (req, res) => {
  const query = normalizeQuery(req.query.q);

  try {
    const suggestions = await getSuggestions(query, 5);
    res.json({
      query,
      suggestions,
      debounceMs: 300,
    });
  } catch (error) {
    console.error("Erreur suggestions recherche:", error);
    res.status(500).json({ error: "SUGGESTIONS_FAILED", message: "Impossible de charger les suggestions." });
  }
});

export default router;
