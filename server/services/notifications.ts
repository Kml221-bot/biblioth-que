import webPush from "web-push";
import { supabaseAdmin } from "../lib/supabase.js";

type NotificationChannel = "whatsapp" | "email" | "sms" | "push";
type NotificationStatus = "sent" | "failed" | "not_configured" | "missing_recipient";

export type WhatsAppTemplate =
  | "BORROW_CONFIRMED"
  | "BORROW_REMINDER_3"
  | "BORROW_REMINDER_1"
  | "OVERDUE_WARNING"
  | "PAYMENT_SUCCESS"
  | "SELL_CONFIRMED"
  | "BADGE_UNLOCKED"
  | "SUB_EXPIRING";

export type EmailTemplate =
  | "welcome"
  | "borrow_confirmed"
  | "payment_receipt"
  | "monthly_stats"
  | "overdue_notice"
  | "penalty_paid"
  | "new_badge"
  | "community_invite";

interface NotificationLogInput {
  userId?: string | null;
  channel: NotificationChannel;
  recipient?: string | null;
  template?: string | null;
  subject?: string | null;
  title?: string | null;
  body: string;
  status: NotificationStatus;
  provider?: string | null;
  providerMessageId?: string | null;
  providerResponse?: Record<string, unknown>;
  error?: string | null;
  metadata?: Record<string, unknown>;
}

interface SendResult {
  channel: NotificationChannel;
  status: NotificationStatus;
  provider?: string;
  recipient?: string | null;
  providerMessageId?: string | null;
  providerResponse?: Record<string, unknown>;
  error?: string | null;
}

const WHATSAPP_TEMPLATES: Record<WhatsAppTemplate, string> = {
  BORROW_CONFIRMED: "✅ Emprunt confirmé : [titre] pendant [jours]j",
  BORROW_REMINDER_3: "📚 [titre] expire dans 3 jours. Renouveler?",
  BORROW_REMINDER_1: "⚠️ [titre] doit être retourné demain!",
  OVERDUE_WARNING: "🔴 Retard [X]j — Amende [montant]F sur ton compte",
  PAYMENT_SUCCESS: "💚 Paiement Wave reçu : [montant]F pour [titre]",
  SELL_CONFIRMED: "🎉 Ton livre '[titre]' a été vendu! Tu reçois [montant]F",
  BADGE_UNLOCKED: "🏆 Badge débloqué : [nom_badge] sur BiblioTech!",
  SUB_EXPIRING: "⏰ Abonnement expire dans 3j. Renouveler pour 2000F?",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\[([^\]]+)\]/g, (_match, key: string) => String(vars[key] ?? ""));
}

function normalizePhone(value: string): string {
  const trimmed = String(value || "").trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return hasPlus ? `+${digits}` : digits;
}

function truncateSms(message: string): string {
  return message.length <= 160 ? message : `${message.slice(0, 157)}...`;
}

async function logNotification(input: NotificationLogInput) {
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: input.userId || null,
    channel: input.channel,
    recipient: input.recipient || null,
    template: input.template || null,
    subject: input.subject || null,
    title: input.title || null,
    body: input.body,
    status: input.status,
    provider: input.provider || null,
    provider_message_id: input.providerMessageId || null,
    provider_response: input.providerResponse || {},
    error: input.error || null,
    metadata: input.metadata || {},
    sent_at: input.status === "sent" ? new Date().toISOString() : null,
  });

  if (error) {
    console.warn("Impossible de journaliser la notification:", error.message);
  }
}

async function parseProviderResponse(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }
  const text = await response.text().catch(() => "");
  return { text };
}

function emailTemplate(template: EmailTemplate, data: Record<string, unknown>): { subject: string; html: string; text: string } {
  const name = escapeHtml(data.name || data.prenom || "");
  const titre = escapeHtml(data.titre || data.title || "votre livre");
  const montant = escapeHtml(data.montant || data.amount || "");
  const badge = escapeHtml(data.nom_badge || data.badge || "");
  const community = escapeHtml(data.community || data.communaute || "une communauté");

  const templates: Record<EmailTemplate, { subject: string; body: string }> = {
    welcome: {
      subject: "Bienvenue sur BiblioTech",
      body: `<p>Bonjour ${name},</p><p>Bienvenue sur BiblioTech. Votre bibliothèque numérique est prête.</p>`,
    },
    borrow_confirmed: {
      subject: `Emprunt confirmé - ${titre}`,
      body: `<p>Votre emprunt de <strong>${titre}</strong> est confirmé.</p><p>Bonne lecture.</p>`,
    },
    payment_receipt: {
      subject: "Reçu de paiement BiblioTech",
      body: `<p>Paiement reçu : <strong>${montant} FCFA</strong>.</p><p>Objet : ${titre}</p>`,
    },
    monthly_stats: {
      subject: "Vos statistiques mensuelles BiblioTech",
      body: `<p>Voici votre résumé du mois.</p><p>Livres lus : ${escapeHtml(data.books_read || 0)}.</p>`,
    },
    overdue_notice: {
      subject: "Retard de retour BiblioTech",
      body: `<p>Le livre <strong>${titre}</strong> est en retard.</p><p>Merci de régulariser votre situation.</p>`,
    },
    penalty_paid: {
      subject: "Amende réglée",
      body: `<p>Votre amende de <strong>${montant} FCFA</strong> a bien été réglée.</p>`,
    },
    new_badge: {
      subject: `Badge débloqué - ${badge}`,
      body: `<p>Bravo, vous avez débloqué le badge <strong>${badge}</strong> sur BiblioTech.</p>`,
    },
    community_invite: {
      subject: "Invitation communauté BiblioTech",
      body: `<p>Vous êtes invité à rejoindre <strong>${community}</strong>.</p>`,
    },
  };

  const selected = templates[template];
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#172033">${selected.body}<p style="color:#64748b;font-size:12px">BiblioTech</p></body></html>`;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { subject: selected.subject, html, text };
}

export async function sendWhatsApp(
  to: string,
  template: WhatsAppTemplate,
  vars: Record<string, unknown> = {},
): Promise<SendResult> {
  const recipient = normalizePhone(to);
  const body = interpolate(WHATSAPP_TEMPLATES[template], vars);

  if (!recipient || recipient.length < 8) {
    const result: SendResult = { channel: "whatsapp", status: "missing_recipient", provider: "twilio", recipient, error: "Missing WhatsApp number" };
    await logNotification({ ...result, template, body, metadata: vars });
    return result;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
    const result: SendResult = { channel: "whatsapp", status: "not_configured", provider: "twilio", recipient };
    await logNotification({ ...result, template, body, metadata: vars });
    return result;
  }

  try {
    const form = new URLSearchParams({
      To: `whatsapp:${recipient}`,
      Body: body,
    });
    if (messagingServiceSid) form.set("MessagingServiceSid", messagingServiceSid);
    else form.set("From", from!.startsWith("whatsapp:") ? from! : `whatsapp:${from}`);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    const providerResponse = await parseProviderResponse(response);
    const result: SendResult = {
      channel: "whatsapp",
      status: response.ok ? "sent" : "failed",
      provider: "twilio",
      recipient,
      providerMessageId: typeof providerResponse.sid === "string" ? providerResponse.sid : null,
      providerResponse,
      error: response.ok ? null : String(providerResponse.message || response.statusText),
    };
    await logNotification({ ...result, template, body, metadata: vars });
    return result;
  } catch (error) {
    const result: SendResult = {
      channel: "whatsapp",
      status: "failed",
      provider: "twilio",
      recipient,
      error: error instanceof Error ? error.message : "Unknown Twilio error",
    };
    await logNotification({ ...result, template, body, metadata: vars });
    return result;
  }
}

export async function sendEmail(
  to: string,
  template: EmailTemplate,
  data: Record<string, unknown> = {},
): Promise<SendResult> {
  const rendered = emailTemplate(template, data);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "BiblioTech <notifications@bibliotech.sn>";

  if (!to) {
    const result: SendResult = { channel: "email", status: "missing_recipient", provider: "resend", recipient: to, error: "Missing email" };
    await logNotification({ ...result, template, subject: rendered.subject, body: rendered.text, metadata: data });
    return result;
  }

  if (!apiKey) {
    const result: SendResult = { channel: "email", status: "not_configured", provider: "resend", recipient: to };
    await logNotification({ ...result, template, subject: rendered.subject, body: rendered.text, metadata: data });
    return result;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      }),
    });

    const providerResponse = await parseProviderResponse(response);
    const result: SendResult = {
      channel: "email",
      status: response.ok ? "sent" : "failed",
      provider: "resend",
      recipient: to,
      providerMessageId: typeof providerResponse.id === "string" ? providerResponse.id : null,
      providerResponse,
      error: response.ok ? null : String(providerResponse.message || response.statusText),
    };
    await logNotification({ ...result, template, subject: rendered.subject, body: rendered.text, metadata: data });
    return result;
  } catch (error) {
    const result: SendResult = {
      channel: "email",
      status: "failed",
      provider: "resend",
      recipient: to,
      error: error instanceof Error ? error.message : "Unknown Resend error",
    };
    await logNotification({ ...result, template, subject: rendered.subject, body: rendered.text, metadata: data });
    return result;
  }
}

export async function sendSMS(to: string, message: string): Promise<SendResult> {
  const recipient = normalizePhone(to);
  const body = truncateSms(message);
  const username = process.env.AFRICASTALKING_USERNAME || process.env.AT_USERNAME;
  const apiKey = process.env.AFRICASTALKING_API_KEY || process.env.AT_API_KEY;
  const senderId = process.env.AFRICASTALKING_SENDER_ID;

  if (!recipient || recipient.length < 8) {
    const result: SendResult = { channel: "sms", status: "missing_recipient", provider: "africastalking", recipient, error: "Missing phone number" };
    await logNotification({ ...result, body, metadata: { originalLength: message.length } });
    return result;
  }

  if (!username || !apiKey) {
    const result: SendResult = { channel: "sms", status: "not_configured", provider: "africastalking", recipient };
    await logNotification({ ...result, body, metadata: { originalLength: message.length } });
    return result;
  }

  try {
    const form = new URLSearchParams({
      username,
      to: recipient,
      message: body,
    });
    if (senderId) form.set("from", senderId);

    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apikey: apiKey,
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    const providerResponse = await parseProviderResponse(response);
    const recipients = (providerResponse.SMSMessageData as any)?.Recipients;
    const providerMessageId = Array.isArray(recipients) ? recipients[0]?.messageId : null;
    const result: SendResult = {
      channel: "sms",
      status: response.ok ? "sent" : "failed",
      provider: "africastalking",
      recipient,
      providerMessageId: providerMessageId || null,
      providerResponse,
      error: response.ok ? null : String(providerResponse.message || response.statusText),
    };
    await logNotification({ ...result, body, metadata: { originalLength: message.length } });
    return result;
  } catch (error) {
    const result: SendResult = {
      channel: "sms",
      status: "failed",
      provider: "africastalking",
      recipient,
      error: error instanceof Error ? error.message : "Unknown SMS error",
    };
    await logNotification({ ...result, body, metadata: { originalLength: message.length } });
    return result;
  }
}

function configureWebPush(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:notifications@bibliotech.sn";

  if (!publicKey || !privateKey) return false;
  webPush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendPush(
  userId: string,
  title: string,
  body: string,
  url: string,
): Promise<SendResult[]> {
  const configured = configureWebPush();
  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error || !subscriptions?.length) {
    const result: SendResult = {
      channel: "push",
      status: "missing_recipient",
      provider: "web-push",
      recipient: userId,
      error: error?.message || "No active push subscription",
    };
    await logNotification({ ...result, userId, title, body, metadata: { url } });
    return [result];
  }

  if (!configured) {
    const result: SendResult = { channel: "push", status: "not_configured", provider: "web-push", recipient: userId };
    await logNotification({ ...result, userId, title, body, metadata: { url, subscriptions: subscriptions.length } });
    return [result];
  }

  const payload = JSON.stringify({ title, body, url });
  const results: SendResult[] = [];

  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      }, payload);

      const result: SendResult = {
        channel: "push",
        status: "sent",
        provider: "web-push",
        recipient: subscription.endpoint,
      };
      results.push(result);
      await logNotification({ ...result, userId, title, body, metadata: { url, subscriptionId: subscription.id } });
    } catch (error: any) {
      const inactive = error?.statusCode === 404 || error?.statusCode === 410;
      if (inactive) {
        await supabaseAdmin
          .from("push_subscriptions")
          .update({ is_active: false })
          .eq("id", subscription.id);
      }

      const result: SendResult = {
        channel: "push",
        status: "failed",
        provider: "web-push",
        recipient: subscription.endpoint,
        error: error instanceof Error ? error.message : "Unknown push error",
      };
      results.push(result);
      await logNotification({ ...result, userId, title, body, metadata: { url, subscriptionId: subscription.id } });
    }
  }

  return results;
}

// ─── Notification in-app ───────────────────────────────────────────────────────
// Crée une notification visible dans le panneau de la cloche (canal in_app).
// Pas d'envoi externe — purement côté DB pour la récupération frontend.
export async function sendInAppNotification(
  userId: string,
  title: string,
  body: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    channel: "in_app",
    recipient: null,
    template: null,
    subject: null,
    title,
    body,
    status: "sent",
    provider: null,
    provider_message_id: null,
    provider_response: {},
    error: null,
    metadata: { ...metadata, is_read: false },
    sent_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("sendInAppNotification:", error.message);
  }
}
