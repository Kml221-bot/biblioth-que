import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { validate, uuidParams, noteBodySchema } from "../lib/validate.js";

const router = Router();

type NoteType = "note" | "surlignage" | "signet" | "question";
type NoteColor = "jaune" | "vert" | "orange" | "violet" | "bleu";

interface AuthContext {
  id: string;
  email: string;
  role: string;
}

interface NotesRequest extends Request {
  authUser?: AuthContext;
}

const ALLOWED_TYPES = new Set<NoteType>(["note", "surlignage", "signet", "question"]);
const ALLOWED_COLORS = new Set<NoteColor>(["jaune", "vert", "orange", "violet", "bleu"]);

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function requiredString(value: unknown): string {
  return String(value || "").trim();
}

function parsePage(value: unknown): number {
  const page = Number(value);
  return Number.isFinite(page) ? Math.max(1, Math.round(page)) : 1;
}

function parseNoteType(value: unknown): NoteType {
  const type = String(value || "note").trim() as NoteType;
  return ALLOWED_TYPES.has(type) ? type : "note";
}

function parseColor(value: unknown): NoteColor {
  const color = String(value || "jaune").trim() as NoteColor;
  return ALLOWED_COLORS.has(color) ? color : "jaune";
}

async function requireAuth(req: NotesRequest, res: Response, next: NextFunction) {
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

async function isCommunityMember(userId: string, communityId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("community_members")
    .select("id")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();

  return !error && !!data;
}

function enrichNote(row: any) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    ...row,
    user: profile
      ? {
          id: row.user_id,
          email: profile.email,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email,
          avatar_url: profile.avatar_url || null,
        }
      : null,
    profiles: undefined,
  };
}

router.post("/", requireAuth, validate("body", noteBodySchema), async (req: NotesRequest, res) => {
  try {
    const user = req.authUser!;
    const bookId = requiredString(req.body.book_id || req.body.bookId);
    const contenu = requiredString(req.body.contenu || req.body.content);
    const sharedCommunityId = requiredString(req.body.shared_with_community_id || req.body.communityId) || null;

    if (!bookId) {
      res.status(400).json({ error: "BOOK_REQUIRED", message: "Livre obligatoire." });
      return;
    }

    if (!contenu && parseNoteType(req.body.type) !== "signet") {
      res.status(400).json({ error: "CONTENT_REQUIRED", message: "Contenu obligatoire pour cette annotation." });
      return;
    }

    if (sharedCommunityId && !(await isCommunityMember(user.id, sharedCommunityId))) {
      res.status(403).json({ error: "COMMUNITY_FORBIDDEN", message: "Vous n'etes pas membre de cette communaute." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("book_notes")
      .insert({
        user_id: user.id,
        book_id: bookId,
        page: parsePage(req.body.page),
        contenu,
        type: parseNoteType(req.body.type),
        couleur: parseColor(req.body.couleur || req.body.color),
        shared_with_community_id: sharedCommunityId,
      })
      .select("*")
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (error) {
    console.error("Erreur creation note:", error);
    res.status(500).json({ error: "NOTE_CREATE_FAILED", message: "Impossible de creer l'annotation." });
  }
});

router.get("/:bookId", requireAuth, validate("params", uuidParams("bookId")), async (req: NotesRequest, res) => {
  try {
    const user = req.authUser!;
    const bookId = req.params.bookId;

    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("community_members")
      .select("community_id")
      .eq("user_id", user.id);
    if (membershipError) throw membershipError;

    const communityIds = (memberships || []).map(row => row.community_id);
    const clauses = [`user_id.eq.${user.id}`];
    if (communityIds.length > 0) {
      clauses.push(`shared_with_community_id.in.(${communityIds.join(",")})`);
    }

    const { data, error } = await supabaseAdmin
      .from("book_notes")
      .select("*,profiles:user_id(id,email,first_name,last_name,avatar_url)")
      .eq("book_id", bookId)
      .or(clauses.join(","))
      .order("page", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = (data || []).map(enrichNote);
    res.json({
      data: rows,
      own: rows.filter(row => row.user_id === user.id),
      shared: rows.filter(row => row.user_id !== user.id),
    });
  } catch (error) {
    console.error("Erreur lecture notes:", error);
    res.status(500).json({ error: "NOTES_FETCH_FAILED", message: "Impossible de charger les annotations." });
  }
});

router.get("/community/:communityId/:bookId", requireAuth, validate("params", uuidParams("communityId", "bookId")), async (req: NotesRequest, res) => {
  try {
    const user = req.authUser!;
    const { communityId, bookId } = req.params;

    if (!(await isCommunityMember(user.id, communityId))) {
      res.status(403).json({ error: "COMMUNITY_FORBIDDEN", message: "Vous n'etes pas membre de cette communaute." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("book_notes")
      .select("*,profiles:user_id(id,email,first_name,last_name,avatar_url)")
      .eq("book_id", bookId)
      .eq("shared_with_community_id", communityId)
      .order("page", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json({
      communityId,
      bookId,
      data: (data || []).map(enrichNote),
    });
  } catch (error) {
    console.error("Erreur notes communaute:", error);
    res.status(500).json({ error: "COMMUNITY_NOTES_FETCH_FAILED", message: "Impossible de charger les annotations collaboratives." });
  }
});

router.delete("/:noteId", requireAuth, validate("params", uuidParams("noteId")), async (req: NotesRequest, res) => {
  try {
    const user = req.authUser!;
    const noteId = req.params.noteId;

    const { data: note, error: fetchError } = await supabaseAdmin
      .from("book_notes")
      .select("id,user_id")
      .eq("id", noteId)
      .single();

    if (fetchError || !note) {
      res.status(404).json({ error: "NOTE_NOT_FOUND", message: "Annotation introuvable." });
      return;
    }

    if (note.user_id !== user.id && !["admin", "super_admin"].includes(user.role)) {
      res.status(403).json({ error: "NOTE_FORBIDDEN", message: "Vous ne pouvez supprimer que vos annotations." });
      return;
    }

    const { error } = await supabaseAdmin.from("book_notes").delete().eq("id", noteId);
    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error("Erreur suppression note:", error);
    res.status(500).json({ error: "NOTE_DELETE_FAILED", message: "Impossible de supprimer l'annotation." });
  }
});

export default router;
