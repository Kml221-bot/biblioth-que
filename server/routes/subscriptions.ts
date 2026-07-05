import { randomUUID, timingSafeEqual } from "crypto";
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

type BillingPeriod = "monthly" | "yearly" | "semester";

type PlanCode =
  | "free"
  | "student"
  | "premium"
  | "school_s"
  | "school_l"
  | "pack_informatique"
  | "pack_droit"
  | "pack_medecine"
  | "pack_economie";

interface AuthContext {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  whatsapp_number?: string | null;
}

interface SubscriptionRequest extends Request {
  authUser?: AuthContext;
}

interface PlanDefinition {
  code: PlanCode;
  label: string;
  priceFcfa: number;
  billingPeriod: BillingPeriod;
  durationMonths: number;
  recommended?: boolean;
  maxStudents?: number;
  accessCategory?: string;
  features: string[];
}

const PLANS: PlanDefinition[] = [
  {
    code: "free",
    label: "Free",
    priceFcfa: 0,
    billingPeriod: "monthly",
    durationMonths: 1,
    features: ["3 emprunts/mois", "Catalogue de base"],
  },
  {
    code: "student",
    label: "Etudiant",
    priceFcfa: 2000,
    billingPeriod: "monthly",
    durationMonths: 1,
    recommended: true,
    features: ["Emprunts illimites", "PDF", "Notes"],
  },
  {
    code: "premium",
    label: "Premium",
    priceFcfa: 3500,
    billingPeriod: "monthly",
    durationMonths: 1,
    features: ["Tout Etudiant", "Audio", "Telechargement offline"],
  },
  {
    code: "school_s",
    label: "Ecole S",
    priceFcfa: 50000,
    billingPeriod: "yearly",
    durationMonths: 12,
    maxStudents: 100,
    features: ["Jusqu'a 100 eleves", "Gestion ecole", "Acces catalogue"],
  },
  {
    code: "school_l",
    label: "Ecole L",
    priceFcfa: 150000,
    billingPeriod: "yearly",
    durationMonths: 12,
    maxStudents: 500,
    features: ["Jusqu'a 500 eleves", "Gestion ecole", "Acces catalogue"],
  },
  {
    code: "pack_informatique",
    label: "Pack Informatique",
    priceFcfa: 5000,
    billingPeriod: "semester",
    durationMonths: 6,
    accessCategory: "Informatique",
    features: ["Acces tout le catalogue Informatique pendant 6 mois"],
  },
  {
    code: "pack_droit",
    label: "Pack Droit",
    priceFcfa: 5000,
    billingPeriod: "semester",
    durationMonths: 6,
    accessCategory: "Droit",
    features: ["Acces tout le catalogue Droit pendant 6 mois"],
  },
  {
    code: "pack_medecine",
    label: "Pack Medecine",
    priceFcfa: 5000,
    billingPeriod: "semester",
    durationMonths: 6,
    accessCategory: "Medecine",
    features: ["Acces tout le catalogue Medecine pendant 6 mois"],
  },
  {
    code: "pack_economie",
    label: "Pack Economie",
    priceFcfa: 5000,
    billingPeriod: "semester",
    durationMonths: 6,
    accessCategory: "Economie",
    features: ["Acces tout le catalogue Economie pendant 6 mois"],
  },
];

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function getPlan(code: unknown): PlanDefinition | null {
  const normalized = String(code || "").trim().toLowerCase();
  return PLANS.find(plan => plan.code === normalized) || null;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function schoolProfilePlan(plan: PlanDefinition): "school" | PlanCode {
  return plan.code === "school_s" || plan.code === "school_l" ? "school" : plan.code;
}

function publicPlan(plan: PlanDefinition) {
  return {
    code: plan.code,
    label: plan.label,
    priceFcfa: plan.priceFcfa,
    billingPeriod: plan.billingPeriod,
    durationMonths: plan.durationMonths,
    recommended: !!plan.recommended,
    highlight: plan.recommended ? "2000 FCFA/mois" : null,
    maxStudents: plan.maxStudents || null,
    accessCategory: plan.accessCategory || null,
    features: plan.features,
  };
}

async function requireAuth(req: SubscriptionRequest, res: Response, next: NextFunction) {
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
    .select("id,email,first_name,last_name,whatsapp_number,is_active")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    res.status(403).json({ error: "PROFILE_FORBIDDEN", message: "Profil inactif ou introuvable." });
    return;
  }

  req.authUser = {
    id: profile.id,
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    whatsapp_number: profile.whatsapp_number,
  };
  next();
}

async function activateSubscription(userId: string, plan: PlanDefinition, transactionId?: string | null) {
  const now = new Date();
  const endDate = addMonths(now, plan.durationMonths);

  await supabaseAdmin
    .from("subscriptions")
    .update({ statut: "cancelled", auto_renew: false })
    .eq("user_id", userId)
    .eq("statut", "active");

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan: plan.code as any,
      debut: now.toISOString(),
      fin: endDate.toISOString(),
      auto_renew: plan.priceFcfa > 0,
      montant_mensuel: plan.priceFcfa,
      statut: "active",
      billing_period: plan.billingPeriod,
      max_students: plan.maxStudents || null,
      access_category: plan.accessCategory || null,
      payment_transaction_id: transactionId || null,
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabaseAdmin
    .from("profiles")
    .update({ plan: schoolProfilePlan(plan) as any })
    .eq("id", userId);

  return data;
}

async function sendWhatsApp(to: string | null | undefined, message: string) {
  const phone = String(to || "").replace(/[^\d]/g, "");
  const url = phone.length >= 8 ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  if (!phone || !url) return { status: "missing_number", url: null };
  if (!apiUrl || !apiToken) return { status: "not_configured", url };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "authorization": `Bearer ${apiToken}`, "content-type": "application/json" },
    body: JSON.stringify({ to: phone, message }),
  });

  return { status: response.ok ? "sent" : "failed", providerStatus: response.status, url };
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "BiblioTech <notifications@bibliotech.sn>";

  if (!apiKey) return { status: "not_configured" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "authorization": `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });

  return { status: response.ok ? "sent" : "failed", providerStatus: response.status };
}

async function sendSubscriptionConfirmation(user: AuthContext, plan: PlanDefinition) {
  const message = `Votre abonnement BiblioTech ${plan.label} est active. Merci pour votre confiance.`;
  const [email, whatsapp] = await Promise.all([
    sendEmail(
      user.email,
      `Abonnement BiblioTech ${plan.label} active`,
      `<p>Bonjour ${user.first_name || ""},</p><p>Votre abonnement <strong>${plan.label}</strong> est active.</p>`,
    ),
    sendWhatsApp(user.whatsapp_number, message),
  ]);

  return { email, whatsapp };
}

async function initNaboopayPayment(input: {
  user: AuthContext;
  plan: PlanDefinition;
  transactionId: string;
  callbackUrl?: string;
  returnUrl?: string;
}) {
  const baseUrl = process.env.NABOOPAY_API_URL || "https://api.naboopay.com";
  const apiKey = process.env.NABOOPAY_API_KEY;

  if (!apiKey) {
    return { status: "not_configured", paymentUrl: null, providerResponse: null };
  }

  const response = await fetch(`${baseUrl}/api/v2/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      price: input.plan.priceFcfa,
      currency: "XOF",
      description: `Abonnement BiblioTech ${input.plan.label}`,
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

function hasValidWebhookSecret(req: Request) {
  const secret = process.env.NABOOPAY_SECRET_KEY || process.env.NABOOPAY_WEBHOOK_SECRET;
  if (!secret) return true; // En dev, accepter si pas configuré

  const received = String(req.headers["x-webhook-secret"] || req.query.secret || "");
  const expectedBuffer = Buffer.from(secret);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

router.get("/plans", (_req, res) => {
  res.json({
    recommendedPlan: "student",
    recommendedHighlight: "2000 FCFA/mois",
    plans: PLANS.map(publicPlan),
  });
});

router.post("/subscribe", requireAuth, async (req: SubscriptionRequest, res) => {
  try {
    const user = req.authUser!;
    const plan = getPlan(req.body.plan || req.body.plan_code);
    if (!plan) {
      res.status(400).json({ error: "PLAN_INVALID", message: "Plan inconnu." });
      return;
    }

    if (plan.priceFcfa === 0) {
      const subscription = await activateSubscription(user.id, plan);
      const notifications = await sendSubscriptionConfirmation(user, plan);
      res.status(201).json({ data: subscription, payment: { status: "free_plan" }, notifications });
      return;
    }

    const transactionId = randomUUID();
    const { data: transaction, error } = await supabaseAdmin
      .from("transactions")
      .insert({
        id: transactionId,
        user_id: user.id,
        type: "abonnement",
        montant: plan.priceFcfa,
        commission_pct: 0,
        vendeur_recoit: 0,
        plateforme_recoit: plan.priceFcfa,
        statut: "pending",
        provider: "naboopay",
        reference_externe: transactionId,
        metadata: {
          plan: plan.code,
          billingPeriod: plan.billingPeriod,
          durationMonths: plan.durationMonths,
          paymentMethod: "wave",
        },
      })
      .select("*")
      .single();

    if (error) throw error;

    const payment = await initNaboopayPayment({
      user,
      plan,
      transactionId,
      callbackUrl: req.body.callbackUrl,
      returnUrl: req.body.returnUrl,
    });

    const orderId = payment.providerResponse?.order_id || payment.providerResponse?.data?.order_id;
    if (orderId) {
      await supabaseAdmin.from("transactions").update({ reference_externe: orderId }).eq("id", transaction.id);
    }

    res.status(201).json({
      transaction,
      plan: publicPlan(plan),
      payment,
      next: payment.status === "not_configured"
        ? "Configure NABOOPAY_API_KEY pour initier le paiement Wave."
        : "Attente confirmation webhook Naboopay.",
    });
  } catch (error) {
    console.error("Erreur abonnement:", error);
    res.status(500).json({ error: "SUBSCRIBE_FAILED", message: "Impossible d'initier l'abonnement." });
  }
});

router.post("/cancel", requireAuth, async (req: SubscriptionRequest, res) => {
  try {
    const user = req.authUser!;
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .update({ auto_renew: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("statut", "active")
      .select("*");

    if (error) throw error;

    res.json({
      data: data || [],
      message: "Renouvellement automatique desactive. L'acces reste actif jusqu'a la fin de periode.",
    });
  } catch (error) {
    console.error("Erreur annulation abonnement:", error);
    res.status(500).json({ error: "CANCEL_FAILED", message: "Impossible d'annuler le renouvellement." });
  }
});

router.post("/webhook/naboopay", async (req, res) => {
  try {
    if (!hasValidWebhookSecret(req)) {
      res.status(401).json({ error: "WEBHOOK_FORBIDDEN" });
      return;
    }

    const transactionId = String(
      req.body.order_id ||
      req.body.transaction_id ||
      req.body.reference ||
      "",
    );
    const status = String(req.body.status || req.body.payment_status || "").toLowerCase();
    const success = ["accepted", "success", "completed", "paid"].includes(status);

    if (!transactionId) {
      res.status(400).json({ error: "TRANSACTION_ID_REQUIRED" });
      return;
    }

    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .or(`id.eq.${transactionId},reference_externe.eq.${transactionId}`)
      .single();

    if (txError || !transaction) {
      res.status(404).json({ error: "TRANSACTION_NOT_FOUND" });
      return;
    }

    const plan = getPlan((transaction.metadata as any)?.plan);
    if (!plan) {
      res.status(400).json({ error: "PLAN_METADATA_MISSING" });
      return;
    }

    await supabaseAdmin
      .from("transactions")
      .update({ statut: success ? "completed" : "failed", metadata: { ...(transaction.metadata as any), webhook: req.body } })
      .eq("id", transaction.id);

    if (!success) {
      res.json({ status: "ignored", transactionStatus: "failed" });
      return;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id,email,first_name,last_name,whatsapp_number")
      .eq("id", transaction.user_id)
      .single();
    if (profileError || !profile) throw profileError;

    const subscription = await activateSubscription(transaction.user_id, plan, transaction.id);
    const notifications = await sendSubscriptionConfirmation(profile as AuthContext, plan);

    res.json({ status: "ok", subscription, notifications });
  } catch (error) {
    console.error("Erreur webhook Naboopay abonnement:", error);
    res.status(500).json({ error: "WEBHOOK_FAILED" });
  }
});

export default router;
