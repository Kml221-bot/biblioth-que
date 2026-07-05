import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { z, ZodError } from "zod";
import { fail } from "./apiResponse.js";

type Target = "body" | "query" | "params";

export function validate(target: Target, schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req[target] = schema.parse(req[target]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        fail(res, "VALIDATION_ERROR", "Entrée invalide.", 400, error.issues);
        return;
      }
      next(error);
    }
  };
}

// ─── Schemas réutilisables ────────────────────────────────────────────────────

const UUID_MSG = "doit être un UUID valide";

/** Valide un ou plusieurs paramètres de route comme UUID v4. */
export function uuidParams(...names: string[]) {
  const shape = Object.fromEntries(
    names.map((n) => [n, z.string().uuid(`${n} ${UUID_MSG}`)])
  );
  return z.object(shape as Record<string, z.ZodString>).passthrough();
}

/** Body du chat : message requis, historique optionnel. */
export const chatBodySchema = z.object({
  message: z.string().min(1, "Message requis").max(2000, "Message trop long"),
  book_context_id: z.string().uuid().optional().nullable(),
  bookContextId:   z.string().uuid().optional().nullable(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(4000),
      })
    )
    .max(20)
    .optional(),
}).passthrough();

/** Body d'une note / annotation. */
export const noteBodySchema = z.object({
  book_id:  z.string().uuid().optional(),
  bookId:   z.string().uuid().optional(),
  contenu:  z.string().max(8000).optional().nullable(),
  content:  z.string().max(8000).optional().nullable(),
  type: z.enum(["note", "surlignage", "signet", "question"]).optional(),
  couleur:  z.string().max(20).optional(),
  color:    z.string().max(20).optional(),
  page:     z.coerce.number().int().min(0).optional(),
  shared_with_community_id: z.string().uuid().optional().nullable(),
  communityId:              z.string().uuid().optional().nullable(),
  epubcfi:       z.string().max(400).optional().nullable(),
  selected_text: z.string().max(2000).optional().nullable(),
  chapter_label: z.string().max(200).optional().nullable(),
}).passthrough();

/** Body d'une review de livre (note 1-5 + commentaire optionnel). */
export const reviewBodySchema = z.object({
  note: z.coerce.number().int().min(1).max(5),
  commentaire: z.string().max(1200).optional().nullable(),
}).passthrough();
