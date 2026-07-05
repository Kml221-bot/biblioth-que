import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { validate, uuidParams, reviewBodySchema } from "../lib/validate.js";

const router = Router();

const CATEGORY_PRIORITY = [
  "Informatique & Cybersécurité",
  "Développement Personnel",
  "Littérature Africaine & Sénégalaise",
  "Économie & Business",
  "Dark Romance",
  "Manga & BD",
  "Droit & Sciences Politiques",
];

const LIST_COLUMNS = [
  "id",
  "titre",
  "auteur",
  "categorie",
  "prix_achat",
  "prix_location",
  "prix_location_7j",
  "prix_location_30j",
  "cover_url",
  "note_moyenne",
  "nb_emprunts",
  "type",
  "type_acces",
  "status",
  "featured",
  "created_at",
].join(",");

const DETAIL_COLUMNS = [
  LIST_COLUMNS,
  "sous_categorie",
  "filiere",
  "description",
  "format",
  "read_url",
  "pages_count",
  "langue",
  "isbn",
  "editeur",
  "annee_publication",
  "tags",
  "extract",
  "nb_vues",
  "author_profile_id",
].join(",");

interface AuthContext {
  id: string;
  email: string;
  role: string;
  preferred_categories?: string[];
}

interface BooksRequest extends Request {
  authUser?: AuthContext | null;
}

interface BookListRow {
  id: string;
  titre: string;
  auteur: string;
  categorie: string;
  prix_achat: number | null;
  prix_location?: number | null;
  prix_location_7j: number | null;
  prix_location_30j: number | null;
  cover_url: string | null;
  note_moyenne: number | string | null;
  nb_emprunts: number | null;
  type?: string | null;
  type_acces: string | null;
  status?: string | null;
  statut?: string | null;
  featured: boolean | null;
  rank?: number | null;
  similarity_score?: number | null;
  category_priority?: number | null;
  created_at?: string | null;
}

type BookDetailRow = BookListRow & {
  sous_categorie?: string | null;
  filiere?: string | null;
  description?: string | null;
  format?: string | null;
  read_url?: string | null;
  pages_count?: number | null;
  langue?: string | null;
  isbn?: string | null;
  editeur?: string | null;
  annee_publication?: number | null;
  tags?: string[] | null;
  extract?: string | null;
  nb_vues?: number | null;
  author_profile_id?: string | null;
};

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function normalizeText(value: unknown, max = 160): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function optionalText(value: unknown, max = 160): string | null {
  const normalized = normalizeText(value, max);
  return normalized || null;
}

function parseBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "oui"].includes(normalized)) return true;
  if (["false", "0", "no", "non"].includes(normalized)) return false;
  return null;
}

function parsePagination(req: Request) {
  const limit = Math.min(Math.max(Number(req.query.limit || 24), 1), 100);
  const page = Math.max(Number(req.query.page || 1), 1);
  const offset = Math.max(Number(req.query.offset || (page - 1) * limit), 0);
  return { limit, page, offset };
}

function getCategoryPriority(category: string | null | undefined): number {
  const index = CATEGORY_PRIORITY.indexOf(category || "");
  return index === -1 ? 99 : index + 1;
}

function sortBySurveyPriority<T extends BookListRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const priorityDelta = getCategoryPriority(a.categorie) - getCategoryPriority(b.categorie);
    if (priorityDelta !== 0) return priorityDelta;
    if (Boolean(a.featured) !== Boolean(b.featured)) return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    const borrowDelta = Number(b.nb_emprunts || 0) - Number(a.nb_emprunts || 0);
    if (borrowDelta !== 0) return borrowDelta;
    const noteDelta = Number(b.note_moyenne || 0) - Number(a.note_moyenne || 0);
    if (noteDelta !== 0) return noteDelta;
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });
}

function sortByUserPreferences<T extends BookListRow>(rows: T[], preferredCategories: string[] = []): T[] {
  if (preferredCategories.length === 0) return rows;

  return [...rows].sort((a, b) => {
    const preferredA = preferredCategories.indexOf(a.categorie);
    const preferredB = preferredCategories.indexOf(b.categorie);
    if (preferredA !== -1 || preferredB !== -1) {
      return (preferredA === -1 ? 99 : preferredA) - (preferredB === -1 ? 99 : preferredB);
    }
    return 0;
  });
}

function mapBookListRow(row: BookListRow, flags?: { borrowed?: boolean; purchased?: boolean }) {
  const typeAcces = row.type_acces || row.type || "gratuit";

  return {
    id: row.id,
    titre: row.titre,
    auteur: row.auteur,
    categorie: row.categorie,
    prix_achat: Number(row.prix_achat || 0),
    prix_location_7j: Number(row.prix_location_7j ?? row.prix_location ?? 0),
    prix_location_30j: Number(row.prix_location_30j ?? row.prix_location ?? 0),
    cover_url: row.cover_url,
    note_moyenne: Number(row.note_moyenne || 0),
    nb_emprunts: Number(row.nb_emprunts || 0),
    type_acces: typeAcces,
    statut: row.statut || row.status || "publie",
    featured: Boolean(row.featured),
    isLogged: Boolean(flags),
    deja_emprunte: Boolean(flags?.borrowed),
    deja_achete: Boolean(flags?.purchased),
    score: row.rank !== undefined || row.similarity_score !== undefined
      ? Number(row.rank || 0) + Number(row.similarity_score || 0)
      : undefined,
  };
}

function mapBookDetailRow(
  row: BookDetailRow,
  extras: {
    borrowed: boolean;
    purchased: boolean;
    reviews: unknown[];
    authorProfile: unknown | null;
  },
) {
  return {
    ...mapBookListRow(row, { borrowed: extras.borrowed, purchased: extras.purchased }),
    sous_categorie: row.sous_categorie || null,
    filiere: row.filiere || null,
    description: row.description || null,
    format: row.format || "pdf",
    read_url: row.read_url || null,
    pages_count: Number(row.pages_count || 0),
    langue: row.langue || "fr",
    isbn: row.isbn || null,
    editeur: row.editeur || null,
    annee_publication: row.annee_publication || null,
    tags: row.tags || [],
    extract: row.extract || null,
    nb_vues: Number(row.nb_vues || 0),
    author_profile: extras.authorProfile,
    reviews: extras.reviews,
  };
}

async function optionalAuth(req: BooksRequest, _res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    req.authUser = null;
    next();
    return;
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    req.authUser = null;
    next();
    return;
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id,email,role,preferred_categories")
    .eq("id", authData.user.id)
    .maybeSingle();

  req.authUser = profile
    ? { id: profile.id, email: profile.email, role: profile.role, preferred_categories: profile.preferred_categories || [] }
    : { id: authData.user.id, email: authData.user.email || "", role: "user" };
  next();
}

async function requireAuth(req: BooksRequest, res: Response, next: NextFunction) {
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
    .select("id,email,role,is_active,preferred_categories")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.is_active === false) {
    res.status(403).json({ error: "PROFILE_FORBIDDEN", message: "Profil inactif ou introuvable." });
    return;
  }

  req.authUser = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    preferred_categories: profile.preferred_categories || [],
  };
  next();
}

async function getAccessFlags(userId: string | undefined, bookIds: string[]) {
  const flags = new Map<string, { borrowed: boolean; purchased: boolean }>();
  for (const id of bookIds) flags.set(id, { borrowed: false, purchased: false });
  if (!userId || bookIds.length === 0) return flags;

  const [borrowsResult, purchasesResult] = await Promise.all([
    supabaseAdmin
      .from("borrows")
      .select("book_id")
      .eq("user_id", userId)
      .in("book_id", bookIds)
      .in("statut", ["actif", "prolonge"]),
    supabaseAdmin
      .from("transactions")
      .select("book_id")
      .eq("user_id", userId)
      .in("book_id", bookIds)
      .eq("type", "achat")
      .eq("statut", "completed"),
  ]);

  for (const row of borrowsResult.data || []) {
    const flag = flags.get(row.book_id);
    if (flag) flag.borrowed = true;
  }

  for (const row of purchasesResult.data || []) {
    if (!row.book_id) continue;
    const flag = flags.get(row.book_id);
    if (flag) flag.purchased = true;
  }

  return flags;
}

async function getSuggestions(query: string, limit = 5) {
  if (!query) return [];

  const { data, error } = await supabaseAdmin.rpc("books_catalogue_suggestions", {
    p_query: query,
    p_limit: limit,
  });

  if (!error) return data || [];

  const { data: fallback } = await supabaseAdmin
    .from("books")
    .select("titre,auteur")
    .eq("status", "publie")
    .or(`titre.ilike.%${query}%,auteur.ilike.%${query}%`)
    .limit(limit);

  const suggestions = new Map<string, { value: string; type: string; score: number }>();
  for (const row of fallback || []) {
    if (row.titre) suggestions.set(`title:${row.titre}`, { value: row.titre, type: "title", score: 0 });
    if (row.auteur) suggestions.set(`author:${row.auteur}`, { value: row.auteur, type: "author", score: 0 });
  }

  return Array.from(suggestions.values()).slice(0, limit);
}

async function fallbackList(req: Request, limit: number, offset: number) {
  const search = optionalText(req.query.search ?? req.query.q);
  const categorie = optionalText(req.query.categorie);
  const filiere = optionalText(req.query.filiere);
  const typeAcces = optionalText(req.query.type_acces);
  const statut = optionalText(req.query.statut) || "publie";
  const featured = parseBoolean(req.query.featured);

  let query = supabaseAdmin
    .from("books")
    .select(LIST_COLUMNS, { count: "exact" });

  if (statut) query = query.eq("status", statut);
  if (categorie) query = query.eq("categorie", categorie);
  if (filiere) query = query.or(`filiere.ilike.%${filiere}%,sous_categorie.ilike.%${filiere}%`);
  if (typeAcces) query = query.eq("type_acces", typeAcces);
  if (featured !== null) query = query.eq("featured", featured);
  if (search) query = query.or(`titre.ilike.%${search}%,auteur.ilike.%${search}%,description.ilike.%${search}%`);

  const { data, error, count } = await query.limit(500);
  if (error) throw error;

  const sorted = sortBySurveyPriority((data || []) as unknown as BookListRow[]);
  return {
    rows: sorted.slice(offset, offset + limit),
    total: count ?? sorted.length,
    engine: "fallback-ilike",
  };
}

router.get("/", optionalAuth, async (req: BooksRequest, res) => {
  const { limit, page, offset } = parsePagination(req);
  const search = optionalText(req.query.search ?? req.query.q);
  const categorie = optionalText(req.query.categorie);
  const filiere = optionalText(req.query.filiere);
  const typeAcces = optionalText(req.query.type_acces);
  const statut = optionalText(req.query.statut) || "publie";
  const featured = parseBoolean(req.query.featured);

  try {
    const { data, error } = await supabaseAdmin.rpc("books_catalogue_search", {
      p_query: search || "",
      p_categorie: categorie,
      p_filiere: filiere,
      p_type_acces: typeAcces,
      p_statut: statut,
      p_featured: featured,
      p_limit: 100,
      p_offset: 0,
    });

    const result = error
      ? await fallbackList(req, limit, offset)
      : {
        rows: ((data || []) as unknown as BookListRow[]).slice(offset, offset + limit),
        total: (data || []).length,
        engine: "postgres-full-text-trgm",
      };

    const preferredRows = sortByUserPreferences(result.rows, req.authUser?.preferred_categories || []);
    const flags = await getAccessFlags(req.authUser?.id, preferredRows.map(row => row.id));

    res.json({
      pagination: {
        page,
        limit,
        offset,
        total: result.total,
        returned: result.rows.length,
      },
      filters: { categorie, filiere, type_acces: typeAcces, statut, featured, search },
      categoriesPriority: CATEGORY_PRIORITY,
      preferredCategories: req.authUser?.preferred_categories || [],
      books: preferredRows.map(row => mapBookListRow(row, flags.get(row.id))),
      engine: result.engine,
    });
  } catch (error) {
    console.error("Erreur catalogue livres:", error);
    res.status(500).json({ error: "BOOKS_LIST_FAILED", message: "Impossible de charger le catalogue." });
  }
});

router.get("/featured", optionalAuth, async (req: BooksRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin.rpc("books_catalogue_search", {
      p_query: "",
      p_categorie: null,
      p_filiere: null,
      p_type_acces: null,
      p_statut: "publie",
      p_featured: true,
      p_limit: 50,
      p_offset: 0,
    });

    let rows = error ? [] : (data || []) as unknown as BookListRow[];

    if (rows.length < 6) {
      const fallback = await supabaseAdmin
        .from("books")
        .select(LIST_COLUMNS)
        .eq("status", "publie")
        .order("nb_emprunts", { ascending: false })
        .order("note_moyenne", { ascending: false })
        .limit(50);

      if (fallback.error) throw fallback.error;
      const existing = new Set(rows.map(row => row.id));
      rows = [...rows, ...((fallback.data || []) as unknown as BookListRow[]).filter(row => !existing.has(row.id))];
    }

    rows = sortByUserPreferences(sortBySurveyPriority(rows), req.authUser?.preferred_categories || []).slice(0, 6);
    const flags = await getAccessFlags(req.authUser?.id, rows.map(row => row.id));

    res.json({
      categoriesPriority: CATEGORY_PRIORITY,
      preferredCategories: req.authUser?.preferred_categories || [],
      books: rows.map(row => mapBookListRow(row, flags.get(row.id))),
    });
  } catch (error) {
    console.error("Erreur livres mis en avant:", error);
    res.status(500).json({ error: "FEATURED_BOOKS_FAILED", message: "Impossible de charger les livres mis en avant." });
  }
});

router.get("/categories", async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("books")
      .select("categorie")
      .eq("status", "publie");

    if (error) throw error;

    const counts = new Map<string, number>();
    for (const row of data || []) {
      if (!row.categorie) continue;
      counts.set(row.categorie, (counts.get(row.categorie) || 0) + 1);
    }

    const categories = Array.from(counts.entries())
      .map(([categorie, count]) => ({
        categorie,
        count,
        priority: getCategoryPriority(categorie),
      }))
      .sort((a, b) => a.priority - b.priority || a.categorie.localeCompare(b.categorie));

    res.json({ categories });
  } catch (error) {
    console.error("Erreur categories livres:", error);
    res.status(500).json({ error: "BOOK_CATEGORIES_FAILED", message: "Impossible de charger les categories." });
  }
});

router.get("/search", optionalAuth, async (req: BooksRequest, res) => {
  const query = normalizeText(req.query.q, 160);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 20);

  try {
    const { data, error } = await supabaseAdmin.rpc("books_catalogue_search", {
      p_query: query,
      p_categorie: null,
      p_filiere: null,
      p_type_acces: null,
      p_statut: "publie",
      p_featured: null,
      p_limit: limit,
      p_offset: 0,
    });

    if (error) throw error;

    const rows = (data || []) as unknown as BookListRow[];
    const flags = await getAccessFlags(req.authUser?.id, rows.map(row => row.id));
    const suggestions = rows.length === 0 ? await getSuggestions(query, 5) : [];

    res.json({
      query,
      results: rows.map(row => mapBookListRow(row, flags.get(row.id))),
      suggestions: suggestions.length > 0 ? { label: "Voulez-vous dire...", items: suggestions } : null,
      engine: "postgres-full-text-trgm",
    });
  } catch (error) {
    console.error("Erreur recherche livres:", error);
    res.status(500).json({ error: "BOOK_SEARCH_FAILED", message: "Impossible de rechercher les livres." });
  }
});

router.get("/:id", optionalAuth, validate("params", uuidParams("id")), async (req: BooksRequest, res) => {
  try {
    const { data: book, error } = await supabaseAdmin
      .from("books")
      .select(DETAIL_COLUMNS)
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!book) {
      res.status(404).json({ error: "BOOK_NOT_FOUND", message: "Livre introuvable." });
      return;
    }

    await supabaseAdmin.rpc("increment_book_view_count", { p_book_id: req.params.id });

    const bookRow = book as unknown as BookDetailRow;

    const [flags, reviewsResult, authorResult] = await Promise.all([
      getAccessFlags(req.authUser?.id, [req.params.id]),
      supabaseAdmin
        .from("book_reviews")
        .select("id,note,commentaire,created_at,user_id,profiles:user_id(first_name,last_name,avatar_url)")
        .eq("book_id", req.params.id)
        .order("created_at", { ascending: false })
        .limit(5),
      bookRow.author_profile_id
        ? supabaseAdmin
          .from("author_profiles")
          .select("id,nom_plume,bio,photo_url,verified,statut")
          .eq("id", bookRow.author_profile_id)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (reviewsResult.error) throw reviewsResult.error;
    if (authorResult.error) throw authorResult.error;

    const access = flags.get(req.params.id) || { borrowed: false, purchased: false };
    res.json({
      book: mapBookDetailRow(bookRow, {
        borrowed: access.borrowed,
        purchased: access.purchased,
        reviews: reviewsResult.data || [],
        authorProfile: authorResult.data || null,
      }),
    });
  } catch (error) {
    console.error("Erreur detail livre:", error);
    res.status(500).json({ error: "BOOK_DETAIL_FAILED", message: "Impossible de charger le livre." });
  }
});

router.post("/:id/review", requireAuth, validate("params", uuidParams("id")), validate("body", reviewBodySchema), async (req: BooksRequest, res) => {
  const note = Number(req.body?.note);
  const commentaire = optionalText(req.body?.commentaire, 1200);

  try {
    const { data: book, error: bookError } = await supabaseAdmin
      .from("books")
      .select("id,status")
      .eq("id", req.params.id)
      .maybeSingle();

    if (bookError) throw bookError;
    if (!book) {
      res.status(404).json({ error: "BOOK_NOT_FOUND", message: "Livre introuvable." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("book_reviews")
      .upsert({
        book_id: req.params.id,
        user_id: req.authUser!.id,
        note,
        commentaire,
      }, {
        onConflict: "book_id,user_id",
      })
      .select("id,book_id,user_id,note,commentaire,created_at,updated_at")
      .single();

    if (error) throw error;

    const { data: updatedBook } = await supabaseAdmin
      .from("books")
      .select("id,note_moyenne")
      .eq("id", req.params.id)
      .maybeSingle();

    res.status(201).json({
      review: data,
      book: updatedBook,
      message: "Avis enregistre.",
    });
  } catch (error) {
    console.error("Erreur avis livre:", error);
    res.status(500).json({ error: "BOOK_REVIEW_FAILED", message: "Impossible d'enregistrer l'avis." });
  }
});

export default router;
