import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { fetchBooksForTextIndexing, indexBookPdfText } from "../lib/bookTextIndexer.js";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();
const MAX_BOOK_UPLOAD_BYTES = 1024 * 1024 * 1024;
const BOOK_UPLOAD_BUCKET = "author-books";
const BOOK_UPLOAD_MIME_TYPES = new Set(["application/pdf", "application/epub+zip"]);

type AdminRole = "admin" | "super_admin";

interface AdminContext {
  id: string;
  email: string;
  role: AdminRole;
}

interface AdminRequest extends Request {
  admin?: AdminContext;
}

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

function startOfDay(date = new Date()): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date = new Date()): Date {
  const next = startOfDay(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
}

function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sumTransactions(rows: Array<{ montant?: number | null }>): number {
  return rows.reduce((total, row) => total + Number(row.montant || 0), 0);
}

function groupBy<T>(rows: T[], getKey: (row: T) => string): Record<string, T[]> {
  return rows.reduce<Record<string, T[]>>((acc, row) => {
    const key = getKey(row);
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});
}

function getNestedObject<T = Record<string, unknown>>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) || null;
  if (value && typeof value === "object") return value as T;
  return null;
}

function slugifyFilename(value: string): string {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);

  return cleaned || "livre.pdf";
}

function getBookUploadExtension(filename: string, mimeType: string): "pdf" | "epub" | null {
  const lowerName = filename.toLowerCase();
  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) return "pdf";
  if (mimeType === "application/epub+zip" || lowerName.endsWith(".epub")) return "epub";
  return null;
}

async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "AUTH_REQUIRED", message: "Token admin requis." });
    return;
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    res.status(401).json({ error: "AUTH_INVALID", message: "Session admin invalide." });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,email,role,is_active")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    res.status(403).json({ error: "ADMIN_PROFILE_MISSING", message: "Profil admin introuvable." });
    return;
  }

  if (!profile.is_active || !["admin", "super_admin"].includes(profile.role)) {
    res.status(403).json({ error: "ADMIN_FORBIDDEN", message: "Acces admin refuse." });
    return;
  }

  req.admin = {
    id: profile.id,
    email: profile.email,
    role: profile.role as AdminRole,
  };
  next();
}

async function addAdminLog(
  admin: AdminContext,
  req: Request,
  action: string,
  cibleType?: string,
  cibleId?: string,
  details: Record<string, unknown> = {},
) {
  const { error } = await supabaseAdmin.from("admin_logs").insert({
    admin_id: admin.id,
    action,
    cible_type: cibleType || null,
    cible_id: cibleId || null,
    details,
    ip_address: getClientIp(req),
  });

  if (error) {
    console.warn("Impossible d'ecrire le journal admin:", error.message);
  }
}

async function countRows(table: string, build?: (query: any) => any): Promise<number> {
  let query = supabaseAdmin.from(table).select("id", { count: "exact", head: true });
  if (build) query = build(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function trySelectRows(table: string, select = "*", build?: (query: any) => any) {
  let query = supabaseAdmin.from(table).select(select);
  if (build) query = build(query);
  const { data, error } = await query;
  return error ? { data: null, error } : { data: data || [], error: null };
}

async function getRevenueSummary() {
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("montant,type,created_at")
    .eq("statut", "completed")
    .gte("created_at", monthStart);

  if (error) throw error;

  const rows = (data || []) as Array<{ montant: number; type: string; created_at: string }>;
  const dayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();

  return {
    day: sumTransactions(rows.filter(row => new Date(row.created_at).getTime() >= dayStart)),
    week: sumTransactions(rows.filter(row => new Date(row.created_at).getTime() >= weekStart)),
    month: sumTransactions(rows),
  };
}

async function getDailyRevenue() {
  const view = await trySelectRows("view_revenus_quotidiens", "*", query =>
    query.order("jour", { ascending: false }).limit(31),
  );
  if (!view.error) return view.data;

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("montant,type,created_at")
    .eq("statut", "completed")
    .gte("created_at", startOfDay(since).toISOString());
  if (error) throw error;

  const byDate = groupBy(data || [], row => String(row.created_at).slice(0, 10));
  return Object.entries(byDate)
    .map(([jour, rows]) => ({
      jour,
      revenu_total: sumTransactions(rows),
      transactions_count: rows.length,
      par_type: Object.fromEntries(
        Object.entries(groupBy(rows, row => String(row.type))).map(([type, typedRows]) => [
          type,
          sumTransactions(typedRows),
        ]),
      ),
    }))
    .sort((a, b) => b.jour.localeCompare(a.jour));
}

async function getTopBooks() {
  const view = await trySelectRows("view_top_livres", "*", query =>
    query.order("lectures_count", { ascending: false }).limit(10),
  );
  if (!view.error) return view.data;

  const { data, error } = await supabaseAdmin
    .from("borrows")
    .select("book_id,books:book_id(id,titre,auteur,categorie)")
    .limit(1000);
  if (error) throw error;

  const byBook = groupBy(data || [], row => String(row.book_id));
  return Object.entries(byBook)
    .map(([bookId, rows]) => {
      const book = getNestedObject<{ titre?: string; auteur?: string; categorie?: string }>(rows[0]?.books);
      return {
        book_id: bookId,
        titre: book?.titre || "Livre inconnu",
        auteur: book?.auteur || "",
        categorie: book?.categorie || "",
        lectures_count: rows.length,
      };
    })
    .sort((a, b) => b.lectures_count - a.lectures_count)
    .slice(0, 10);
}

async function getOverdueBorrows(limit = 100) {
  const view = await trySelectRows("view_borrows_retard", "*", query =>
    query.order("fin_prevue", { ascending: true }).limit(limit),
  );
  if (!view.error) return view.data;

  const { data, error } = await supabaseAdmin
    .from("borrows")
    .select(`
      id,user_id,book_id,debut,fin_prevue,fin_reelle,statut,penalite_fcfa,jours_retard,created_at,
      profiles:user_id(email,first_name,last_name,whatsapp_number),
      books:book_id(titre,auteur,categorie)
    `)
    .in("statut", ["actif", "prolonge", "retard"])
    .lt("fin_prevue", new Date().toISOString())
    .order("fin_prevue", { ascending: true })
    .limit(limit);
  if (error) throw error;

  return (data || []).map(row => {
    const profile = getNestedObject<{
      email?: string;
      first_name?: string;
      last_name?: string;
      whatsapp_number?: string | null;
    }>(row.profiles);
    const book = getNestedObject<{ titre?: string; auteur?: string; categorie?: string }>(row.books);
    const computedLateDays = Math.max(
      0,
      Math.ceil((Date.now() - new Date(row.fin_prevue).getTime()) / 86_400_000),
    );

    return {
      ...row,
      user_email: profile?.email || null,
      user_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null,
      whatsapp_number: profile?.whatsapp_number || null,
      book_titre: book?.titre || null,
      book_auteur: book?.auteur || null,
      jours_retard_calc: computedLateDays,
    };
  });
}

function buildWhatsappReminder(row: any) {
  const phone = String(row.whatsapp_number || "").replace(/[^\d]/g, "");
  const canSend = phone.length >= 8;
  const text = `Bonjour, votre emprunt BiblioTech "${row.book_titre || "livre"}" est en retard. Merci de regulariser votre situation.`;

  return {
    canSend,
    phone: canSend ? phone : null,
    label: "Envoyer rappel WhatsApp",
    url: canSend ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : null,
  };
}

async function sendWhatsappMessage(to: string | null | undefined, message: string) {
  const phone = String(to || "").replace(/[^\d]/g, "");
  if (phone.length < 8) {
    return { channel: "whatsapp", status: "missing_number", phone: null, url: null };
  }

  const fallbackUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  if (!apiUrl || !apiToken) {
    return { channel: "whatsapp", status: "not_configured", phone, url: fallbackUrl };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${apiToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ to: phone, message }),
    });

    return {
      channel: "whatsapp",
      status: response.ok ? "sent" : "failed",
      phone,
      providerStatus: response.status,
      url: fallbackUrl,
    };
  } catch (error) {
    return {
      channel: "whatsapp",
      status: "failed",
      phone,
      error: error instanceof Error ? error.message : "Unknown WhatsApp error",
      url: fallbackUrl,
    };
  }
}

router.use(requireAdmin);

router.get("/stats", async (_req: AdminRequest, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      revenue,
      dailyRevenue,
      activeUsers,
      newUsers,
      olderUsers,
      retainedOlderUsers,
      topBooks,
      overdueBorrows,
      pendingPenalties,
      activeSubscriptions,
      activeSubscriptionsRows,
    ] = await Promise.all([
      getRevenueSummary(),
      getDailyRevenue(),
      countRows("profiles", query => query.eq("is_active", true)),
      countRows("profiles", query => query.gte("created_at", thirtyDaysAgo.toISOString())),
      countRows("profiles", query => query.lt("created_at", thirtyDaysAgo.toISOString())),
      countRows("profiles", query => query.eq("is_active", true).lt("created_at", thirtyDaysAgo.toISOString())),
      getTopBooks(),
      getOverdueBorrows(20),
      countRows("penalties", query => query.eq("statut", "pending")),
      countRows("subscriptions", query => query.eq("statut", "active")),
      trySelectRows("subscriptions", "plan", query => query.eq("statut", "active")),
    ]);

    const subscriptionPlanRows = (activeSubscriptionsRows.data || []) as Array<{ plan?: string | null }>;
    const plans = groupBy(subscriptionPlanRows, row => String(row.plan || "unknown"));

    res.json({
      revenue,
      dailyRevenue,
      users: {
        active: activeUsers,
        new: newUsers,
        retentionRate: olderUsers > 0 ? Math.round((retainedOlderUsers / olderUsers) * 1000) / 10 : 0,
      },
      topBooks,
      penalties: {
        pending: pendingPenalties,
        overdueBorrows: overdueBorrows.length,
        overduePreview: overdueBorrows.slice(0, 5),
      },
      subscriptions: {
        active: activeSubscriptions,
        byPlan: Object.fromEntries(Object.entries(plans).map(([plan, rows]) => [plan, rows.length])),
      },
    });
  } catch (error) {
    console.error("Erreur stats admin:", error);
    res.status(500).json({ error: "ADMIN_STATS_FAILED", message: "Impossible de charger les statistiques admin." });
  }
});

router.get("/borrows/overdue", async (req: AdminRequest, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 250);
    const rows = await getOverdueBorrows(limit);

    res.json({
      data: (rows as any[]).map(row => ({
        ...row,
        whatsappReminder: buildWhatsappReminder(row),
      })),
    });
  } catch (error) {
    console.error("Erreur emprunts en retard:", error);
    res.status(500).json({ error: "OVERDUE_BORROWS_FAILED", message: "Impossible de charger les emprunts en retard." });
  }
});

router.post("/borrows/:id/remind-whatsapp", async (req: AdminRequest, res) => {
  try {
    const admin = req.admin!;
    const borrowId = req.params.id;
    const rows = (await getOverdueBorrows(250)) as any[];
    const borrow = rows.find(row => row.id === borrowId);

    if (!borrow) {
      res.status(404).json({ error: "OVERDUE_BORROW_NOT_FOUND", message: "Emprunt en retard introuvable." });
      return;
    }

    const message = `Bonjour, votre emprunt BiblioTech "${borrow.book_titre || "livre"}" est en retard. Merci de regulariser votre situation.`;
    const notification = await sendWhatsappMessage(borrow.whatsapp_number, message);

    await addAdminLog(admin, req, "borrow.whatsapp_reminder", "borrow", borrowId, { notification });
    res.json({ data: borrow, notification });
  } catch (error) {
    console.error("Erreur rappel WhatsApp:", error);
    res.status(500).json({ error: "WHATSAPP_REMINDER_FAILED", message: "Impossible de preparer le rappel WhatsApp." });
  }
});

router.post("/books/:id/approve", async (req: AdminRequest, res) => {
  try {
    const admin = req.admin!;
    const bookId = req.params.id;

    const { data: book, error: fetchError } = await supabaseAdmin
      .from("books")
      .select("id,titre,auteur,status,added_by,profiles:added_by(email,whatsapp_number,first_name,last_name)")
      .eq("id", bookId)
      .single();
    if (fetchError || !book) {
      res.status(404).json({ error: "BOOK_NOT_FOUND", message: "Livre introuvable." });
      return;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("books")
      .update({ status: "publie", updated_at: new Date().toISOString() })
      .eq("id", bookId)
      .select("id,titre,auteur,status,updated_at")
      .single();
    if (updateError) throw updateError;

    const author = getNestedObject<{ whatsapp_number?: string | null; email?: string }>(book.profiles);
    const message = `Votre livre "${book.titre}" a ete publie sur BiblioTech.`;
    const notification = await sendWhatsappMessage(author?.whatsapp_number, message);

    await addAdminLog(admin, req, "book.approve", "book", bookId, { before: book.status, notification });

    res.json({ data: updated, notification });
  } catch (error) {
    console.error("Erreur approbation livre:", error);
    res.status(500).json({ error: "BOOK_APPROVE_FAILED", message: "Impossible de publier ce livre." });
  }
});

router.post("/books/:id/index-text", async (req: AdminRequest, res) => {
  try {
    const admin = req.admin!;
    const bookId = req.params.id;
    const force = req.body?.force === true;
    const maxPages = Number(req.body?.maxPages || req.body?.max_pages || 80);

    const { data: book, error } = await supabaseAdmin
      .from("books")
      .select("id,titre,pdf_url,read_url,pages_count")
      .eq("id", bookId)
      .single();

    if (error || !book) {
      res.status(404).json({ error: "BOOK_NOT_FOUND", message: "Livre introuvable." });
      return;
    }

    const result = await indexBookPdfText(book, { force, maxPages });
    await addAdminLog(admin, req, "book.index_text", "book", bookId, result as unknown as Record<string, unknown>);

    res.json({ data: result });
  } catch (error) {
    console.error("Erreur indexation texte livre:", error);
    res.status(500).json({
      error: "BOOK_TEXT_INDEX_FAILED",
      message: "Impossible d'extraire le texte du PDF pour ce livre.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/books/upload-url", async (req: AdminRequest, res) => {
  try {
    const admin = req.admin!;
    const filename = String(req.body?.filename || "").trim();
    const mimeType = String(req.body?.mimeType || req.body?.mime_type || "").trim().toLowerCase();
    const sizeBytes = Number(req.body?.sizeBytes || req.body?.size_bytes || 0);

    if (!filename) {
      res.status(400).json({ error: "BOOK_UPLOAD_FILENAME_REQUIRED", message: "Nom du fichier requis." });
      return;
    }

    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_BOOK_UPLOAD_BYTES) {
      res.status(400).json({
        error: "BOOK_UPLOAD_SIZE_INVALID",
        message: "Chaque livre doit peser au maximum 1 Go.",
        maxBytes: MAX_BOOK_UPLOAD_BYTES,
      });
      return;
    }

    const extension = getBookUploadExtension(filename, mimeType);
    if (!extension || (mimeType && !BOOK_UPLOAD_MIME_TYPES.has(mimeType))) {
      res.status(400).json({
        error: "BOOK_UPLOAD_TYPE_INVALID",
        message: "Seuls les fichiers PDF et ePub sont acceptes.",
      });
      return;
    }

    const safeFilename = slugifyFilename(filename).replace(/\.(pdf|epub)$/i, "");
    const path = `admin/${admin.id}/books/${Date.now()}-${safeFilename}.${extension}`;

    const { data, error } = await supabaseAdmin.storage
      .from(BOOK_UPLOAD_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) throw error || new Error("SIGNED_UPLOAD_URL_FAILED");

    const { data: publicData } = supabaseAdmin.storage.from(BOOK_UPLOAD_BUCKET).getPublicUrl(path);
    await addAdminLog(admin, req, "book.prepare_upload", "book", undefined, {
      bucket: BOOK_UPLOAD_BUCKET,
      path,
      filename,
      mimeType,
      sizeBytes,
    });

    res.json({
      bucket: BOOK_UPLOAD_BUCKET,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publicData.publicUrl,
      maxBytes: MAX_BOOK_UPLOAD_BYTES,
    });
  } catch (error) {
    console.error("Erreur preparation upload livre:", error);
    res.status(500).json({
      error: "BOOK_UPLOAD_URL_FAILED",
      message: "Impossible de preparer l'upload du livre.",
    });
  }
});

router.post("/books/index-text", async (req: AdminRequest, res) => {
  try {
    const admin = req.admin!;
    const limit = Math.min(Math.max(Number(req.body?.limit || 10), 1), 50);
    const force = req.body?.force === true;
    const maxPages = Number(req.body?.maxPages || req.body?.max_pages || 80);
    const books = await fetchBooksForTextIndexing(limit);
    const results = [];

    for (const book of books) {
      try {
        results.push(await indexBookPdfText(book, { force, maxPages }));
      } catch (error) {
        results.push({
          bookId: book.id,
          title: book.titre,
          indexedPages: 0,
          totalPages: Number(book.pages_count || 0),
          skipped: true,
          reason: error instanceof Error ? error.message : "INDEX_FAILED",
        });
      }
    }

    await addAdminLog(admin, req, "book.index_text_batch", "book", undefined, {
      limit,
      force,
      maxPages,
      total: results.length,
      indexed: results.filter(row => !row.skipped).length,
    });

    res.json({
      data: results,
      summary: {
        total: results.length,
        indexed: results.filter(row => !row.skipped).length,
        skipped: results.filter(row => row.skipped).length,
      },
    });
  } catch (error) {
    console.error("Erreur indexation batch livres:", error);
    res.status(500).json({
      error: "BOOK_TEXT_BATCH_INDEX_FAILED",
      message: "Impossible de lancer l'indexation texte des livres.",
    });
  }
});

router.post("/penalties/:id/waive", async (req: AdminRequest, res) => {
  try {
    const admin = req.admin!;
    const penaltyId = req.params.id;
    const justification = typeof req.body.justification === "string" ? req.body.justification.trim() : "";

    if (justification.length < 3) {
      res.status(400).json({ error: "JUSTIFICATION_REQUIRED", message: "Justification obligatoire." });
      return;
    }

    const { data: penalty, error: fetchError } = await supabaseAdmin
      .from("penalties")
      .select("id,borrow_id,user_id,montant,statut,raison")
      .eq("id", penaltyId)
      .single();
    if (fetchError || !penalty) {
      res.status(404).json({ error: "PENALTY_NOT_FOUND", message: "Amende introuvable." });
      return;
    }

    const reason = [penalty.raison, `Annulee par ${admin.email}: ${justification}`]
      .filter(Boolean)
      .join("\n");

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("penalties")
      .update({ statut: "waived", raison: reason })
      .eq("id", penaltyId)
      .select("*")
      .single();
    if (updateError) throw updateError;

    await supabaseAdmin
      .from("borrows")
      .update({ penalite_fcfa: 0, updated_at: new Date().toISOString() })
      .eq("id", penalty.borrow_id);

    await addAdminLog(admin, req, "penalty.waive", "penalty", penaltyId, {
      justification,
      montant: penalty.montant,
      previousStatus: penalty.statut,
    });

    res.json({ data: updated });
  } catch (error) {
    console.error("Erreur annulation amende:", error);
    res.status(500).json({ error: "PENALTY_WAIVE_FAILED", message: "Impossible d'annuler cette amende." });
  }
});

router.get("/revenue", async (req: AdminRequest, res) => {
  try {
    const from = typeof req.query.from === "string" ? new Date(req.query.from) : startOfMonth();
    const to = typeof req.query.to === "string" ? new Date(req.query.to) : new Date();

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      res.status(400).json({ error: "INVALID_DATE_RANGE", message: "Dates invalides." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select(`
        id,user_id,book_id,type,montant,commission_pct,vendeur_recoit,plateforme_recoit,statut,provider,created_at,
        profiles:user_id(email,first_name,last_name),
        books:book_id(titre,auteur,categorie)
      `)
      .eq("statut", "completed")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = data || [];
    const bySource = Object.entries(groupBy(rows, row => String(row.type))).map(([type, typedRows]) => ({
      type,
      total: sumTransactions(typedRows),
      count: typedRows.length,
      platformShare: typedRows.reduce((sum, row) => sum + Number(row.plateforme_recoit || 0), 0),
      sellerShare: typedRows.reduce((sum, row) => sum + Number(row.vendeur_recoit || 0), 0),
    }));

    res.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      total: sumTransactions(rows),
      bySource,
      transactions: rows.map(row => {
        const profile = getNestedObject<{ email?: string; first_name?: string; last_name?: string }>(row.profiles);
        const book = getNestedObject<{ titre?: string; auteur?: string }>(row.books);
        return {
          ...row,
          user_email: profile?.email || null,
          user_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null,
          book_titre: book?.titre || null,
          book_auteur: book?.auteur || null,
        };
      }),
    });
  } catch (error) {
    console.error("Erreur revenus admin:", error);
    res.status(500).json({ error: "ADMIN_REVENUE_FAILED", message: "Impossible de charger les revenus." });
  }
});

export default router;
