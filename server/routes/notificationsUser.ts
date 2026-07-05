// ─── API Notifications in-app — BiblioTech ────────────────────────────────────
// Routes accessibles à l'utilisateur authentifié :
//   GET    /api/notifications          → liste (canal in_app)
//   PATCH  /api/notifications/:id/read → marquer lu
//   POST   /api/notifications/read-all → tout marquer lu
//   DELETE /api/notifications/:id      → supprimer

import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

// ─── Auth middleware ───────────────────────────────────────────────────────────
interface AuthRequest extends Request {
  authUser?: { id: string; email: string };
}

async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const match  = header.match(/^Bearer\s+(.+)$/i);
  const token  = match?.[1];
  if (!token) { res.status(401).json({ error: "AUTH_REQUIRED" }); return; }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) { res.status(401).json({ error: "AUTH_INVALID" }); return; }

  req.authUser = { id: data.user.id, email: data.user.email || "" };
  next();
}

// ─── GET /api/notifications ────────────────────────────────────────────────────
// Retourne les 50 dernières notifications in-app de l'utilisateur.
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authUser!.id;

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("id, title, body, metadata, sent_at, created_at")
      .eq("user_id", userId)
      .eq("channel", "in_app")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const notifications = (data || []).map((row: {
      id: string;
      title: string | null;
      body: string;
      metadata: Record<string, unknown> | null;
      sent_at: string | null;
      created_at: string;
    }) => ({
      id:        row.id,
      title:     row.title || "Notification",
      message:   row.body,
      isRead:    !!(row.metadata?.is_read),
      type:      (row.metadata?.type as string) || "info",
      actionUrl: (row.metadata?.action_url as string) || null,
      createdAt: row.sent_at || row.created_at,
      icon:      (row.metadata?.icon as string) || null,
    }));

    res.json({ data: notifications, count: notifications.length });
  } catch (error) {
    console.error("GET /notifications:", error);
    res.status(500).json({ error: "FETCH_FAILED" });
  }
});

// ─── PATCH /api/notifications/:id/read ────────────────────────────────────────
router.patch("/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.authUser!.id;

    // Récupérer le metadata existant
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("notifications")
      .select("metadata")
      .eq("id", id)
      .eq("user_id", userId)
      .eq("channel", "in_app")
      .single();

    if (fetchErr || !row) {
      res.status(404).json({ error: "NOT_FOUND" }); return;
    }

    const updatedMeta = { ...(row.metadata as Record<string, unknown> || {}), is_read: true };

    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ metadata: updatedMeta })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("PATCH /notifications/:id/read:", error);
    res.status(500).json({ error: "UPDATE_FAILED" });
  }
});

// ─── POST /api/notifications/read-all ─────────────────────────────────────────
router.post("/read-all", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authUser!.id;

    // Récupérer toutes les notifs non lues
    const { data: rows, error: fetchErr } = await supabaseAdmin
      .from("notifications")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("channel", "in_app");

    if (fetchErr) throw fetchErr;

    // Marquer chacune comme lue (Supabase ne supporte pas jsonb_set en update de masse)
    const updates = (rows || []).map((row: { id: string; metadata: Record<string, unknown> | null }) =>
      supabaseAdmin
        .from("notifications")
        .update({ metadata: { ...(row.metadata || {}), is_read: true } })
        .eq("id", row.id)
    );

    await Promise.all(updates);
    res.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error("POST /notifications/read-all:", error);
    res.status(500).json({ error: "UPDATE_FAILED" });
  }
});

// ─── DELETE /api/notifications/:id ────────────────────────────────────────────
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.authUser!.id;

    const { error } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .eq("channel", "in_app");

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error("DELETE /notifications/:id:", error);
    res.status(500).json({ error: "DELETE_FAILED" });
  }
});

export default router;
