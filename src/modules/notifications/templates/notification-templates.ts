export type WhatsAppTemplate =
  | "BORROW_CONFIRMED"
  | "BORROW_REMINDER_3"
  | "BORROW_REMINDER_1"
  | "OVERDUE_WARNING"
  | "PAYMENT_SUCCESS"
  | "SELL_CONFIRMED"
  | "BADGE_UNLOCKED"
  | "SUB_EXPIRING"
  | "WEEKLY_NEWSLETTER"
  | "CHAPTER_UNLOCKED"
  | "COINS_CREDITED";

export type EmailTemplate =
  | "welcome"
  | "borrow_confirmed"
  | "payment_receipt"
  | "monthly_stats"
  | "overdue_notice"
  | "new_badge"
  | "community_invite"
  | "weekly_newsletter";

type TemplateVars = Record<string, string | number | undefined>;

export function renderWhatsAppTemplate(
  template: WhatsAppTemplate,
  vars: TemplateVars,
) {
  const titre = vars.titre ?? "ton livre";
  const jours = vars.jours ?? "";
  const montant = vars.montant ?? "";
  const nom = vars.nom ?? "";

  const templates: Record<
    WhatsAppTemplate,
    { title: string; message: string; wolof: string }
  > = {
    BORROW_CONFIRMED: {
      title: "Emprunt confirme",
      message: `Emprunt confirme : ${titre} pendant ${jours}j`,
      wolof: `Sa emprunt bi leer na : ${titre}, ${jours} fan.`,
    },
    BORROW_REMINDER_3: {
      title: "Rappel emprunt",
      message: `${titre} expire dans 3 jours`,
      wolof: `${titre} dina jeex ci 3 fan.`,
    },
    BORROW_REMINDER_1: {
      title: "Retour demain",
      message: `${titre} doit etre retourne demain !`,
      wolof: `${titre} war nga ko delloo suba.`,
    },
    OVERDUE_WARNING: {
      title: "Retard emprunt",
      message: `Retard ${jours}j - Amende ${montant}F`,
      wolof: `Yagg na ${jours} fan - Amende ${montant}F.`,
    },
    PAYMENT_SUCCESS: {
      title: "Paiement recu",
      message: `Paiement Wave recu : ${montant}F`,
      wolof: `Fey bi ci Wave jot na : ${montant}F.`,
    },
    SELL_CONFIRMED: {
      title: "Livre vendu",
      message: `Ton livre est vendu ! Tu recois ${montant}F`,
      wolof: `Sa teere bi jaay na ! Dinga jot ${montant}F.`,
    },
    BADGE_UNLOCKED: {
      title: "Badge debloque",
      message: `Badge debloque : ${nom}`,
      wolof: `Badge bi ubbeeku na : ${nom}.`,
    },
    SUB_EXPIRING: {
      title: "Abonnement bientot expire",
      message: `Abonnement expire dans 3j`,
      wolof: `Sa abonnement dina jeex ci 3 fan.`,
    },
    WEEKLY_NEWSLETTER: {
      title: "Selection de la semaine",
      message: `📚 La Selection BiblioTech de la semaine : ${titre}`,
      wolof: `📚 Tannal BiblioTech bi ci ayu bi : ${titre}`,
    },
    CHAPTER_UNLOCKED: {
      title: "Chapitre debloque",
      message: `🔓 Chapitre debloque : "${titre}" — Bonne lecture !`,
      wolof: `🔓 Chapitre bi ubbeku na : "${titre}" — Jangal jëm !`,
    },
    COINS_CREDITED: {
      title: "BiblioCoins credites",
      message: `🪙 ${vars.coins ?? ""} BiblioCoins credites sur ton compte BiblioTech (${montant}F via Wave/Orange Money)`,
      wolof: `🪙 ${vars.coins ?? ""} BiblioCoins thies na ci sa kont (${montant}F ci Wave/Orange Money)`,
    },
  };

  return templates[template];
}

export function renderEmailTemplate(
  template: EmailTemplate,
  data: TemplateVars,
) {
  const title = String(data.title ?? emailTemplateTitles[template]);
  const body = String(data.message ?? title);

  return {
    subject: title,
    html: `<main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></main>`,
  };
}

const emailTemplateTitles: Record<EmailTemplate, string> = {
  welcome: "Bienvenue sur BiblioTech",
  borrow_confirmed: "Emprunt confirme",
  payment_receipt: "Recu de paiement BiblioTech",
  monthly_stats: "Tes statistiques du mois",
  overdue_notice: "Avis de retard",
  new_badge: "Nouveau badge debloque",
  community_invite: "Invitation communaute",
  weekly_newsletter: "La Selection BiblioTech de la semaine",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
