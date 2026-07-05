import { randomUUID } from "crypto";
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

type UploadedFileInput = {
  filename?: string;
  mimeType?: string;
  base64?: string;
  dataUrl?: string;
};

interface AuthContext {
  id: string;
  email: string;
  role: string;
}

interface AuthorContext {
  id: string;
  user_id: string;
  nom_plume: string;
  wave_number: string | null;
  solde_disponible: number;
  statut: string;
  verified: boolean;
}

interface AuthorRequest extends Request {
  authUser?: AuthContext;
  authorProfile?: AuthorContext;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function getRequiredString(value: unknown, fallback = ""): string {
  return String(value || fallback).trim();
}

function getOptionalNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "file";
}

function parseUpload(input: UploadedFileInput | undefined, fallbackName: string) {
  if (!input) return null;

  const dataUrl = input.dataUrl || "";
  const dataUrlMatch = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  const mimeType = input.mimeType || dataUrlMatch?.[1] || "application/octet-stream";
  const rawBase64 = input.base64 || dataUrlMatch?.[2] || "";
  const cleanedBase64 = rawBase64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");

  if (!cleanedBase64) return null;

  const filename = input.filename || fallbackName;
  return {
    filename,
    mimeType,
    buffer: Buffer.from(cleanedBase64, "base64"),
  };
}

function extensionFromMime(mimeType: string, fallback = "bin") {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/epub+zip": "epub",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[mimeType] || fallback;
}

async function uploadFile(bucket: string, folder: string, input: UploadedFileInput | undefined, fallbackName: string) {
  const parsed = parseUpload(input, fallbackName);
  if (!parsed) return null;

  const ext = parsed.filename.includes(".")
    ? parsed.filename.split(".").pop() || extensionFromMime(parsed.mimeType)
    : extensionFromMime(parsed.mimeType);
  const path = `${folder}/${Date.now()}-${randomUUID()}-${slugify(parsed.filename)}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, parsed.buffer, {
      contentType: parsed.mimeType,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return {
    bucket,
    path,
    url: data.publicUrl,
    mimeType: parsed.mimeType,
    size: parsed.buffer.byteLength,
  };
}

async function createAdminNotification(input: {
  type: string;
  title: string;
  message: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("admin_notifications").insert({
    type: input.type,
    title: input.title,
    message: input.message,
    target_type: input.targetType || null,
    target_id: input.targetId || null,
    metadata: input.metadata || {},
  });

  if (error) {
    console.warn("Impossible de notifier les admins:", error.message);
  }
}

async function requireAuth(req: AuthorRequest, res: Response, next: NextFunction) {
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
    .select("id,email,role,is_active")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    res.status(403).json({ error: "PROFILE_FORBIDDEN", message: "Profil inactif ou introuvable." });
    return;
  }

  req.authUser = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
  };
  next();
}

async function requireAuthor(req: AuthorRequest, res: Response, next: NextFunction) {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: "AUTH_REQUIRED", message: "Connexion obligatoire." });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("author_profiles")
    .select("id,user_id,nom_plume,wave_number,solde_disponible,statut,verified")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    res.status(403).json({ error: "AUTHOR_REQUIRED", message: "Espace auteur non active." });
    return;
  }

  if (!["pending", "approved"].includes(data.statut)) {
    res.status(403).json({ error: "AUTHOR_FORBIDDEN", message: "Profil auteur non autorise." });
    return;
  }

  req.authorProfile = data as AuthorContext;
  next();
}

async function requestNaboopayPayout(input: {
  amount: number;
  phone: string;
  authorId: string;
  withdrawalId: string;
}) {
  const baseUrl = process.env.NABOOPAY_API_URL || "https://api.naboopay.com";
  const apiKey = process.env.NABOOPAY_API_KEY;

  if (!apiKey) {
    return {
      status: "not_configured",
      reference: `manual-${input.withdrawalId}`,
      providerResponse: null,
    };
  }

  const response = await fetch(`${baseUrl}/api/v2/payouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: "XOF",
      recipient_phone: input.phone,
      description: "Retrait auteur BiblioTech",
      method_of_payment: "wave",
    }),
  });

  const providerResponse = await response.text();
  return {
    status: response.ok ? "processing" : "failed",
    reference: input.withdrawalId,
    providerStatus: response.status,
    providerResponse,
  };
}

router.post("/register", requireAuth, async (req: AuthorRequest, res) => {
  try {
    const user = req.authUser!;
    const nomPlume = getRequiredString(req.body.nom_plume || req.body.nomPlume);
    if (!nomPlume) {
      res.status(400).json({ error: "NOM_PLUME_REQUIRED", message: "Nom de plume obligatoire." });
      return;
    }

    const existing = await supabaseAdmin
      .from("author_profiles")
      .select("id,statut")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing.data) {
      res.status(409).json({ error: "AUTHOR_EXISTS", message: "Profil auteur deja cree.", data: existing.data });
      return;
    }

    const identityUpload = await uploadFile(
      "author-documents",
      user.id,
      req.body.identityDocument || req.body.identity_document,
      "piece-identite.pdf",
    );

    const { data, error } = await supabaseAdmin
      .from("author_profiles")
      .insert({
        user_id: user.id,
        nom_plume: nomPlume,
        bio: getRequiredString(req.body.bio),
        wave_number: getRequiredString(req.body.wave_number || req.body.waveNumber) || null,
        statut: "pending",
        verified: false,
        identity_document_url: identityUpload?.url || null,
        identity_document_path: identityUpload?.path || null,
      })
      .select("*")
      .single();

    if (error) throw error;

    await supabaseAdmin.from("profiles").update({ role: "author" }).eq("id", user.id);
    await createAdminNotification({
      type: "author_registration",
      title: "Nouvelle demande auteur",
      message: `${nomPlume} demande la validation de son espace auteur.`,
      targetType: "author_profile",
      targetId: data.id,
      metadata: { userId: user.id, email: user.email },
    });

    res.status(201).json({ data });
  } catch (error) {
    console.error("Erreur inscription auteur:", error);
    res.status(500).json({ error: "AUTHOR_REGISTER_FAILED", message: "Impossible de creer le profil auteur." });
  }
});

router.post("/books", requireAuth, requireAuthor, async (req: AuthorRequest, res) => {
  try {
    const user = req.authUser!;
    const author = req.authorProfile!;

    const titre = getRequiredString(req.body.titre || req.body.title);
    const categorie = getRequiredString(req.body.categorie || req.body.category);
    if (!titre || !categorie) {
      res.status(400).json({ error: "BOOK_FIELDS_REQUIRED", message: "Titre et categorie obligatoires." });
      return;
    }

    const prixAchat = getOptionalNumber(req.body.prix_achat);
    const prixLocation = getOptionalNumber(req.body.prix_location);
    const fileUpload = await uploadFile("author-books", `${author.id}/books`, req.body.file || req.body.bookFile, `${titre}.pdf`);
    const coverUpload = await uploadFile("book-covers", `${author.id}/covers`, req.body.cover || req.body.coverFile, `${titre}.jpg`);

    if (!fileUpload) {
      res.status(400).json({ error: "BOOK_FILE_REQUIRED", message: "Fichier PDF/ePub obligatoire." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("books")
      .insert({
        titre,
        auteur: getRequiredString(req.body.auteur || req.body.author, author.nom_plume),
        categorie,
        description: getRequiredString(req.body.description) || null,
        extract: getRequiredString(req.body.extract) || null,
        prix_achat: prixAchat,
        prix_location: prixLocation,
        type: prixAchat > 0 || prixLocation > 0 ? "payant" : "gratuit",
        format: fileUpload.mimeType === "application/epub+zip" ? "epub" : "pdf",
        pdf_url: fileUpload.url,
        cover_url: coverUpload?.url || null,
        status: "brouillon",
        added_by: user.id,
        author_profile_id: author.id,
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      })
      .select("*")
      .single();

    if (error) throw error;

    await createAdminNotification({
      type: "author_book_submission",
      title: "Nouveau livre auteur a valider",
      message: `${author.nom_plume} a soumis "${titre}" pour validation.`,
      targetType: "book",
      targetId: data.id,
      metadata: {
        authorProfileId: author.id,
        recommendedPurchaseRangeFcfa: [2000, 3000],
        currentPurchasePriceFcfa: prixAchat,
      },
    });

    res.status(201).json({
      data,
      pricingRecommendation: {
        achatFcfa: { min: 2000, max: 3000 },
        message: "Prix d'achat recommande selon enquete: 2000-3000 FCFA.",
      },
    });
  } catch (error) {
    console.error("Erreur soumission livre auteur:", error);
    res.status(500).json({ error: "AUTHOR_BOOK_CREATE_FAILED", message: "Impossible de soumettre ce livre." });
  }
});

router.get("/dashboard", requireAuth, requireAuthor, async (req: AuthorRequest, res) => {
  try {
    const author = req.authorProfile!;

    const [{ data: books, error: booksError }, { data: transactions, error: txError }] = await Promise.all([
      supabaseAdmin
        .from("books")
        .select("id,titre,status,prix_achat,prix_location,created_at")
        .eq("author_profile_id", author.id),
      supabaseAdmin
        .from("transactions")
        .select("id,type,montant,vendeur_recoit,created_at,book_id")
        .eq("statut", "completed")
        .in("type", ["achat", "location"]),
    ]);

    if (booksError) throw booksError;
    if (txError) throw txError;

    const bookIds = new Set((books || []).map(book => book.id));
    const bookIdList = Array.from(bookIds);
    const authorTransactions = (transactions || []).filter(tx => tx.book_id && bookIds.has(tx.book_id));
    const activeReadersRes = await supabaseAdmin
      .from("borrows")
      .select("user_id")
      .in("book_id", bookIdList)
      .in("statut", ["actif", "prolonge"]);

    const activeReaders = new Set((activeReadersRes.data || []).map(row => row.user_id)).size;
    const revenue = authorTransactions.reduce((sum, tx) => sum + Number(tx.vendeur_recoit || tx.montant || 0), 0);

    res.json({
      author,
      stats: {
        books: (books || []).length,
        publishedBooks: (books || []).filter(book => book.status === "publie").length,
        pendingBooks: (books || []).filter(book => book.status === "brouillon").length,
        sales: authorTransactions.length,
        revenueFcfa: revenue,
        activeReaders,
      },
      balance: {
        availableFcfa: author.solde_disponible,
        canWithdraw: author.solde_disponible >= 1000,
        minimumFcfa: 1000,
        provider: "Naboopay Payout vers Wave",
      },
      recentBooks: books || [],
    });
  } catch (error) {
    console.error("Erreur dashboard auteur:", error);
    res.status(500).json({ error: "AUTHOR_DASHBOARD_FAILED", message: "Impossible de charger le dashboard auteur." });
  }
});

router.post("/withdraw", requireAuth, requireAuthor, async (req: AuthorRequest, res) => {
  try {
    const user = req.authUser!;
    const author = req.authorProfile!;
    const amount = getOptionalNumber(req.body.amount || req.body.montant || author.solde_disponible);
    const waveNumber = getRequiredString(req.body.wave_number || req.body.waveNumber, author.wave_number || "");

    if (amount < 1000) {
      res.status(400).json({ error: "WITHDRAW_MINIMUM", message: "Minimum de retrait: 1000 FCFA." });
      return;
    }
    if (amount > author.solde_disponible) {
      res.status(400).json({ error: "INSUFFICIENT_BALANCE", message: "Solde auteur insuffisant." });
      return;
    }
    if (!waveNumber) {
      res.status(400).json({ error: "WAVE_NUMBER_REQUIRED", message: "Numero Wave obligatoire." });
      return;
    }

    const { data: withdrawal, error } = await supabaseAdmin
      .from("author_withdrawals")
      .insert({
        author_profile_id: author.id,
        user_id: user.id,
        montant: amount,
        provider: "naboopay",
        wave_number: waveNumber,
        statut: "pending",
      })
      .select("*")
      .single();

    if (error) throw error;

    const payout = await requestNaboopayPayout({
      amount,
      phone: waveNumber,
      authorId: author.id,
      withdrawalId: withdrawal.id,
    });

    const finalStatus = payout.status === "failed" ? "failed" : payout.status === "not_configured" ? "pending" : "processing";
    await supabaseAdmin
      .from("author_withdrawals")
      .update({
        statut: finalStatus,
        reference_externe: payout.reference,
        metadata: payout,
      })
      .eq("id", withdrawal.id);

    if (finalStatus !== "failed") {
      await supabaseAdmin
        .from("author_profiles")
        .update({ solde_disponible: author.solde_disponible - amount })
        .eq("id", author.id);
    }

    res.json({
      data: {
        ...withdrawal,
        statut: finalStatus,
        reference_externe: payout.reference,
      },
      payout,
      balance: {
        previousFcfa: author.solde_disponible,
        availableFcfa: finalStatus === "failed" ? author.solde_disponible : author.solde_disponible - amount,
      },
    });
  } catch (error) {
    console.error("Erreur retrait auteur:", error);
    res.status(500).json({ error: "AUTHOR_WITHDRAW_FAILED", message: "Impossible de traiter le retrait." });
  }
});

export default router;
