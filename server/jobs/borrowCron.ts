import cron from "node-cron";
import { supabaseAdmin } from "../lib/supabase.js";
import { sendEmail, sendSMS, sendWhatsApp } from "../services/notifications.js";

type BorrowRow = {
  id: string;
  user_id: string;
  book_id: string;
  fin_prevue: string;
  statut: string;
  penalite_fcfa: number | null;
  jours_retard: number | null;
  rappel_j3_envoye?: boolean | null;
  rappel_j1_envoye?: boolean | null;
  penalty_stage?: number | null;
  books?: { titre?: string | null; pages_count?: number | null } | { titre?: string | null; pages_count?: number | null }[] | null;
  profiles?: {
    email?: string | null;
    first_name?: string | null;
    whatsapp_number?: string | null;
    wave_auto_debit_token?: string | null;
  } | {
    email?: string | null;
    first_name?: string | null;
    whatsapp_number?: string | null;
    wave_auto_debit_token?: string | null;
  }[] | null;
};

type ProfileRow = {
  id: string;
  email: string;
  first_name?: string | null;
  whatsapp_number?: string | null;
  plan?: string | null;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: string;
  fin: string;
  montant_mensuel: number;
  auto_renew: boolean;
  billing_period?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const CRON_TIMEZONE = process.env.BORROW_CRON_TIMEZONE || "Africa/Dakar";

function nestedOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function daysUntilDue(finPrevue: string, now = new Date()): number {
  const due = new Date(finPrevue);
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueStart = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  return Math.round((dueStart - todayStart) / DAY_MS);
}

function lateDays(finPrevue: string, now = new Date()): number {
  return Math.max(0, -daysUntilDue(finPrevue, now));
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function planDurationMonths(subscription: SubscriptionRow): number {
  if (subscription.billing_period === "yearly") return 12;
  if (subscription.billing_period === "semester") return 6;
  return 1;
}

async function fetchOpenBorrows(): Promise<BorrowRow[]> {
  const { data, error } = await supabaseAdmin
    .from("borrows")
    .select(`
      id,user_id,book_id,fin_prevue,statut,penalite_fcfa,jours_retard,rappel_j3_envoye,rappel_j1_envoye,penalty_stage,
      books:book_id(titre,pages_count),
      profiles:user_id(email,first_name,whatsapp_number,wave_auto_debit_token)
    `)
    .in("statut", ["actif", "prolonge", "retard"]);

  if (error) throw error;
  return (data || []) as BorrowRow[];
}

async function markBorrowReminder(borrowId: string, field: "rappel_j3_envoye" | "rappel_j1_envoye") {
  await supabaseAdmin
    .from("borrows")
    .update({ [field]: true, updated_at: new Date().toISOString() })
    .eq("id", borrowId);
}

async function sendJ3Reminder(borrow: BorrowRow) {
  const profile = nestedOne(borrow.profiles);
  const book = nestedOne(borrow.books);
  const titre = book?.titre || "ton livre";

  await Promise.all([
    sendWhatsApp(profile?.whatsapp_number || "", "BORROW_REMINDER_3", { titre }),
    sendEmail(profile?.email || "", "borrow_confirmed", {
      name: profile?.first_name || "",
      titre,
      message: `Ton emprunt "${titre}" expire dans 3 jours. Renouvelle pour 200F ou retourne-le.`,
    }),
  ]);

  await markBorrowReminder(borrow.id, "rappel_j3_envoye");
}

async function sendJ1Reminder(borrow: BorrowRow) {
  const profile = nestedOne(borrow.profiles);
  const book = nestedOne(borrow.books);
  const titre = book?.titre || "ton livre";
  await sendSMS(profile?.whatsapp_number || "", `BiblioTech: Ton livre '${titre}' doit etre retourne demain!`);
  await markBorrowReminder(borrow.id, "rappel_j1_envoye");
}

async function findPenalty(borrowId: string) {
  const { data, error } = await supabaseAdmin
    .from("penalties")
    .select("id,montant,statut,metadata")
    .eq("borrow_id", borrowId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function attemptWaveAutoDebit(profile: ReturnType<typeof nestedOne<BorrowRow["profiles"]>>, amount: number, borrow: BorrowRow) {
  const token = nestedOne(profile)?.wave_auto_debit_token;
  const apiUrl = process.env.WAVE_AUTO_DEBIT_API_URL;
  const apiKey = process.env.WAVE_AUTO_DEBIT_API_KEY;

  if (!token || !apiUrl || !apiKey) {
    return { status: "not_configured_or_missing_token" };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        token,
        amount,
        currency: "XOF",
        reference: `borrow-penalty-${borrow.id}-${Date.now()}`,
        description: "Amende retard BiblioTech",
      }),
    });

    const providerResponse = await response.json().catch(() => ({}));
    return {
      status: response.ok ? "initiated" : "failed",
      providerStatus: response.status,
      providerResponse,
    };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown Wave error",
    };
  }
}

async function upsertPenalty(borrow: BorrowRow, amount: number, stage: number, daysLate: number) {
  const profile = nestedOne(borrow.profiles);
  const existing = await findPenalty(borrow.id);
  const debit = await attemptWaveAutoDebit(profile, amount, borrow);
  const reason = `Retard ${daysLate}j - amende automatique ${amount} FCFA`;

  if (!existing) {
    const { error } = await supabaseAdmin.from("penalties").insert({
      borrow_id: borrow.id,
      user_id: borrow.user_id,
      montant: amount,
      statut: "pending",
      raison: reason,
      metadata: { stage, daysLate, waveAutoDebit: debit },
    });
    if (error) throw error;
  } else if (existing.statut === "pending" && Number(existing.montant || 0) < amount) {
    const { error } = await supabaseAdmin
      .from("penalties")
      .update({
        montant: amount,
        raison: reason,
        metadata: { ...(existing.metadata as any), stage, daysLate, waveAutoDebit: debit },
      })
      .eq("id", existing.id);
    if (error) throw error;
  }

  await supabaseAdmin
    .from("borrows")
    .update({
      statut: "retard",
      penalite_fcfa: amount,
      jours_retard: daysLate,
      penalty_stage: stage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", borrow.id);

  return debit;
}

async function handleOverdue(borrow: BorrowRow, daysLate: number) {
  const profile = nestedOne(borrow.profiles);
  const book = nestedOne(borrow.books);
  const titre = book?.titre || "ton livre";
  const currentStage = Number(borrow.penalty_stage || 0);

  if (daysLate >= 1 && daysLate <= 7 && currentStage < 1) {
    await upsertPenalty(borrow, 300, 1, daysLate);
    await sendWhatsApp(profile?.whatsapp_number || "", "OVERDUE_WARNING", { X: daysLate, montant: 300 });
  } else if (daysLate >= 8 && daysLate <= 14 && currentStage < 2) {
    await upsertPenalty(borrow, 500, 2, daysLate);
    await Promise.all([
      sendWhatsApp(profile?.whatsapp_number || "", "OVERDUE_WARNING", { X: daysLate, montant: 500 }),
      sendSMS(profile?.whatsapp_number || "", `BiblioTech: Retard ${daysLate}j sur '${titre}'. Amende 500F.`),
    ]);
  } else if (daysLate >= 15 && currentStage < 3) {
    await upsertPenalty(borrow, 800, 3, daysLate);
    await supabaseAdmin
      .from("profiles")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", borrow.user_id);

    await sendWhatsApp(profile?.whatsapp_number || "", "OVERDUE_WARNING", { X: daysLate, montant: 800 });
    await sendAdminOverdueAlert(borrow, daysLate);
  }
}

async function sendAdminOverdueAlert(borrow: BorrowRow, daysLate: number) {
  const profile = nestedOne(borrow.profiles);
  const book = nestedOne(borrow.books);
  const { data: admins } = await supabaseAdmin
    .from("profiles")
    .select("email,first_name")
    .in("role", ["admin", "super_admin"])
    .eq("is_active", true);

  await Promise.all((admins || []).map(admin => sendEmail(admin.email, "overdue_notice", {
    name: admin.first_name || "Admin",
    titre: book?.titre || borrow.book_id,
    user_email: profile?.email || borrow.user_id,
    jours_retard: daysLate,
    montant: 800,
  })));
}

export async function runNightlyBorrowCron(now = new Date()) {
  const borrows = await fetchOpenBorrows();

  for (const borrow of borrows) {
    const daysLeft = daysUntilDue(borrow.fin_prevue, now);
    const daysLate = lateDays(borrow.fin_prevue, now);

    try {
      if (daysLeft === 3 && !borrow.rappel_j3_envoye) {
        await sendJ3Reminder(borrow);
      }

      if (daysLeft === 1 && !borrow.rappel_j1_envoye) {
        await sendJ1Reminder(borrow);
      }

      if (daysLate > 0) {
        await handleOverdue(borrow, daysLate);
      }
    } catch (error) {
      console.error("Erreur cron emprunt:", borrow.id, error);
    }
  }
}

async function fetchActiveAutoRenewSubscriptions(now = new Date()): Promise<SubscriptionRow[]> {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id,user_id,plan,fin,montant_mensuel,auto_renew,billing_period")
    .eq("statut", "active")
    .eq("auto_renew", true)
    .lte("fin", now.toISOString());

  if (error) throw error;
  return (data || []) as SubscriptionRow[];
}

async function renewSubscription(subscription: SubscriptionRow) {
  const nextEnd = addMonths(new Date(subscription.fin), planDurationMonths(subscription));
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({ fin: nextEnd.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", subscription.id);

  if (error) throw error;

  await supabaseAdmin.from("transactions").insert({
    user_id: subscription.user_id,
    type: "abonnement",
    montant: subscription.montant_mensuel,
    commission_pct: 0,
    vendeur_recoit: 0,
    plateforme_recoit: subscription.montant_mensuel,
    statut: "pending",
    provider: "wave",
    reference_externe: `auto-renew-${subscription.id}-${Date.now()}`,
    metadata: { plan: subscription.plan, subscriptionId: subscription.id, autoRenew: true },
  });
}

async function sendMonthlyStatsEmail(user: ProfileRow, from: Date, to: Date) {
  const { data } = await supabaseAdmin
    .from("reading_sessions")
    .select("book_id,pages_lues,duree_minutes")
    .eq("user_id", user.id)
    .gte("debut", from.toISOString())
    .lt("debut", to.toISOString());

  const sessions = data || [];
  const booksRead = new Set(sessions.map(row => row.book_id).filter(Boolean)).size;
  const pages = sessions.reduce((sum, row) => sum + Number(row.pages_lues || 0), 0);
  const minutes = sessions.reduce((sum, row) => sum + Number(row.duree_minutes || 0), 0);

  await sendEmail(user.email, "monthly_stats", {
    name: user.first_name || "",
    books_read: `${booksRead} livres, ${pages} pages, ${minutes} minutes`,
    pages,
    minutes,
    message: `Ce mois tu as lu ${booksRead} livres, ${pages} pages, ${minutes} minutes`,
  });
}

export async function runMonthlyBorrowCron(now = new Date()) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  await supabaseAdmin
    .from("profiles")
    .update({ emprunts_restants: 3, updated_at: new Date().toISOString() })
    .eq("plan", "free");

  const subscriptions = await fetchActiveAutoRenewSubscriptions(now);
  for (const subscription of subscriptions) {
    try {
      await renewSubscription(subscription);
    } catch (error) {
      console.error("Erreur renouvellement abonnement:", subscription.id, error);
    }
  }

  const { data: users, error } = await supabaseAdmin
    .from("profiles")
    .select("id,email,first_name,whatsapp_number,plan")
    .eq("is_active", true);

  if (error) throw error;

  for (const user of (users || []) as ProfileRow[]) {
    try {
      await sendMonthlyStatsEmail(user, previousMonthStart, monthStart);
    } catch (error) {
      console.error("Erreur rapport mensuel:", user.id, error);
    }
  }
}

export function startBorrowCronJobs() {
  if (process.env.DISABLE_BORROW_CRON === "true") {
    console.log("Borrow cron disabled by DISABLE_BORROW_CRON=true");
    return;
  }

  cron.schedule("0 0 * * *", () => {
    runNightlyBorrowCron().catch(error => console.error("Nightly borrow cron failed:", error));
  }, { timezone: CRON_TIMEZONE });

  cron.schedule("0 8 1 * *", () => {
    runMonthlyBorrowCron().catch(error => console.error("Monthly borrow cron failed:", error));
  }, { timezone: CRON_TIMEZONE });

  console.log(`Borrow cron jobs scheduled (${CRON_TIMEZONE})`);
}
