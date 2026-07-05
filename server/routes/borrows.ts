import { randomUUID } from "crypto";
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { validate } from "../lib/validate.js";
import { sendEmail, sendWhatsApp, sendInAppNotification } from "../services/notifications.js";
import {
  calculateBorrowPrice,
  calculatePenaltyAmount,
  calculateRenewalPrice,
  canBorrowForPlan,
  isUnlimitedBorrowPlan,
} from "../services/domainRules.js";

const router = Router();

const BORROW_DURATIONS = new Set([7, 14, 21, 30]);
const RENEW_DURATIONS = new Set([7, 14]);
const BORROWABLE_ACCESS_TYPES = new Set(["emprunt", "abonnement"]);
const ACTIVE_BORROW_STATUSES = ["actif", "prolonge"];

const createBorrowSchema = z.object({
  book_id: z.string().uuid().optional(),
  bookId: z.string().uuid().optional(),
  duree_jours: z.coerce.number().int().optional(),
  duration_days: z.coerce.number().int().optional(),
  payment_confirmed: z.boolean().optional(),
  payment_reference: z.string().min(3).max(160).optional(),
  callbackUrl: z.string().url().optional(),
  returnUrl: z.string().url().optional(),
}).passthrough();

const renewBorrowSchema = z.object({
  duree_jours: z.coerce.number().int().optional(),
  duration_days: z.coerce.number().int().optional(),
  payment_confirmed: z.boolean().optional(),
  payment_reference: z.string().min(3).max(160).optional(),
  callbackUrl: z.string().url().optional(),
  returnUrl: z.string().url().optional(),
}).passthrough();

const progressSchema = z.object({
  page_actuelle: z.coerce.number().int().min(0).optional(),
  current_page: z.coerce.number().int().min(0).optional(),
  total_pages: z.coerce.number().int().min(0).optional(),
  pourcentage_lu: z.coerce.number().min(0).max(100).optional(),
  percentage: z.coerce.number().min(0).max(100).optional(),
  temps_lecture_increment_minutes: z.coerce.number().min(0).optional(),
  temps_lecture_increment_seconds: z.coerce.number().min(0).optional(),
  temps_lecture_minutes: z.coerce.number().min(0).optional(),
}).passthrough();

interface AuthContext {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  plan: string;
  whatsapp_number: string | null;
  emprunts_restants: number | null;
  is_active: boolean;
}

interface BorrowRequest extends Request {
  authUser?: AuthContext;
}

interface BookRow {
  id: string;
  titre: string;
  auteur: string;
  type: string | null;
  type_acces: string | null;
  prix_location: number | null;
  prix_location_7j: number | null;
  prix_location_30j: number | null;
  pages_count: number | null;
  status: string;
}

interface BorrowRow {
  id: string;
  user_id: string;
  book_id: string;
  debut: string;
  fin_prevue: string;
  fin_reelle: string | null;
  statut: string;
  penalite_fcfa: number | null;
  jours_retard: number | null;
  prolongation_auto_utilisee: boolean | null;
  duree_jours?: number | null;
  prix_location_fcfa?: number | null;
  renewal_count?: number | null;
  renewal_paid_fcfa?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
  books?: BookRow | BookRow[] | null;
  reading_progress?: ReadingProgressRow[] | null;
}

interface ReadingProgressRow {
  current_page: number | null;
  total_pages: number | null;
  pourcentage_lu: number | string | null;
  temps_lecture_minutes: number | null;
  derniere_lecture: string | null;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || null;
  return req.socket.remoteAddress || null;
}

function nestedOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysLate(finPrevue: string, at = new Date()): number {
  const due = new Date(finPrevue).getTime();
  if (!Number.isFinite(due) || at.getTime() <= due) return 0;
  return Math.ceil((at.getTime() - due) / 86_400_000);
}

function daysRemaining(finPrevue: string): number {
  return Math.ceil((new Date(finPrevue).getTime() - Date.now()) / 86_400_000);
}

function penaltyAmountForLateDays(days: number): number {
  return calculatePenaltyAmount(days);
}

function priceForDuration(book: BookRow, durationDays: number): number {
  return calculateBorrowPrice(book, durationDays);
}

function renewalPrice(durationDays: number): number {
  return calculateRenewalPrice(durationDays);
}

function isUnlimitedPlan(plan: string): boolean {
  return isUnlimitedBorrowPlan(plan);
}

function userDisplayName(user: AuthContext): string {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
}

async function requireAuth(req: BorrowRequest, res: Response, next: NextFunction) {
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
    .select("id,email,first_name,last_name,role,plan,whatsapp_number,emprunts_restants,is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.is_active === false) {
    res.status(403).json({ error: "PROFILE_FORBIDDEN", message: "Profil inactif ou introuvable." });
    return;
  }

  req.authUser = profile as AuthContext;
  next();
}

function requireAdmin(req: BorrowRequest, res: Response, next: NextFunction) {
  const role = req.authUser?.role;
  if (role !== "admin" && role !== "super_admin") {
    res.status(403).json({ error: "ADMIN_REQUIRED", message: "Acces admin requis." });
    return;
  }
  next();
}

async function getBook(bookId: string): Promise<BookRow | null> {
  const { data, error } = await supabaseAdmin
    .from("books")
    .select("id,titre,auteur,type,type_acces,prix_location,prix_location_7j,prix_location_30j,pages_count,status")
    .eq("id", bookId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as BookRow;
}

async function hasActiveBorrow(userId: string, bookId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from("borrows")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .in("statut", ACTIVE_BORROW_STATUSES);

  return !error && (count || 0) > 0;
}

async function hasPendingReservation(bookId: string, excludeUserId?: string): Promise<boolean> {
  let query = supabaseAdmin
    .from("book_reservations")
    .select("id", { count: "exact", head: true })
    .eq("book_id", bookId)
    .eq("statut", "pending");

  if (excludeUserId) query = query.neq("user_id", excludeUserId);
  const { count, error } = await query;
  return !error && (count || 0) > 0;
}

async function logActivity(req: BorrowRequest, action: string, metadata: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from("activity_logs").insert({
    user_id: req.authUser?.id || null,
    action,
    metadata,
    ip_address: getClientIp(req),
    device_info: String(req.headers["user-agent"] || ""),
  });

  if (error) console.warn("Impossible de journaliser l'activite:", error.message);
}

async function upsertUserStats(userId: string, patch: {
  totalEmpruntsDelta?: number;
  totalLivresLus?: number;
  pagesLues?: number;
  minutesLecture?: number;
}) {
  const { data: existing } = await supabaseAdmin
    .from("user_stats")
    .select("user_id,total_emprunts,total_livres_lus,pages_lues,minutes_lecture")
    .eq("user_id", userId)
    .maybeSingle();

  await supabaseAdmin.from("user_stats").upsert({
    user_id: userId,
    total_emprunts: Number(existing?.total_emprunts || 0) + Number(patch.totalEmpruntsDelta || 0),
    total_livres_lus: patch.totalLivresLus ?? Number(existing?.total_livres_lus || 0),
    pages_lues: patch.pagesLues ?? Number(existing?.pages_lues || 0),
    minutes_lecture: patch.minutesLecture ?? Number(existing?.minutes_lecture || 0),
  }, {
    onConflict: "user_id",
  });
}

async function initWavePayment(input: {
  user: AuthContext;
  amount: number;
  transactionId: string;
  description: string;
  metadata: Record<string, unknown>;
  callbackUrl?: string;
  returnUrl?: string;
}) {
  const baseUrl = process.env.NABOOPAY_API_URL || "https://api.naboopay.com";
  const apiKey = process.env.NABOOPAY_API_KEY;

  if (input.amount <= 0) return { status: "free", paymentUrl: null, providerResponse: null };

  if (!apiKey) {
    if (process.env.BORROWS_ALLOW_MOCK_PAYMENTS === "false") {
      return { status: "not_configured", paymentUrl: null, providerResponse: null };
    }
    return { status: "mock_completed", paymentUrl: null, providerResponse: { mode: "dev_mock" } };
  }

  const response = await fetch(`${baseUrl}/api/v2/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      price: input.amount,
      currency: "XOF",
      description: input.description,
      customer: {
        name: ((input.user.first_name || "Client") + " " + (input.user.last_name || "")).trim(),
        email: input.user.email,
        phone: input.user.whatsapp_number || "",
      },
      method_of_payment: "wave",
      order_id: input.transactionId,
      notify_url: input.callbackUrl || process.env.NABOOPAY_WEBHOOK_URL || process.env.NABOOPAY_NOTIFY_URL || "",
      return_url: input.returnUrl || process.env.NABOOPAY_RETURN_URL || "",
    }),
  });

  const providerResponse = await response.json().catch(() => ({}));
  const paymentUrl =
    providerResponse?.checkout_url ||
    providerResponse?.data?.checkout_url ||
    providerResponse?.payment_url ||
    null;

  return {
    status: response.ok && paymentUrl ? "initiated" : "failed",
    paymentUrl,
    providerStatus: response.status,
    providerResponse,
  };
}

async function createPaymentTransaction(input: {
  user: AuthContext;
  bookId: string;
  type: "location" | "renouvellement";
  amount: number;
  metadata: Record<string, unknown>;
  paymentConfirmed?: boolean;
  paymentReference?: string | null;
  callbackUrl?: string;
  returnUrl?: string;
}) {
  const transactionId = randomUUID();
  const alreadyPaid = Boolean(input.paymentConfirmed || input.paymentReference);
  const { data: transaction, error } = await supabaseAdmin
    .from("transactions")
    .insert({
      id: transactionId,
      user_id: input.user.id,
      book_id: input.bookId,
      type: "location",
      montant: input.amount,
      commission_pct: 0,
      vendeur_recoit: 0,
      plateforme_recoit: input.amount,
      statut: input.amount > 0 && !alreadyPaid ? "pending" : "completed",
      provider: alreadyPaid ? "wave" : input.amount > 0 ? "naboopay" : "free_plan",
      reference_externe: input.paymentReference || transactionId,
      metadata: {
        ...input.metadata,
        paymentMethod: input.amount > 0 ? "wave" : "free",
        paymentReference: input.paymentReference || null,
        operation: input.type,
      },
    })
    .select("*")
    .single();

  if (error) throw error;

  if (alreadyPaid) {
    return {
      transaction,
      payment: { status: "confirmed", paymentUrl: null, providerResponse: { reference: input.paymentReference || null } },
      completed: true,
    };
  }

  const payment = await initWavePayment({
    user: input.user,
    amount: input.amount,
    transactionId,
    description: input.type === "renouvellement" ? "Renouvellement emprunt BiblioTech" : "Emprunt BiblioTech",
    metadata: input.metadata,
    callbackUrl: input.callbackUrl,
    returnUrl: input.returnUrl,
  });

  const completed = input.amount <= 0 || ["free", "mock_completed"].includes(payment.status);
  
  const orderId = payment.providerResponse?.order_id || payment.providerResponse?.data?.order_id;

  await supabaseAdmin
    .from("transactions")
    .update({
      statut: completed ? "completed" : "pending",
      ...(orderId ? { reference_externe: orderId } : {}),
      metadata: {
        ...transaction.metadata,
        payment,
      },
    })
    .eq("id", transaction.id);

  return { transaction, payment, completed };
}

async function notifyBorrowConfirmed(user: AuthContext, book: BookRow, days: number) {
  const [whatsapp, email] = await Promise.all([
    sendWhatsApp(user.whatsapp_number || "", "BORROW_CONFIRMED", { titre: book.titre, jours: days }),
    sendEmail(user.email, "borrow_confirmed", {
      name: userDisplayName(user),
      titre: book.titre,
      jours: days,
    }),
    sendInAppNotification(
      user.id,
      `📚 Emprunt confirmé`,
      `"${book.titre}" emprunté pour ${days} jour${days > 1 ? "s" : ""}. Bonne lecture !`,
      { type: "success", icon: "BookOpen", action_url: "/emprunts" }
    ),
  ]);

  return { whatsapp, email };
}

function mapBorrow(row: BorrowRow) {
  const book = nestedOne(row.books);
  const progress = (row.reading_progress || [])[0] || null;
  const remaining = daysRemaining(row.fin_prevue);
  const renewalCount = Number(row.renewal_count || 0);

  return {
    id: row.id,
    book_id: row.book_id,
    debut: row.debut,
    fin_prevue: row.fin_prevue,
    fin_reelle: row.fin_reelle,
    statut: row.statut,
    duree_jours: Number(row.duree_jours || 7),
    prix_location_fcfa: Number(row.prix_location_fcfa || 0),
    renewal_count: renewalCount,
    max_renewals: 2,
    penalite_fcfa: Number(row.penalite_fcfa || 0),
    jours_retard: Number(row.jours_retard || 0),
    page_actuelle: Number(progress?.current_page || 0),
    pourcentage_lu: Number(progress?.pourcentage_lu || 0),
    temps_lecture_minutes: Number(progress?.temps_lecture_minutes || 0),
    jours_restants: remaining,
    peut_renouveler: renewalCount < 2 && row.statut !== "retard",
    montant_renouvellement: renewalCount < 2 ? 200 : null,
    book: book ? {
      id: book.id,
      titre: book.titre,
      auteur: book.auteur,
      pages_count: Number(book.pages_count || 0),
    } : null,
  };
}

router.post("/", requireAuth, validate("body", createBorrowSchema), async (req: BorrowRequest, res) => {
  const user = req.authUser!;
  const bookId = String(req.body?.book_id || req.body?.bookId || "").trim();
  const durationDays = Number(req.body?.duree_jours || req.body?.duration_days || 7);

  if (!bookId) {
    res.status(400).json({ error: "BOOK_ID_REQUIRED", message: "Livre requis." });
    return;
  }

  if (!BORROW_DURATIONS.has(durationDays)) {
    res.status(400).json({ error: "INVALID_DURATION", message: "Duree autorisee: 7, 14, 21 ou 30 jours." });
    return;
  }

  try {
    const book = await getBook(bookId);
    if (!book || book.status !== "publie") {
      res.status(404).json({ error: "BOOK_NOT_FOUND", message: "Livre introuvable ou non publie." });
      return;
    }

    const accessType = String(book.type_acces || book.type || "").toLowerCase();
    if (!BORROWABLE_ACCESS_TYPES.has(accessType)) {
      res.status(403).json({
        error: "BOOK_NOT_BORROWABLE",
        message: "Ce livre n'est pas disponible en emprunt ou abonnement.",
      });
      return;
    }

    if (await hasActiveBorrow(user.id, book.id)) {
      res.status(409).json({ error: "BORROW_ALREADY_ACTIVE", message: "Ce livre est deja emprunte." });
      return;
    }

    if (!canBorrowForPlan(user.plan, user.emprunts_restants)) {
      res.status(403).json({ error: "BORROW_QUOTA_EXCEEDED", message: "Quota mensuel free atteint." });
      return;
    }

    const amount = priceForDuration(book, durationDays);
    const payment = await createPaymentTransaction({
      user,
      bookId: book.id,
      type: "location",
      amount,
      metadata: { bookId: book.id, durationDays },
      paymentConfirmed: Boolean(req.body?.payment_confirmed),
      paymentReference: req.body?.payment_reference || null,
      callbackUrl: req.body?.callbackUrl,
      returnUrl: req.body?.returnUrl,
    });

    if (!payment.completed) {
      res.status(402).json({
        error: "PAYMENT_REQUIRED",
        message: "Paiement Wave requis avant creation de l'emprunt.",
        amount,
        payment: payment.payment,
        transaction: payment.transaction,
      });
      return;
    }

    const now = new Date();
    const { data: borrow, error } = await supabaseAdmin
      .from("borrows")
      .insert({
        user_id: user.id,
        book_id: book.id,
        debut: now.toISOString(),
        fin_prevue: addDays(now, durationDays).toISOString(),
        statut: "actif",
        duree_jours: durationDays,
        prix_location_fcfa: amount,
        metadata: { paymentTransactionId: payment.transaction.id },
      })
      .select("*")
      .single();

    if (error) throw error;

    if (!isUnlimitedPlan(user.plan)) {
      await supabaseAdmin
        .from("profiles")
        .update({ emprunts_restants: Math.max(0, Number(user.emprunts_restants || 0) - 1) })
        .eq("id", user.id);
    }

    await Promise.all([
      supabaseAdmin.from("reading_progress").upsert({
        user_id: user.id,
        book_id: book.id,
        current_page: 0,
        total_pages: Number(book.pages_count || 0),
        pourcentage_lu: 0,
        temps_lecture_minutes: 0,
        derniere_lecture: now.toISOString(),
      }, { onConflict: "user_id,book_id" }),
      notifyBorrowConfirmed(user, book, durationDays),
      logActivity(req, "borrow_created", { borrowId: borrow.id, bookId: book.id, durationDays, amount }),
    ]);

    res.status(201).json({
      borrow,
      payment: payment.payment,
      quota: {
        plan: user.plan,
        emprunts_restants: isUnlimitedPlan(user.plan) ? null : Math.max(0, Number(user.emprunts_restants || 0) - 1),
      },
    });
  } catch (error) {
    console.error("Erreur creation emprunt:", error);
    res.status(500).json({ error: "BORROW_CREATE_FAILED", message: "Impossible de creer l'emprunt." });
  }
});

router.get("/", requireAuth, async (req: BorrowRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("borrows")
      .select(`
        *,
        books:book_id(id,titre,auteur,pages_count)
      `)
      .eq("user_id", req.authUser!.id)
      .in("statut", ACTIVE_BORROW_STATUSES)
      .order("fin_prevue", { ascending: true });

    if (error) throw error;

    const rows = (data || []) as unknown as BorrowRow[];
    const bookIds = Array.from(new Set(rows.map(row => row.book_id)));
    const progressResult = bookIds.length
      ? await supabaseAdmin
        .from("reading_progress")
        .select("book_id,current_page,total_pages,pourcentage_lu,temps_lecture_minutes,derniere_lecture")
        .eq("user_id", req.authUser!.id)
        .in("book_id", bookIds)
      : { data: [], error: null };

    if (progressResult.error) throw progressResult.error;

    const progressByBook = new Map<string, ReadingProgressRow>();
    for (const progress of progressResult.data || []) {
      progressByBook.set(progress.book_id, progress as ReadingProgressRow);
    }

    const rowsWithProgress = rows.map(row => ({
      ...row,
      reading_progress: progressByBook.has(row.book_id) ? [progressByBook.get(row.book_id)!] : [],
    }));

    const reservationFlags = await Promise.all(rowsWithProgress.map(row => hasPendingReservation(row.book_id, req.authUser!.id)));

    res.json({
      borrows: rowsWithProgress.map((row, index) => {
        const mapped = mapBorrow(row);
        return {
          ...mapped,
          peut_renouveler: mapped.peut_renouveler && !reservationFlags[index],
        };
      }),
    });
  } catch (error) {
    console.error("Erreur liste emprunts:", error);
    res.status(500).json({ error: "BORROWS_LIST_FAILED", message: "Impossible de charger les emprunts." });
  }
});

router.get("/history", requireAuth, async (req: BorrowRequest, res) => {
  try {
    const [borrowsResult, progressResult, sessionsResult] = await Promise.all([
      supabaseAdmin
        .from("borrows")
        .select("*,books:book_id(id,titre,auteur,pages_count)")
        .eq("user_id", req.authUser!.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("reading_progress")
        .select("book_id,current_page,total_pages,pourcentage_lu,temps_lecture_minutes")
        .eq("user_id", req.authUser!.id),
      supabaseAdmin
        .from("reading_sessions")
        .select("book_id,pages_lues,duree_minutes")
        .eq("user_id", req.authUser!.id),
    ]);

    if (borrowsResult.error) throw borrowsResult.error;
    if (progressResult.error) throw progressResult.error;
    if (sessionsResult.error) throw sessionsResult.error;

    const borrows = (borrowsResult.data || []) as unknown as BorrowRow[];
    const progressRows = progressResult.data || [];
    const sessionRows = sessionsResult.data || [];
    const readBookIds = new Set([
      ...borrows.filter(row => row.statut === "rendu").map(row => row.book_id),
      ...progressRows.filter(row => Number(row.pourcentage_lu || 0) >= 95).map(row => row.book_id),
    ]);
    const pagesRead = Math.max(
      progressRows.reduce((sum, row) => sum + Number(row.current_page || 0), 0),
      sessionRows.reduce((sum, row) => sum + Number(row.pages_lues || 0), 0),
    );
    const minutes = Math.max(
      progressRows.reduce((sum, row) => sum + Number(row.temps_lecture_minutes || 0), 0),
      sessionRows.reduce((sum, row) => sum + Number(row.duree_minutes || 0), 0),
    );

    await upsertUserStats(req.authUser!.id, {
      totalLivresLus: readBookIds.size,
      pagesLues: pagesRead,
      minutesLecture: minutes,
    });

    res.json({
      stats: {
        total_livres_lus: readBookIds.size,
        pages_lues: pagesRead,
        minutes_lecture: minutes,
      },
      borrows: borrows.map(mapBorrow),
    });
  } catch (error) {
    console.error("Erreur historique emprunts:", error);
    res.status(500).json({ error: "BORROWS_HISTORY_FAILED", message: "Impossible de charger l'historique." });
  }
});

router.post("/:id/renew", requireAuth, validate("body", renewBorrowSchema), async (req: BorrowRequest, res) => {
  const durationDays = Number(req.body?.duree_jours || req.body?.duration_days || 7);
  if (!RENEW_DURATIONS.has(durationDays)) {
    res.status(400).json({ error: "INVALID_RENEW_DURATION", message: "Renouvellement autorise: 7 ou 14 jours." });
    return;
  }

  try {
    const { data: borrow, error: borrowError } = await supabaseAdmin
      .from("borrows")
      .select("*,books:book_id(id,titre,auteur,pages_count,type,type_acces,prix_location,prix_location_7j,prix_location_30j,status)")
      .eq("id", req.params.id)
      .eq("user_id", req.authUser!.id)
      .maybeSingle();

    if (borrowError) throw borrowError;
    if (!borrow) {
      res.status(404).json({ error: "BORROW_NOT_FOUND", message: "Emprunt introuvable." });
      return;
    }

    const row = borrow as unknown as BorrowRow;
    const book = nestedOne(row.books);
    const renewalCount = Number(row.renewal_count || 0);
    if (!ACTIVE_BORROW_STATUSES.includes(row.statut)) {
      res.status(400).json({ error: "BORROW_NOT_ACTIVE", message: "Seul un emprunt actif peut etre renouvele." });
      return;
    }
    if (renewalCount >= 2) {
      res.status(403).json({ error: "RENEW_LIMIT_REACHED", message: "Maximum 2 renouvellements par emprunt." });
      return;
    }
    if (await hasPendingReservation(row.book_id, req.authUser!.id)) {
      res.status(409).json({ error: "BOOK_RESERVED", message: "Reservation en attente sur ce livre." });
      return;
    }

    const amount = renewalPrice(durationDays);
    const payment = await createPaymentTransaction({
      user: req.authUser!,
      bookId: row.book_id,
      type: "renouvellement",
      amount,
      metadata: { borrowId: row.id, bookId: row.book_id, durationDays },
      paymentConfirmed: Boolean(req.body?.payment_confirmed),
      paymentReference: req.body?.payment_reference || null,
      callbackUrl: req.body?.callbackUrl,
      returnUrl: req.body?.returnUrl,
    });

    if (!payment.completed) {
      res.status(402).json({
        error: "PAYMENT_REQUIRED",
        message: "Paiement Wave requis avant renouvellement.",
        amount,
        payment: payment.payment,
        transaction: payment.transaction,
      });
      return;
    }

    const newDue = addDays(new Date(row.fin_prevue), durationDays);
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("borrows")
      .update({
        fin_prevue: newDue.toISOString(),
        statut: "prolonge",
        prolongation_auto_utilisee: true,
        renewal_count: renewalCount + 1,
        renewal_paid_fcfa: Number(row.renewal_paid_fcfa || 0) + amount,
        metadata: {
          ...(row.metadata || {}),
          lastRenewalTransactionId: payment.transaction.id,
          lastRenewalDays: durationDays,
        },
      })
      .eq("id", row.id)
      .select("*")
      .single();

    if (updateError) throw updateError;
    await logActivity(req, "borrow_renewed", { borrowId: row.id, bookId: row.book_id, durationDays, amount });

    res.json({
      borrow: updated,
      book,
      payment: payment.payment,
      montant_renouvellement: amount,
    });
  } catch (error) {
    console.error("Erreur renouvellement emprunt:", error);
    res.status(500).json({ error: "BORROW_RENEW_FAILED", message: "Impossible de renouveler l'emprunt." });
  }
});

router.post("/:id/return", requireAuth, async (req: BorrowRequest, res) => {
  try {
    const { data: borrow, error: borrowError } = await supabaseAdmin
      .from("borrows")
      .select("*,books:book_id(id,titre,auteur,pages_count)")
      .eq("id", req.params.id)
      .eq("user_id", req.authUser!.id)
      .maybeSingle();

    if (borrowError) throw borrowError;
    if (!borrow) {
      res.status(404).json({ error: "BORROW_NOT_FOUND", message: "Emprunt introuvable." });
      return;
    }

    const row = borrow as unknown as BorrowRow;
    const lateDays = daysLate(row.fin_prevue);
    const penaltyAmount = penaltyAmountForLateDays(lateDays);

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("borrows")
      .update({
        statut: "rendu",
        fin_reelle: new Date().toISOString(),
        jours_retard: lateDays,
        penalite_fcfa: penaltyAmount,
      })
      .eq("id", row.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    let penalty = null;
    if (penaltyAmount > 0) {
      const { data: existingPenalty } = await supabaseAdmin
        .from("penalties")
        .select("*")
        .eq("borrow_id", row.id)
        .maybeSingle();

      if (existingPenalty) {
        const { data } = await supabaseAdmin
          .from("penalties")
          .update({
            montant: penaltyAmount,
            raison: `Retour en retard de ${lateDays} jour(s)`,
            metadata: { source: "return_endpoint", lateDays },
          })
          .eq("id", existingPenalty.id)
          .select("*")
          .single();
        penalty = data;
      } else {
        const { data } = await supabaseAdmin
          .from("penalties")
          .insert({
            borrow_id: row.id,
            user_id: req.authUser!.id,
            montant: penaltyAmount,
            statut: "pending",
            raison: `Retour en retard de ${lateDays} jour(s)`,
            metadata: { source: "return_endpoint", lateDays },
          })
          .select("*")
          .single();
        penalty = data;
      }
    }

    const bookTitle = (row as unknown as { books?: { titre?: string } }).books?.titre || "le livre";
    const returnMsg = penaltyAmount > 0
      ? `"${bookTitle}" rendu avec ${lateDays}j de retard. Amende : ${penaltyAmount} FCFA.`
      : `"${bookTitle}" rendu à temps. Merci !`;

    await Promise.all([
      upsertUserStats(req.authUser!.id, { totalEmpruntsDelta: 1 }),
      logActivity(req, "borrow_returned", { borrowId: row.id, lateDays, penaltyAmount }),
      sendInAppNotification(
        req.authUser!.id,
        penaltyAmount > 0 ? "⚠️ Retour en retard" : "✅ Livre rendu",
        returnMsg,
        { type: penaltyAmount > 0 ? "warning" : "success", icon: "CheckCircle", action_url: "/historique" }
      ),
    ]);

    res.json({
      borrow: updated,
      penalty,
      jours_retard: lateDays,
      montant_amende: penaltyAmount,
    });
  } catch (error) {
    console.error("Erreur retour emprunt:", error);
    res.status(500).json({ error: "BORROW_RETURN_FAILED", message: "Impossible de retourner l'emprunt." });
  }
});

router.patch("/:id/progress", requireAuth, validate("body", progressSchema), async (req: BorrowRequest, res) => {
  const page = Math.max(0, Math.round(normalizeNumber(req.body?.page_actuelle ?? req.body?.current_page, 0)));
  const totalPages = Math.max(0, Math.round(normalizeNumber(req.body?.total_pages, 0)));
  const percentageInput = normalizeNumber(req.body?.pourcentage_lu ?? req.body?.percentage, NaN);
  const minutesIncrement = Math.max(0, normalizeNumber(req.body?.temps_lecture_increment_minutes, 0));
  const secondsIncrement = Math.max(0, normalizeNumber(req.body?.temps_lecture_increment_seconds, 0));
  const minutesSet = req.body?.temps_lecture_minutes === undefined
    ? null
    : Math.max(0, Math.round(normalizeNumber(req.body?.temps_lecture_minutes, 0)));

  try {
    const { data: borrow, error: borrowError } = await supabaseAdmin
      .from("borrows")
      .select("id,user_id,book_id,statut,books:book_id(id,pages_count)")
      .eq("id", req.params.id)
      .eq("user_id", req.authUser!.id)
      .maybeSingle();

    if (borrowError) throw borrowError;
    if (!borrow) {
      res.status(404).json({ error: "BORROW_NOT_FOUND", message: "Emprunt introuvable." });
      return;
    }

    const row = borrow as unknown as BorrowRow;
    if (!["actif", "prolonge", "retard"].includes(row.statut)) {
      res.status(400).json({ error: "BORROW_CLOSED", message: "Progression impossible sur un emprunt cloture." });
      return;
    }

    const book = nestedOne(row.books);
    const resolvedTotal = totalPages || Number(book?.pages_count || 0);
    const computedPercentage = resolvedTotal > 0 ? Math.min(100, Math.round((page / resolvedTotal) * 10000) / 100) : 0;
    const percentage = Number.isFinite(percentageInput)
      ? Math.min(100, Math.max(0, Math.round(percentageInput * 100) / 100))
      : computedPercentage;

    const { data: existing } = await supabaseAdmin
      .from("reading_progress")
      .select("temps_lecture_minutes")
      .eq("user_id", req.authUser!.id)
      .eq("book_id", row.book_id)
      .maybeSingle();

    const incrementMinutes = minutesIncrement + secondsIncrement / 60;
    const totalMinutes = minutesSet ?? Math.round(Number(existing?.temps_lecture_minutes || 0) + incrementMinutes);

    const { data: progress, error: progressError } = await supabaseAdmin
      .from("reading_progress")
      .upsert({
        user_id: req.authUser!.id,
        book_id: row.book_id,
        current_page: page,
        total_pages: resolvedTotal,
        pourcentage_lu: percentage,
        temps_lecture_minutes: totalMinutes,
        derniere_lecture: new Date().toISOString(),
      }, {
        onConflict: "user_id,book_id",
      })
      .select("*")
      .single();

    if (progressError) throw progressError;

    res.json({
      progress,
      autosave_interval_seconds: 30,
    });
  } catch (error) {
    console.error("Erreur progression emprunt:", error);
    res.status(500).json({ error: "BORROW_PROGRESS_FAILED", message: "Impossible de sauvegarder la progression." });
  }
});

router.get("/overdue", requireAuth, requireAdmin, async (_req: BorrowRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("borrows")
      .select(`
        *,
        profiles:user_id(id,email,first_name,last_name,whatsapp_number,plan,is_active),
        books:book_id(id,titre,auteur,categorie)
      `)
      .in("statut", ["actif", "prolonge", "retard"])
      .lt("fin_prevue", new Date().toISOString())
      .order("fin_prevue", { ascending: true });

    if (error) throw error;

    const overdue = ((data || []) as any[]).map(row => {
      const lateDays = daysLate(row.fin_prevue);
      return {
        ...row,
        jours_retard_calcule: lateDays,
        montant_amende_calcule: penaltyAmountForLateDays(lateDays),
      };
    });

    res.json({ overdue });
  } catch (error) {
    console.error("Erreur emprunts en retard:", error);
    res.status(500).json({ error: "OVERDUE_BORROWS_FAILED", message: "Impossible de charger les retards." });
  }
});

export default router;
