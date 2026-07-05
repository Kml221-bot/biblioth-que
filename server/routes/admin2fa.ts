// ─── 2FA TOTP pour les administrateurs BiblioTech ─────────────────────────────
// Flux : setup → scan QR → vérifier → activé
// Le secret TOTP est stocké dans user_metadata Supabase (pas de migration DB).

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { generateSecret, generateSync, verifySync } from "otplib";
import QRCode from "qrcode";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();
const APP_NAME = "BiblioTech Admin";

// ─── Helpers TOTP ─────────────────────────────────────────────────────────────

function buildOtpAuthUrl(email: string, secret: string): string {
  const label   = encodeURIComponent(`${APP_NAME}:${email}`);
  const issuer  = encodeURIComponent(APP_NAME);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

function verifyTotp(token: string, secret: string): boolean {
  const result = verifySync({ token, secret } as Parameters<typeof verifySync>[0]);
  return typeof result === "object" && result !== null
    ? (result as { valid: boolean }).valid
    : Boolean(result);
}

// ─── Auth middleware ───────────────────────────────────────────────────────────
interface AdminRequest extends Request {
  admin?: { id: string; email: string; role: string };
}

async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const match  = header.match(/^Bearer\s+(.+)$/i);
  const token  = match?.[1];

  if (!token) { res.status(401).json({ error: "AUTH_REQUIRED" }); return; }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) { res.status(401).json({ error: "AUTH_INVALID" }); return; }

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("id,email,role").eq("id", data.user.id).single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    res.status(403).json({ error: "FORBIDDEN" }); return;
  }

  req.admin = { id: profile.id, email: profile.email, role: profile.role };
  next();
}

// ─── GET /api/admin/2fa/status ─────────────────────────────────────────────────
router.get("/status", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(req.admin!.id);
    const isEnabled = !!(authUser.user?.user_metadata?.totp_enabled);
    res.json({ enabled: isEnabled });
  } catch { res.status(500).json({ error: "STATUS_FAILED" }); }
});

// ─── POST /api/admin/2fa/setup ─────────────────────────────────────────────────
// Génère un secret TOTP + QR code à scanner. Le secret est mis en attente
// dans user_metadata et ne sera activé qu'après /verify-setup.
router.post("/setup", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const admin  = req.admin!;
    const secret = generateSecret();
    const otpAuthUrl  = buildOtpAuthUrl(admin.email, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    await supabaseAdmin.auth.admin.updateUserById(admin.id, {
      user_metadata: { totp_secret_pending: secret, totp_enabled: false },
    });

    res.json({ secret, qrCode: qrCodeDataUrl, otpAuthUrl });
  } catch { res.status(500).json({ error: "SETUP_FAILED" }); }
});

// ─── POST /api/admin/2fa/verify-setup ─────────────────────────────────────────
router.post("/verify-setup", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code || !/^\d{6}$/.test(code.trim())) {
      res.status(400).json({ error: "INVALID_CODE", message: "Code à 6 chiffres requis." }); return;
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(req.admin!.id);
    const pendingSecret = authUser.user?.user_metadata?.totp_secret_pending as string | undefined;
    if (!pendingSecret) {
      res.status(400).json({ error: "NO_PENDING_SETUP", message: "Lance /setup d'abord." }); return;
    }

    if (!verifyTotp(code.trim(), pendingSecret)) {
      res.status(401).json({ error: "CODE_INVALID", message: "Code incorrect. Réessaie." }); return;
    }

    await supabaseAdmin.auth.admin.updateUserById(req.admin!.id, {
      user_metadata: {
        totp_secret: pendingSecret,
        totp_secret_pending: null,
        totp_enabled: true,
        totp_activated_at: new Date().toISOString(),
      },
    });

    res.json({ success: true, message: "2FA activé avec succès !" });
  } catch { res.status(500).json({ error: "VERIFY_SETUP_FAILED" }); }
});

// ─── POST /api/admin/2fa/verify ───────────────────────────────────────────────
// Vérifie un code TOTP pour une action sensible.
router.post("/verify", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code || !/^\d{6}$/.test(code.trim())) {
      res.status(400).json({ error: "INVALID_CODE", message: "Code à 6 chiffres requis." }); return;
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(req.admin!.id);
    const secret  = authUser.user?.user_metadata?.totp_secret as string | undefined;
    const enabled = authUser.user?.user_metadata?.totp_enabled as boolean | undefined;

    if (!enabled || !secret) {
      res.status(400).json({ error: "2FA_NOT_ENABLED" }); return;
    }

    if (!verifyTotp(code.trim(), secret)) {
      res.status(401).json({ error: "CODE_INVALID", message: "Code 2FA incorrect." }); return;
    }

    res.json({ success: true, verified: true });
  } catch { res.status(500).json({ error: "VERIFY_FAILED" }); }
});

// ─── DELETE /api/admin/2fa/disable ────────────────────────────────────────────
router.delete("/disable", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code || !/^\d{6}$/.test(code.trim())) {
      res.status(400).json({ error: "INVALID_CODE", message: "Code 2FA requis pour désactiver." }); return;
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(req.admin!.id);
    const secret = authUser.user?.user_metadata?.totp_secret as string | undefined;
    if (!secret) { res.status(400).json({ error: "2FA_NOT_ENABLED" }); return; }

    if (!verifyTotp(code.trim(), secret)) {
      res.status(401).json({ error: "CODE_INVALID", message: "Code incorrect." }); return;
    }

    await supabaseAdmin.auth.admin.updateUserById(req.admin!.id, {
      user_metadata: { totp_secret: null, totp_enabled: false },
    });

    res.json({ success: true, message: "2FA désactivé." });
  } catch { res.status(500).json({ error: "DISABLE_FAILED" }); }
});

export default router;
