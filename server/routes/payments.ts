import { randomUUID } from "crypto";
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { validate } from "../lib/validate.js";
import {
  calculateBorrowPrice,
  calculateMarketplaceSplit,
  calculateMarketplaceSplitFromSellerNet,
  calculateRenewalPrice,
  canBorrowForPlan,
  isUnlimitedBorrowPlan,
} from "../services/domainRules.js";
import { sendEmail, sendWhatsApp } from "../services/notifications.js";
import { verifyNaboopayWebhookSignature } from "../services/paymentsService.js";

const router = Router();

type PaymentType = "borrow" | "buy" | "subscribe" | "penalty" | "renew";
type TransactionStatus = "pending" | "completed" | "failed" | "refunded";

const PAYMENT_TYPES = new Set<PaymentType>(["borrow", "buy", "subscribe", "penalty", "renew"]);
const BORROW_DURATIONS = new Set([7, 14, 21, 30]);
const RENEW_DURATIONS = new Set([7, 14]);
const SUBSCRIBE_PRICE_FCFA = 2000;
const PAYMENT_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const PAYMENT_LIMIT_MAX = 12;
const paymentAttempts = new Map<string, { count: number; resetAt: number }>();

const initiatePaymentSchema = z.object({
  type: z.enum(["borrow", "buy", "subscribe", "penalty", "renew"]),
  amount: z.coerce.number().int().positive().optional(),
  book_id: z.string().uuid().optional(),
  bookId: z.string().uuid().optional(),
  listing_id: z.string().uuid().optional(),
  listingId: z.string().uuid().optional(),
  penalty_id: z.string().uuid().optional(),
  penaltyId: z.string().uuid().optional(),
  borrow_id: z.string().uuid().optional(),
  borrowId: z.string().uuid().optional(),
  duration_days: z.coerce.number().int().optional(),
  duree_jours: z.coerce.number().int().optional(),
  callbackUrl: z.string().url().optional(),
  returnUrl: z.string().url().optional(),
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

interface PaymentRequest extends Request {
  authUser?: AuthContext;
  rawBody?: string;
}

interface BookRow {
  id: string;
  titre: string;
  auteur: string;
  prix_achat: number | null;
  prix_location: number | null;
  prix_location_7j: number | null;
  prix_location_30j: number | null;
  type: string | null;
  type_acces: string | null;
  status: string;
}

interface ListingRow {
  id: string;
  seller_id: string;
  titre: string;
  prix_affiche: number;
  prix_vendeur: number;
  commission_pct: number | null;
  type_livre: string | null;
  statut: string;
}

interface TransactionRow {
  id: string;
  user_id: string;
  book_id: string | null;
  type: string;
  montant: number;
  commission_pct: number | null;
  vendeur_recoit: number | null;
  plateforme_recoit: number | null;
  statut: TransactionStatus;
  provider: string | null;
  reference_externe: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || "";
  return req.socket.remoteAddress || "";
}

function normalizePaymentType(value: unknown): PaymentType | null {
  const type = String(value || "").trim().toLowerCase() as PaymentType;
  return PAYMENT_TYPES.has(type) ? type : null;
}

function parsePositiveInt(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function displayName(user: AuthContext): string {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
}

function isUnlimitedPlan(plan: string): boolean {
  return isUnlimitedBorrowPlan(plan);
}

function priceForBorrow(book: BookRow, days: number): number {
  return calculateBorrowPrice(book, days);
}

function priceForRenew(days: number): number {
  return calculateRenewalPrice(days);
}

function paymentDescription(type: PaymentType, label: string): string {
  const labels: Record<PaymentType, string> = {
    borrow: "Emprunt",
    buy: "Achat",
    subscribe: "Abonnement Etudiant",
    penalty: "Paiement amende",
    renew: "Renouvellement",
  };
  return `BiblioTech - ${labels[type]} ${label}`.trim();
}

async function requireAuth(req: PaymentRequest, res: Response, next: NextFunction) {
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

function paymentLimiter(req: PaymentRequest, res: Response, next: NextFunction) {
  const key = req.authUser?.id || getClientIp(req) || "anonymous";
  const now = Date.now();
  const bucket = paymentAttempts.get(key);

  if (!bucket || bucket.resetAt <= now) {
    paymentAttempts.set(key, { count: 1, resetAt: now + PAYMENT_LIMIT_WINDOW_MS });
    next();
    return;
  }

  if (bucket.count >= PAYMENT_LIMIT_MAX) {
    res.status(429).json({ error: "PAYMENT_RATE_LIMITED", message: "Trop de tentatives de paiement. Reessaie dans quelques minutes." });
    return;
  }

  bucket.count += 1;
  next();
}

async function getBook(bookId: string): Promise<BookRow | null> {
  const { data, error } = await supabaseAdmin
    .from("books")
    .select("id,titre,auteur,prix_achat,prix_location,prix_location_7j,prix_location_30j,type,type_acces,status")
    .eq("id", bookId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as BookRow;
}

async function getListing(listingId: string): Promise<ListingRow | null> {
  const { data, error } = await supabaseAdmin
    .from("marketplace_listings")
    .select("id,seller_id,titre,prix_affiche,prix_vendeur,commission_pct,type_livre,statut")
    .eq("id", listingId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as ListingRow;
}

async function getPenalty(penaltyId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("penalties")
    .select("*,borrows:borrow_id(id,book_id,fin_prevue,statut,books:book_id(id,titre,auteur))")
    .eq("id", penaltyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as any;
}

async function initNaboopayPayment(input: {
  user: AuthContext;
  transactionId: string;
  amount: number;
  description: string;
  metadata: Record<string, unknown>;
  callbackUrl?: string;
  returnUrl?: string;
}) {
  const baseUrl = process.env.NABOOPAY_API_URL || "https://api.naboopay.com";
  const apiKey = process.env.NABOOPAY_API_KEY;

  if (!apiKey) {
    return { status: "not_configured", payment_url: null, providerResponse: null };
  }

  const response = await fetch(`${baseUrl}/api/v2/transactions`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      method_of_payment: ["wave"],
      products: [{
        name: input.description,
        price: input.amount,
        quantity: 1,
      }],
      currency: "XOF",
      customer: {
        name: ((input.user.first_name || "Client") + " " + (input.user.last_name || "")).trim(),
        email: input.user.email,
        phone: input.user.whatsapp_number || "",
      },
      webhook_url: input.callbackUrl || process.env.NABOOPAY_WEBHOOK_URL || process.env.NABOOPAY_NOTIFY_URL || "",
      success_url: input.returnUrl || process.env.NABOOPAY_RETURN_URL || "",
      error_url: input.returnUrl || process.env.NABOOPAY_RETURN_URL || "",
    }),
  });

  const providerResponse = await response.json().catch(() => ({}));
  const paymentUrl =
    providerResponse?.checkout_url ||
    providerResponse?.data?.checkout_url ||
    providerResponse?.payment_url ||
    providerResponse?.data?.payment_url ||
    null;

  return {
    status: response.ok && paymentUrl ? "initiated" : "failed",
    payment_url: paymentUrl,
    providerStatus: response.status,
    providerResponse,
  };
}

function verifyWebhookSignature(req: PaymentRequest): boolean {
  const secret = process.env.NABOOPAY_SECRET_KEY || process.env.NABOOPAY_WEBHOOK_SECRET;
  
  const received = String(
    req.headers["x-naboopay-signature"] ||
    req.headers["x-webhook-signature"] ||
    req.headers["x-signature"] ||
    req.query.signature ||
    "",
  ).replace(/^sha256=/i, "");

  // En dev sans secret configuré, accepter les webhooks
  if (!secret) {
    console.warn("[Naboopay] Pas de NABOOPAY_SECRET_KEY configuré — webhook accepté sans vérification");
    return true;
  }

  if (!received) return false;

  const raw = req.rawBody || JSON.stringify(req.body || {});
  return verifyNaboopayWebhookSignature({ rawBody: raw, signature: received, secret });
}

function normalizeWebhookStatus(body: any): "accepted" | "refused" | "cancelled" | "pending" {
  const raw = String(body.status || body.payment_status || "").toLowerCase();
  if (["accepted", "success", "completed", "paid", "00"].includes(raw)) return "accepted";
  if (["refused", "failed", "declined", "ko"].includes(raw)) return "refused";
  if (["cancelled", "canceled", "cancel"].includes(raw)) return "cancelled";
  return "pending";
}

function transactionStatusFromWebhook(status: ReturnType<typeof normalizeWebhookStatus>): TransactionStatus {
  if (status === "accepted") return "completed";
  if (status === "cancelled") return "refunded";
  if (status === "refused") return "failed";
  return "pending";
}

async function createPendingTransaction(input: {
  user: AuthContext;
  paymentType: PaymentType;
  amount: number;
  bookId?: string | null;
  commissionPct?: number;
  sellerReceives?: number;
  platformReceives?: number;
  metadata: Record<string, unknown>;
}) {
  const transactionId = randomUUID();
  const dbType =
    input.paymentType === "buy" ? "achat"
      : input.paymentType === "subscribe" ? "abonnement"
        : input.paymentType === "penalty" ? "amende"
          : "location";

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .insert({
      id: transactionId,
      user_id: input.user.id,
      book_id: input.bookId || null,
      type: dbType,
      montant: input.amount,
      commission_pct: input.commissionPct || 0,
      vendeur_recoit: input.sellerReceives || 0,
      plateforme_recoit: input.platformReceives ?? input.amount,
      statut: "pending",
      provider: "naboopay",
      reference_externe: transactionId,
      metadata: {
        ...input.metadata,
        paymentType: input.paymentType,
        paymentMethod: "wave",
      },
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as unknown as TransactionRow;
}

async function resolvePaymentPayload(req: PaymentRequest) {
  const user = req.authUser!;
  const paymentType = normalizePaymentType(req.body?.type);
  if (!paymentType) throw Object.assign(new Error("Type de paiement invalide."), { statusCode: 400, code: "INVALID_PAYMENT_TYPE" });

  const bookId = String(req.body?.book_id || req.body?.bookId || "").trim() || null;
  const listingId = String(req.body?.listing_id || req.body?.listingId || "").trim() || null;
  const penaltyId = String(req.body?.penalty_id || req.body?.penaltyId || "").trim() || null;
  const borrowId = String(req.body?.borrow_id || req.body?.borrowId || "").trim() || null;
  const durationDays = parsePositiveInt(req.body?.duration_days ?? req.body?.duree_jours, paymentType === "renew" ? 7 : 30);

  if (paymentType === "subscribe") {
    return {
      paymentType,
      amount: SUBSCRIBE_PRICE_FCFA,
      label: "Etudiant",
      bookId: null,
      metadata: { plan: "student", durationMonths: 1 },
    };
  }

  if (paymentType === "penalty") {
    const id = penaltyId || String(req.body?.id || "").trim();
    const penalty = await getPenalty(id, user.id);
    if (!penalty || penalty.statut !== "pending") {
      throw Object.assign(new Error("Amende introuvable ou deja reglee."), { statusCode: 404, code: "PENALTY_NOT_FOUND" });
    }
    const amount = Number(penalty.montant || req.body?.amount || 0);
    if (![300, 500, 800].includes(amount)) {
      throw Object.assign(new Error("Montant d'amende invalide."), { statusCode: 400, code: "INVALID_PENALTY_AMOUNT" });
    }
    const borrow = Array.isArray(penalty.borrows) ? penalty.borrows[0] : penalty.borrows;
    return {
      paymentType,
      amount,
      label: "amende",
      bookId: borrow?.book_id || null,
      metadata: { penaltyId: penalty.id, borrowId: penalty.borrow_id },
    };
  }

  if (listingId) {
    const listing = await getListing(listingId);
    if (!listing || listing.statut !== "active") {
      throw Object.assign(new Error("Annonce marketplace introuvable."), { statusCode: 404, code: "LISTING_NOT_FOUND" });
    }
    const sellerNetPrice = Number(listing.prix_vendeur || 0);
    const split = sellerNetPrice > 0
      ? calculateMarketplaceSplitFromSellerNet(sellerNetPrice)
      : calculateMarketplaceSplit(Number(listing.prix_affiche), listing.type_livre);
    const amount = split.buyerPays ?? Number(listing.prix_affiche);
    return {
      paymentType: "buy" as PaymentType,
      amount,
      label: listing.titre,
      bookId: null,
      commissionPct: split.commissionPct,
      sellerReceives: split.sellerReceives,
      platformReceives: split.platformReceives,
      metadata: {
        listingId,
        sellerId: listing.seller_id,
        listingType: listing.type_livre,
        splitPayment: {
          invisible: true,
          sellerReceives: split.sellerReceives,
          platformReceives: split.platformReceives,
          commissionPct: split.commissionPct,
        },
      },
    };
  }

  if (!bookId) {
    throw Object.assign(new Error("book_id requis."), { statusCode: 400, code: "BOOK_ID_REQUIRED" });
  }

  const book = await getBook(bookId);
  if (!book || book.status !== "publie") {
    throw Object.assign(new Error("Livre introuvable ou non publie."), { statusCode: 404, code: "BOOK_NOT_FOUND" });
  }

  if (paymentType === "borrow") {
    if (!BORROW_DURATIONS.has(durationDays)) {
      throw Object.assign(new Error("Duree d'emprunt invalide."), { statusCode: 400, code: "INVALID_DURATION" });
    }
    if (!canBorrowForPlan(user.plan, user.emprunts_restants)) {
      throw Object.assign(new Error("Quota free atteint."), { statusCode: 403, code: "BORROW_QUOTA_EXCEEDED" });
    }
    return {
      paymentType,
      amount: priceForBorrow(book, durationDays),
      label: book.titre,
      bookId,
      metadata: { bookId, durationDays },
    };
  }

  if (paymentType === "renew") {
    if (!borrowId) throw Object.assign(new Error("borrow_id requis."), { statusCode: 400, code: "BORROW_ID_REQUIRED" });
    if (!RENEW_DURATIONS.has(durationDays)) {
      throw Object.assign(new Error("Duree de renouvellement invalide."), { statusCode: 400, code: "INVALID_RENEW_DURATION" });
    }
    return {
      paymentType,
      amount: priceForRenew(durationDays),
      label: book.titre,
      bookId,
      metadata: { borrowId, bookId, durationDays },
    };
  }

  return {
    paymentType,
    amount: Number(book.prix_achat || req.body?.amount || 0),
    label: book.titre,
    bookId,
    metadata: { bookId },
  };
}

async function activateSubscription(transaction: TransactionRow) {
  const now = new Date();
  const end = addMonths(now, 1);

  await supabaseAdmin
    .from("subscriptions")
    .update({ statut: "cancelled", auto_renew: false })
    .eq("user_id", transaction.user_id)
    .eq("statut", "active");

  await supabaseAdmin.from("subscriptions").insert({
    user_id: transaction.user_id,
    plan: "student",
    debut: now.toISOString(),
    fin: end.toISOString(),
    auto_renew: true,
    montant_mensuel: SUBSCRIBE_PRICE_FCFA,
    statut: "active",
    billing_period: "monthly",
    payment_transaction_id: transaction.id,
  });

  await supabaseAdmin.from("profiles").update({ plan: "student" }).eq("id", transaction.user_id);
}

async function fulfillBorrow(transaction: TransactionRow) {
  const metadata = transaction.metadata || {};
  const bookId = metadata.bookId || transaction.book_id;
  const durationDays = Number(metadata.durationDays || 7);
  if (!bookId) return null;

  const { data: existing } = await supabaseAdmin
    .from("borrows")
    .select("id")
    .eq("user_id", transaction.user_id)
    .eq("book_id", bookId)
    .in("statut", ["actif", "prolonge"])
    .maybeSingle();
  if (existing) return existing;

  const now = new Date();
  const { data: borrow, error } = await supabaseAdmin
    .from("borrows")
    .insert({
      user_id: transaction.user_id,
      book_id: bookId,
      debut: now.toISOString(),
      fin_prevue: addDays(now, durationDays).toISOString(),
      statut: "actif",
      duree_jours: durationDays,
      prix_location_fcfa: transaction.montant,
      metadata: { paymentTransactionId: transaction.id },
    })
    .select("*")
    .single();
  if (error) throw error;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan,emprunts_restants")
    .eq("id", transaction.user_id)
    .maybeSingle();
  if (profile && !isUnlimitedPlan(profile.plan)) {
    await supabaseAdmin
      .from("profiles")
      .update({ emprunts_restants: Math.max(0, Number(profile.emprunts_restants || 0) - 1) })
      .eq("id", transaction.user_id);
  }

  return borrow;
}

async function fulfillRenew(transaction: TransactionRow) {
  const metadata = transaction.metadata || {};
  const borrowId = metadata.borrowId;
  const durationDays = Number(metadata.durationDays || 7);
  if (!borrowId) return null;

  const { data: borrow, error: borrowError } = await supabaseAdmin
    .from("borrows")
    .select("*")
    .eq("id", borrowId)
    .eq("user_id", transaction.user_id)
    .maybeSingle();
  if (borrowError || !borrow) return null;

  const renewalCount = Number((borrow as any).renewal_count || 0);
  if (renewalCount >= 2) return borrow;

  const { data: updated, error } = await supabaseAdmin
    .from("borrows")
    .update({
      fin_prevue: addDays(new Date((borrow as any).fin_prevue), durationDays).toISOString(),
      statut: "prolonge",
      prolongation_auto_utilisee: true,
      renewal_count: renewalCount + 1,
      renewal_paid_fcfa: Number((borrow as any).renewal_paid_fcfa || 0) + transaction.montant,
      metadata: {
        ...((borrow as any).metadata || {}),
        lastRenewalTransactionId: transaction.id,
      },
    })
    .eq("id", borrowId)
    .select("*")
    .single();
  if (error) throw error;
  return updated;
}

async function fulfillPenalty(transaction: TransactionRow) {
  const metadata = transaction.metadata || {};
  const penaltyId = metadata.penaltyId;
  const borrowId = metadata.borrowId;
  if (!penaltyId) return null;

  const now = new Date().toISOString();
  const { data: penalty, error } = await supabaseAdmin
    .from("penalties")
    .update({
      statut: "paid",
      paid_at: now,
      metadata: { ...(metadata || {}), paymentTransactionId: transaction.id },
    })
    .eq("id", penaltyId)
    .eq("user_id", transaction.user_id)
    .select("*")
    .single();
  if (error) throw error;

  await supabaseAdmin.from("profiles").update({ is_active: true }).eq("id", transaction.user_id);
  if (borrowId) {
    await supabaseAdmin
      .from("borrows")
      .update({
        statut: "actif",
        fin_prevue: addDays(new Date(), 7).toISOString(),
        jours_retard: 0,
        penalite_fcfa: 0,
      })
      .eq("id", borrowId);
  }

  return penalty;
}

async function fulfillMarketplace(transaction: TransactionRow) {
  const listingId = transaction.metadata?.listingId;
  const sellerId = transaction.metadata?.sellerId;
  if (!listingId) return null;

  const { data: listing, error } = await supabaseAdmin
    .from("marketplace_listings")
    .update({ statut: "vendu" })
    .eq("id", listingId)
    .select("*")
    .single();
  if (error) throw error;

  if (sellerId) {
    await supabaseAdmin.from("activity_logs").insert({
      user_id: sellerId,
      action: "marketplace_sale_confirmed",
      metadata: {
        listingId,
        transactionId: transaction.id,
        sellerReceives: transaction.vendeur_recoit,
      },
    });
  }

  return listing;
}

async function fulfillTransaction(transaction: TransactionRow) {
  if (transaction.metadata?.fulfilledAt) return { alreadyFulfilled: true };

  const paymentType = transaction.metadata?.paymentType as PaymentType | undefined;
  let fulfillment: unknown = null;

  if (paymentType === "borrow") fulfillment = await fulfillBorrow(transaction);
  if (paymentType === "renew") fulfillment = await fulfillRenew(transaction);
  if (paymentType === "subscribe") fulfillment = await activateSubscription(transaction);
  if (paymentType === "penalty") fulfillment = await fulfillPenalty(transaction);
  if (paymentType === "buy" && transaction.metadata?.listingId) fulfillment = await fulfillMarketplace(transaction);

  const metadata = {
    ...(transaction.metadata || {}),
    fulfilledAt: new Date().toISOString(),
    fulfillment,
  };
  await supabaseAdmin.from("transactions").update({ metadata }).eq("id", transaction.id);
  return { fulfillment };
}

async function sendPaymentConfirmation(transaction: TransactionRow) {
  const [{ data: profile }, { data: book }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("email,first_name,last_name,whatsapp_number")
      .eq("id", transaction.user_id)
      .maybeSingle(),
    transaction.book_id
      ? supabaseAdmin.from("books").select("titre").eq("id", transaction.book_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (!profile) return null;
  const titre = book?.titre || transaction.metadata?.label || transaction.metadata?.paymentType || "BiblioTech";

  const [whatsapp, email] = await Promise.all([
    sendWhatsApp(profile.whatsapp_number || "", "PAYMENT_SUCCESS", { montant: transaction.montant, titre }),
    sendEmail(profile.email, "payment_receipt", {
      name: [profile.first_name, profile.last_name].filter(Boolean).join(" "),
      montant: transaction.montant,
      titre,
    }),
  ]);
  return { whatsapp, email };
}

router.post("/initiate", requireAuth, paymentLimiter, validate("body", initiatePaymentSchema), async (req: PaymentRequest, res) => {
  try {
    const payload = await resolvePaymentPayload(req);
    const transaction = await createPendingTransaction({
      user: req.authUser!,
      paymentType: payload.paymentType,
      amount: payload.amount,
      bookId: payload.bookId,
      commissionPct: payload.commissionPct,
      sellerReceives: payload.sellerReceives,
      platformReceives: payload.platformReceives,
      metadata: {
        ...payload.metadata,
        label: payload.label,
        requestedAmount: req.body?.amount || null,
      },
    });

    const payment = await initNaboopayPayment({
      user: req.authUser!,
      transactionId: transaction.id,
      amount: transaction.montant,
      description: paymentDescription(payload.paymentType, payload.label),
      metadata: { transactionId: transaction.id, paymentType: payload.paymentType },
      callbackUrl: req.body?.callbackUrl,
      returnUrl: req.body?.returnUrl,
    });

    await supabaseAdmin
      .from("transactions")
      .update({
        metadata: {
          ...(transaction.metadata || {}),
          naboopay: payment,
        },
      })
      .eq("id", transaction.id);

    res.status(201).json({
      transaction,
      payment_url: payment.payment_url,
      payment,
      split: payload.sellerReceives !== undefined ? {
        seller_receives: payload.sellerReceives,
        platform_receives: payload.platformReceives,
        commission_pct: payload.commissionPct,
        invisible_to_seller: true,
      } : null,
    });
  } catch (error: any) {
    console.error("Erreur initiation paiement:", error);
    res.status(error.statusCode || 500).json({
      error: error.code || "PAYMENT_INIT_FAILED",
      message: error.message || "Impossible d'initier le paiement.",
    });
  }
});

router.post("/webhook", async (req: PaymentRequest, res) => {
  try {
    if (!verifyWebhookSignature(req)) {
      res.status(401).json({ error: "WEBHOOK_SIGNATURE_INVALID" });
      return;
    }

    const transactionId = String(
      req.body?.order_id ||
      req.body?.transaction_id ||
      req.body?.reference ||
      req.body?.metadata?.transactionId ||
      "",
    );
    if (!transactionId) {
      res.status(400).json({ error: "TRANSACTION_ID_REQUIRED" });
      return;
    }

    const webhookStatus = normalizeWebhookStatus(req.body);
    const transactionStatus = transactionStatusFromWebhook(webhookStatus);
    const { data: transaction, error } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .or(`id.eq.${transactionId},reference_externe.eq.${transactionId}`)
      .maybeSingle();

    if (error || !transaction) {
      res.status(404).json({ error: "TRANSACTION_NOT_FOUND" });
      return;
    }

    const tx = transaction as unknown as TransactionRow;
    await supabaseAdmin
      .from("transactions")
      .update({
        statut: transactionStatus,
        metadata: {
          ...(tx.metadata || {}),
          webhook: req.body,
          webhookStatus,
          webhookReceivedAt: new Date().toISOString(),
        },
      })
      .eq("id", tx.id);

    let fulfillment = null;
    let notifications = null;
    if (webhookStatus === "accepted") {
      const refreshed = {
        ...tx,
        statut: "completed" as TransactionStatus,
        metadata: {
          ...(tx.metadata || {}),
          webhook: req.body,
          webhookStatus,
        },
      };
      fulfillment = await fulfillTransaction(refreshed);
      notifications = await sendPaymentConfirmation(refreshed);
    }

    res.json({ status: "ok", transactionStatus, fulfillment, notifications });
  } catch (error) {
    console.error("Erreur webhook paiement:", error);
    res.status(500).json({ error: "PAYMENT_WEBHOOK_FAILED" });
  }
});

router.get("/history", requireAuth, async (req: PaymentRequest, res) => {
  try {
    const type = String(req.query.type || "").trim();
    const statut = String(req.query.statut || req.query.status || "").trim();
    const dateFrom = String(req.query.date_from || "").trim();
    const dateTo = String(req.query.date_to || "").trim();

    let query = supabaseAdmin
      .from("transactions")
      .select("*,books:book_id(id,titre,auteur,cover_url)")
      .eq("user_id", req.authUser!.id)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(Number(req.query.limit || 50), 1), 100));

    if (type) query = query.eq("type", type);
    if (statut) query = query.eq("statut", statut);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ transactions: data || [] });
  } catch (error) {
    console.error("Erreur historique paiements:", error);
    res.status(500).json({ error: "PAYMENT_HISTORY_FAILED", message: "Impossible de charger l'historique." });
  }
});

router.post("/penalty/:penaltyId", requireAuth, paymentLimiter, async (req: PaymentRequest, res) => {
  req.body = {
    ...(req.body || {}),
    type: "penalty",
    penalty_id: req.params.penaltyId,
  };

  try {
    const payload = await resolvePaymentPayload(req);
    const transaction = await createPendingTransaction({
      user: req.authUser!,
      paymentType: "penalty",
      amount: payload.amount,
      bookId: payload.bookId,
      metadata: {
        ...payload.metadata,
        label: "amende",
      },
    });

    const payment = await initNaboopayPayment({
      user: req.authUser!,
      transactionId: transaction.id,
      amount: transaction.montant,
      description: "BiblioTech - Paiement amende",
      metadata: { transactionId: transaction.id, paymentType: "penalty" },
      callbackUrl: req.body?.callbackUrl,
      returnUrl: req.body?.returnUrl,
    });

    const orderId = payment.providerResponse?.order_id || payment.providerResponse?.data?.order_id;
    
    await supabaseAdmin
      .from("transactions")
      .update({ 
        ...(orderId ? { reference_externe: orderId } : {}),
        metadata: { ...(transaction.metadata || {}), naboopay: payment } 
      })
      .eq("id", transaction.id);

    res.status(201).json({ transaction, payment_url: payment.payment_url, payment });
  } catch (error: any) {
    console.error("Erreur paiement amende:", error);
    res.status(error.statusCode || 500).json({
      error: error.code || "PENALTY_PAYMENT_FAILED",
      message: error.message || "Impossible d'initier le paiement de l'amende.",
    });
  }
});

export default router;
