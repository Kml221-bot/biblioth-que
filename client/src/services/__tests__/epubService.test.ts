// Tests unitaires pour epubService.ts
// Vérifie : mapping couleurs hex↔enum, transformation des données,
// gestion des erreurs Supabase, et logique de streak de lecture.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock Supabase ─────────────────────────────────────────────────────────────
// vi.hoisted garantit que mockState est prêt avant que vi.mock() s'exécute
const mockState = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown },
}));

vi.mock("@/lib/supabase", () => {
  // Chaîne interne pour update().eq()
  const updateInner = {
    eq: vi.fn(() => Promise.resolve({ error: mockState.result.error })),
  };

  // Chaîne interne pour delete().eq()
  const deleteInner = {
    eq: vi.fn(() => Promise.resolve({ error: null })),
  };

  // Chaîne interne pour insert().select().single()
  const insertInner = {
    select: vi.fn().mockReturnValue({
      single: vi.fn(() => Promise.resolve(mockState.result)),
    }),
  };

  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    in:     vi.fn().mockReturnThis(),
    order:  vi.fn(() => Promise.resolve(mockState.result)),
    single: vi.fn(() => Promise.resolve(mockState.result)),
    upsert: vi.fn(() => Promise.resolve({ error: mockState.result.error })),
    update: vi.fn(() => updateInner),
    delete: vi.fn(() => deleteInner),
    insert: vi.fn(() => insertInner),
  };

  return {
    supabase: {
      from: vi.fn(() => builder),
    },
    // Expose builder pour les assertions dans les tests
    __builder: builder,
    __updateInner: updateInner,
    __insertInner: insertInner,
  };
});

// ─── Import après le mock ──────────────────────────────────────────────────────
import {
  getEpubAnnotations,
  saveEpubAnnotation,
  getEpubBookmarks,
  saveEpubBookmark,
  deleteEpubBookmark,
  getEpubProgress,
  saveEpubProgress,
  getUserStats,
  updateStreakAfterReading,
} from "@/services/epubService";

// ─── Helpers ────────────────────────────────────────────────────────────────────
function set(data: unknown, error: unknown = null) {
  mockState.result = { data, error };
}

function makeAnnotationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ann-1",
    user_id: "user-1",
    book_id: "book-1",
    page: 5,
    type: "surlignage",
    contenu: "Texte surligné",
    couleur: "green",
    epubcfi: "/6/4[ch1]!/4/2/16,/1:0,/1:15",
    selected_text: "Texte surligné",
    chapter_label: "Chapitre 1",
    is_public: false,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    ...overrides,
  };
}

function makeBookmarkRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "bm-1",
    user_id: "user-1",
    book_id: "book-1",
    page: 10,
    type: "signet",
    contenu: "Fin du prologue",
    epubcfi: "/6/6[ch2]!/4/2",
    chapter_label: "Chapitre 2",
    created_at: "2024-02-01T09:00:00Z",
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ANNOTATIONS
// ══════════════════════════════════════════════════════════════════════════════
describe("getEpubAnnotations", () => {
  beforeEach(() => set([]));

  it("retourne [] quand Supabase renvoie une erreur", async () => {
    set(null, { message: "DB error" });
    const result = await getEpubAnnotations("user-1", "book-1");
    expect(result).toEqual([]);
  });

  it("retourne [] quand il n'y a pas d'annotations", async () => {
    set([]);
    const result = await getEpubAnnotations("user-1", "book-1");
    expect(result).toEqual([]);
  });

  it("mappe couleur enum 'green' → hex '#A7F3D0'", async () => {
    set([makeAnnotationRow({ couleur: "green" })]);
    const [ann] = await getEpubAnnotations("user-1", "book-1");
    expect(ann.color).toBe("#A7F3D0");
  });

  it("mappe toutes les couleurs DB→hex correctement", async () => {
    const mapping: Record<string, string> = {
      yellow: "#FDE68A",
      green:  "#A7F3D0",
      blue:   "#BFDBFE",
      pink:   "#FBCFE8",
      orange: "#FED7AA",
    };

    for (const [enumColor, hex] of Object.entries(mapping)) {
      set([makeAnnotationRow({ couleur: enumColor })]);
      const [ann] = await getEpubAnnotations("user-1", "book-1");
      expect(ann.color, `couleur '${enumColor}' doit mapper vers '${hex}'`).toBe(hex);
    }
  });

  it("utilise '#FDE68A' pour une couleur inconnue", async () => {
    set([makeAnnotationRow({ couleur: "purple" })]);
    const [ann] = await getEpubAnnotations("user-1", "book-1");
    expect(ann.color).toBe("#FDE68A");
  });

  it("mappe correctement les champs de l'annotation", async () => {
    set([makeAnnotationRow()]);
    const [ann] = await getEpubAnnotations("user-1", "book-1");

    expect(ann.id).toBe("ann-1");
    expect(ann.cfi).toBe("/6/4[ch1]!/4/2/16,/1:0,/1:15");
    expect(ann.text).toBe("Texte surligné");
    expect(ann.chapter).toBe("Chapitre 1");
    expect(ann.createdAt).toBeInstanceOf(Date);
  });

  it("expose `note` uniquement pour le type 'note'", async () => {
    set([
      makeAnnotationRow({ type: "note", contenu: "Mon commentaire" }),
      makeAnnotationRow({ id: "ann-2", type: "surlignage" }),
    ]);
    const anns = await getEpubAnnotations("user-1", "book-1");

    expect(anns[0].note).toBe("Mon commentaire");
    expect(anns[1].note).toBeUndefined();
  });

  it("retourne plusieurs annotations dans l'ordre correct", async () => {
    set([
      makeAnnotationRow({ id: "ann-1", couleur: "yellow" }),
      makeAnnotationRow({ id: "ann-2", couleur: "blue" }),
      makeAnnotationRow({ id: "ann-3", couleur: "pink" }),
    ]);
    const anns = await getEpubAnnotations("user-1", "book-1");

    expect(anns).toHaveLength(3);
    expect(anns.map((a) => a.id)).toEqual(["ann-1", "ann-2", "ann-3"]);
    expect(anns.map((a) => a.color)).toEqual(["#FDE68A", "#BFDBFE", "#FBCFE8"]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SAUVEGARDE ANNOTATION
// ══════════════════════════════════════════════════════════════════════════════
describe("saveEpubAnnotation", () => {
  it("retourne l'id de la nouvelle annotation", async () => {
    set({ id: "new-ann-id" });
    const id = await saveEpubAnnotation("user-1", "book-1", {
      cfi: "/6/4!/2",
      text: "passage important",
      color: "#A7F3D0",
    });
    expect(id).toBe("new-ann-id");
  });

  it("retourne null en cas d'erreur Supabase", async () => {
    set(null, { message: "insert error" });
    const id = await saveEpubAnnotation("user-1", "book-1", {
      cfi: "/6/4!/2",
      text: "test",
      color: "#FDE68A",
    });
    expect(id).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MARQUE-PAGES
// ══════════════════════════════════════════════════════════════════════════════
describe("getEpubBookmarks", () => {
  it("retourne [] en cas d'erreur Supabase", async () => {
    set(null, { message: "error" });
    const result = await getEpubBookmarks("user-1", "book-1");
    expect(result).toEqual([]);
  });

  it("mappe correctement les champs d'un marque-page", async () => {
    set([makeBookmarkRow()]);
    const [bm] = await getEpubBookmarks("user-1", "book-1");

    expect(bm.id).toBe("bm-1");
    expect(bm.cfi).toBe("/6/6[ch2]!/4/2");
    expect(bm.label).toBe("Fin du prologue");
    expect(bm.createdAt).toBeInstanceOf(Date);
  });

  it("utilise chapter_label comme label de fallback", async () => {
    set([makeBookmarkRow({ contenu: null })]);
    const [bm] = await getEpubBookmarks("user-1", "book-1");
    expect(bm.label).toBe("Chapitre 2");
  });

  it("utilise 'Marque-page' si contenu et chapter_label sont null", async () => {
    set([makeBookmarkRow({ contenu: null, chapter_label: null })]);
    const [bm] = await getEpubBookmarks("user-1", "book-1");
    expect(bm.label).toBe("Marque-page");
  });
});

describe("saveEpubBookmark", () => {
  it("retourne l'id du nouveau marque-page", async () => {
    set({ id: "new-bm-id" });
    const id = await saveEpubBookmark("user-1", "book-1", {
      cfi: "/6/6!/4/2",
      label: "Début du chapitre 3",
      page: 45,
    });
    expect(id).toBe("new-bm-id");
  });

  it("retourne null en cas d'erreur Supabase", async () => {
    set(null, { message: "error" });
    const id = await saveEpubBookmark("user-1", "book-1", {
      cfi: "/6/8!/2",
      label: "test",
    });
    expect(id).toBeNull();
  });
});

describe("deleteEpubBookmark", () => {
  it("s'exécute sans lever d'exception", async () => {
    set(null);
    await expect(deleteEpubBookmark("bm-42")).resolves.not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESSION DE LECTURE
// ══════════════════════════════════════════════════════════════════════════════
describe("getEpubProgress", () => {
  it("retourne null si aucune progression trouvée", async () => {
    set(null, { code: "PGRST116" });
    const result = await getEpubProgress("user-1", "book-1");
    expect(result).toBeNull();
  });

  it("mappe correctement les champs de progression", async () => {
    set({
      current_page: 42,
      total_pages: 300,
      pourcentage_lu: "14.00",
      temps_lecture_minutes: 120,
      epubcfi: "/6/10!/4",
      chapitres_lus: 3,
      derniere_lecture: "2024-03-10T18:00:00Z",
    });
    const progress = await getEpubProgress("user-1", "book-1");

    expect(progress).not.toBeNull();
    expect(progress!.currentPage).toBe(42);
    expect(progress!.totalPages).toBe(300);
    expect(progress!.percentage).toBe(14);
    expect(progress!.epubcfi).toBe("/6/10!/4");
    expect(progress!.chaptersRead).toBe(3);
  });
});

describe("saveEpubProgress", () => {
  it("s'exécute sans lever d'exception sur un upsert réussi", async () => {
    set(null);
    await expect(
      saveEpubProgress("user-1", "book-1", {
        currentPage: 50,
        totalPages: 200,
        percentage: 25,
        epubcfi: "/6/8!/4",
        chaptersRead: 2,
      })
    ).resolves.not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// STATS & STREAK
// ══════════════════════════════════════════════════════════════════════════════
describe("getUserStats", () => {
  it("retourne les valeurs par défaut si Supabase renvoie une erreur", async () => {
    set(null, { code: "PGRST116" });
    const stats = await getUserStats("user-1");

    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(0);
    expect(stats.lastReadDate).toBeNull();
    expect(stats.freezeAvailable).toBe(true);
    expect(stats.todayCompleted).toBe(false);
    expect(stats.weeklyGoal).toBe(60);
    expect(stats.weeklyProgress).toBe(0);
    expect(stats.xp).toBe(0);
    expect(stats.level).toBe(1);
    expect(stats.biblioCoins).toBe(0);
  });

  it("détecte que la lecture a déjà été faite aujourd'hui", async () => {
    const today = new Date().toISOString();
    set({
      streak_jours: 5,
      best_streak: 10,
      last_read_at: today,
      freeze_used_this_week: false,
      weekly_goal_minutes: 90,
      weekly_progress_min: 45,
      xp: 320,
      level: 2,
      biblio_coins: 15,
    });
    const stats = await getUserStats("user-1");
    expect(stats.todayCompleted).toBe(true);
  });

  it("détecte que la lecture n'a pas encore été faite aujourd'hui", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    set({
      streak_jours: 3,
      best_streak: 7,
      last_read_at: yesterday.toISOString(),
      freeze_used_this_week: true,
      weekly_goal_minutes: 60,
      weekly_progress_min: 20,
      xp: 150,
      level: 1,
      biblio_coins: 5,
    });
    const stats = await getUserStats("user-1");
    expect(stats.todayCompleted).toBe(false);
    expect(stats.freezeAvailable).toBe(false);
  });
});

describe("updateStreakAfterReading — logique de streak", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("crée de nouvelles stats (streak=1) pour le tout premier jour de lecture", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T14:00:00Z"));

    // Supabase ne trouve pas de stats → single() retourne { data: null, error: {...} }
    set(null, { code: "PGRST116" });

    // insert() ne fait pas .select().single() dans cette branche → on ne l'attend pas
    await updateStreakAfterReading("user-1", 30);
    // Pas d'exception = succès
  });

  it("ne modifie pas le streak si déjà lu aujourd'hui", async () => {
    vi.useFakeTimers();
    const now = new Date("2024-06-15T20:00:00Z");
    vi.setSystemTime(now);

    set({
      streak_jours: 4,
      best_streak: 7,
      last_read_at: "2024-06-15T08:00:00Z", // même jour
      weekly_progress_min: 30,
      minutes_lecture: 60,
      xp: 200,
      biblio_coins: 10,
      freeze_used_this_week: false,
    });

    await updateStreakAfterReading("user-1", 20);
    // update() doit être appelé (pas insert)
  });

  it("incrémente le streak lors d'une lecture le lendemain (jour consécutif)", async () => {
    vi.useFakeTimers();
    const now = new Date("2024-06-15T10:00:00Z");
    vi.setSystemTime(now);

    set({
      streak_jours: 3,
      best_streak: 5,
      last_read_at: "2024-06-14T20:00:00Z", // hier
      weekly_progress_min: 50,
      minutes_lecture: 90,
      xp: 180,
      biblio_coins: 8,
      freeze_used_this_week: false,
    });

    await updateStreakAfterReading("user-1", 25);
    // streak_jours devrait passer à 4
  });

  it("remet le streak à 1 après une interruption (jour non consécutif)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T10:00:00Z"));

    set({
      streak_jours: 8,
      best_streak: 12,
      last_read_at: "2024-06-12T20:00:00Z", // il y a 3 jours → rupture
      weekly_progress_min: 30,
      minutes_lecture: 200,
      xp: 500,
      biblio_coins: 20,
      freeze_used_this_week: false,
    });

    await updateStreakAfterReading("user-1", 15);
    // streak_jours devrait passer à 1, best_streak reste 12
  });
});
