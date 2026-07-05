// @vitest-environment jsdom
//
// Tests unitaires pour badgeSystem.ts
// Vérifie : niveaux, badges, XP, détection des retards, profil complet

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  computeGamificationFromActivity,
  LEVELS,
} from "@/services/badgeSystem";
import type { BorrowedBook, HistoryItem } from "@/services/borrowStore";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function makeBorrow(overrides: Partial<BorrowedBook> = {}): BorrowedBook {
  return {
    id: "book-1",
    title: "Test Book",
    author: "Author",
    cover: "",
    category: "Informatique",
    borrowDate: "2024-01-01",
    dueDate: "2024-01-31",
    renewCount: 0,
    maxRenews: 3,
    ...overrides,
  };
}

function makeHistory(overrides: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: Date.now() + Math.random(),
    title: "Test Book",
    author: "Author",
    cover: "",
    category: "Informatique",
    borrowDate: "2024-01-01",
    returnDate: "2024-01-20",
    daysKept: 19,
    status: "returned",
    ...overrides,
  };
}

function makeHistories(count: number, categoryFn?: (i: number) => string): HistoryItem[] {
  return Array.from({ length: count }, (_, i) =>
    makeHistory({ id: i + 1, category: categoryFn ? categoryFn(i) : "Informatique" })
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

// ══════════════════════════════════════════════════════════════════════════════
// LEVELS — table de définition
// ══════════════════════════════════════════════════════════════════════════════
describe("LEVELS", () => {
  it("contient 6 niveaux", () => {
    expect(LEVELS).toHaveLength(6);
  });

  it("les niveaux sont consécutifs (1 à 6)", () => {
    LEVELS.forEach((l, i) => expect(l.level).toBe(i + 1));
  });

  it("le dernier niveau a un maxBooks très grand (couvre tout)", () => {
    expect(LEVELS[5].maxBooks).toBeGreaterThan(100);
  });

  it("les plages de livres ne se chevauchent pas", () => {
    for (let i = 0; i < LEVELS.length - 1; i++) {
      expect(LEVELS[i].maxBooks).toBeLessThan(LEVELS[i + 1].minBooks);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// NIVEAUX — détermination selon le total de livres
// ══════════════════════════════════════════════════════════════════════════════
describe("computeGamificationFromActivity — niveaux", () => {
  const cases: [number, number, string][] = [
    [0,  1, "Lecteur Novice"],
    [1,  1, "Lecteur Novice"],
    [2,  2, "Lecteur Curieux"],
    [5,  2, "Lecteur Curieux"],
    [6,  3, "Lecteur Assidu"],
    [10, 3, "Lecteur Assidu"],
    [11, 4, "Lecteur Expert"],
    [20, 4, "Lecteur Expert"],
    [21, 5, "Grand Lecteur"],
    [50, 5, "Grand Lecteur"],
    [51, 6, "Légende BiblioTech"],
    [99, 6, "Légende BiblioTech"],
  ];

  cases.forEach(([books, expectedLevel, expectedName]) => {
    it(`${books} livre(s) → level ${expectedLevel} (${expectedName})`, () => {
      const history = makeHistories(books);
      const data = computeGamificationFromActivity([], history);
      expect(data.currentLevel.level).toBe(expectedLevel);
      expect(data.currentLevel.name).toBe(expectedName);
    });
  });

  it("nextLevel est null au level 6 (niveau maximum)", () => {
    const data = computeGamificationFromActivity([], makeHistories(60));
    expect(data.nextLevel).toBeNull();
  });

  it("nextLevel existe pour les levels 1 à 5", () => {
    for (const count of [0, 2, 6, 11, 21]) {
      const data = computeGamificationFromActivity([], makeHistories(count));
      expect(data.nextLevel, `${count} livres devrait avoir un nextLevel`).not.toBeNull();
    }
  });

  it("progressToNext = 100 au niveau maximum", () => {
    const data = computeGamificationFromActivity([], makeHistories(60));
    expect(data.progressToNext).toBe(100);
  });

  it("progressToNext croît avec le nombre de livres dans un niveau", () => {
    // Dans le level 2 (2–5 livres), 2 livres = début, 5 livres = presque fin
    const data2 = computeGamificationFromActivity([], makeHistories(2));
    const data5 = computeGamificationFromActivity([], makeHistories(5));
    expect(data5.progressToNext).toBeGreaterThan(data2.progressToNext);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BADGES — déverrouillage
// ══════════════════════════════════════════════════════════════════════════════
describe("computeGamificationFromActivity — badges", () => {
  function getBadge(id: string, active: BorrowedBook[], history: HistoryItem[]) {
    const data = computeGamificationFromActivity(active, history);
    return data.badges.find((b) => b.id === id)!;
  }

  // ── Badges de lecture par volume ──────────────────────────────────────────
  describe("badge 'premier-pas' (1 emprunt)", () => {
    it("verrouillé à 0 emprunt", () => {
      expect(getBadge("premier-pas", [], []).unlocked).toBe(false);
    });
    it("déverrouillé à 1 emprunt", () => {
      expect(getBadge("premier-pas", [], [makeHistory()]).unlocked).toBe(true);
    });
    it("progression 0% à 0 emprunt", () => {
      expect(getBadge("premier-pas", [], []).progress).toBe(0);
    });
    it("progression 100% à 1+ emprunt", () => {
      expect(getBadge("premier-pas", [], [makeHistory()]).progress).toBe(100);
    });
  });

  describe("badge 'boulimique' (5 emprunts)", () => {
    it("verrouillé à 4 emprunts", () => {
      expect(getBadge("boulimique", [], makeHistories(4)).unlocked).toBe(false);
    });
    it("déverrouillé à 5 emprunts", () => {
      expect(getBadge("boulimique", [], makeHistories(5)).unlocked).toBe(true);
    });
    it("progression 60% à 3 emprunts", () => {
      expect(getBadge("boulimique", [], makeHistories(3)).progress).toBe(60);
    });
  });

  describe("badge 'erudit' (10 emprunts)", () => {
    it("verrouillé à 9 emprunts", () => {
      expect(getBadge("erudit", [], makeHistories(9)).unlocked).toBe(false);
    });
    it("déverrouillé à 10 emprunts", () => {
      expect(getBadge("erudit", [], makeHistories(10)).unlocked).toBe(true);
    });
  });

  describe("badge 'legende' (20 emprunts)", () => {
    it("déverrouillé à 20 emprunts", () => {
      expect(getBadge("legende", [], makeHistories(20)).unlocked).toBe(true);
    });
    it("verrouillé à 19 emprunts", () => {
      expect(getBadge("legende", [], makeHistories(19)).unlocked).toBe(false);
    });
  });

  // ── Badges culturels ──────────────────────────────────────────────────────
  describe("badge 'africaniste' (1 livre africain)", () => {
    it("déverrouillé avec un livre de catégorie 'Littérature Africaine'", () => {
      const b = getBadge("africaniste", [], [makeHistory({ category: "Littérature Africaine" })]);
      expect(b.unlocked).toBe(true);
    });
    it("déverrouillé avec un livre dont l'id commence par 'af-'", () => {
      const b = getBadge("africaniste", [], [makeHistory({ id: "af-001" })]);
      expect(b.unlocked).toBe(true);
    });
    it("verrouillé si aucun livre africain", () => {
      expect(getBadge("africaniste", [], makeHistories(5)).unlocked).toBe(false);
    });
  });

  describe("badge 'otaku' (1 manga/BD)", () => {
    it("déverrouillé avec un livre de catégorie 'Manga & BD'", () => {
      const b = getBadge("otaku", [], [makeHistory({ category: "Manga & BD" })]);
      expect(b.unlocked).toBe(true);
    });
    it("déverrouillé avec un livre dont l'id commence par 'mg-'", () => {
      const b = getBadge("otaku", [], [makeHistory({ id: "mg-001" })]);
      expect(b.unlocked).toBe(true);
    });
    it("verrouillé si aucun manga", () => {
      expect(getBadge("otaku", [], makeHistories(3)).unlocked).toBe(false);
    });
  });

  describe("badge 'explorateur' (3 catégories différentes)", () => {
    it("verrouillé avec 2 catégories", () => {
      const h = [
        makeHistory({ id: 1, category: "Informatique" }),
        makeHistory({ id: 2, category: "Art" }),
      ];
      expect(getBadge("explorateur", [], h).unlocked).toBe(false);
    });
    it("déverrouillé avec 3 catégories distinctes", () => {
      const h = [
        makeHistory({ id: 1, category: "Informatique" }),
        makeHistory({ id: 2, category: "Art" }),
        makeHistory({ id: 3, category: "Sciences" }),
      ];
      expect(getBadge("explorateur", [], h).unlocked).toBe(true);
    });
    it("les catégories dupliquées ne comptent qu'une fois", () => {
      const h = [
        makeHistory({ id: 1, category: "Informatique" }),
        makeHistory({ id: 2, category: "Informatique" }),
        makeHistory({ id: 3, category: "Art" }),
      ];
      // Seulement 2 catégories distinctes → non déverrouillé
      expect(getBadge("explorateur", [], h).unlocked).toBe(false);
    });
  });

  // ── Badges de ponctualité ─────────────────────────────────────────────────
  describe("badge 'ponctuel' (aucun retard)", () => {
    it("verrouillé si aucun emprunt", () => {
      expect(getBadge("ponctuel", [], []).unlocked).toBe(false);
    });

    it("déverrouillé si au moins 1 emprunt et aucun retard", () => {
      // dueDate dans le futur = pas de retard
      const active = [makeBorrow({ dueDate: "2099-01-01" })];
      const badge = getBadge("ponctuel", active, []);
      expect(badge.unlocked).toBe(true);
    });

    it("verrouillé si un emprunt actif est en retard", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
      const active = [makeBorrow({ dueDate: "2024-06-01" })]; // date passée
      const badge = getBadge("ponctuel", active, []);
      expect(badge.unlocked).toBe(false);
      vi.useRealTimers();
    });
  });

  // ── Badges de collection ──────────────────────────────────────────────────
  describe("badge 'actif' (1 emprunt en cours)", () => {
    it("verrouillé sans emprunt actif", () => {
      expect(getBadge("actif", [], []).unlocked).toBe(false);
    });
    it("déverrouillé avec 1 emprunt actif", () => {
      expect(getBadge("actif", [makeBorrow()], []).unlocked).toBe(true);
    });
  });

  describe("badge 'collectionneur' (3 emprunts actifs)", () => {
    it("verrouillé avec 2 emprunts actifs", () => {
      const active = [makeBorrow(), makeBorrow({ id: "b2" })];
      expect(getBadge("collectionneur", active, []).unlocked).toBe(false);
    });
    it("déverrouillé avec 3 emprunts actifs", () => {
      const active = [makeBorrow(), makeBorrow({ id: "b2" }), makeBorrow({ id: "b3" })];
      expect(getBadge("collectionneur", active, []).unlocked).toBe(true);
    });
  });

  // ── Badge profil ──────────────────────────────────────────────────────────
  describe("badge 'profil-complet'", () => {
    it("verrouillé si le profil est incomplet (défaut)", () => {
      expect(getBadge("profil-complet", [], []).unlocked).toBe(false);
    });
    it("déverrouillé si toutes les infos profil sont présentes", () => {
      localStorage.setItem(
        "userProfile",
        JSON.stringify({
          firstName: "Mouhamadou",
          lastName: "Kane",
          email: "mouhamadoukane221@gmail.com",
          phone: "+221 77 123 45 67",
          address: "Dakar, Sénégal",
        })
      );
      expect(getBadge("profil-complet", [], []).unlocked).toBe(true);
    });
    it("verrouillé si une info du profil manque (ex: phone)", () => {
      localStorage.setItem(
        "userProfile",
        JSON.stringify({
          firstName: "Mouhamadou",
          lastName: "Kane",
          email: "mouhamadoukane221@gmail.com",
          // phone manquant
          address: "Dakar",
        })
      );
      expect(getBadge("profil-complet", [], []).unlocked).toBe(false);
    });
  });

  // ── Badge sénégalais ──────────────────────────────────────────────────────
  describe("badge 'senegalais' (3 livres africains)", () => {
    it("verrouillé avec 2 livres africains", () => {
      const h = [
        makeHistory({ id: "af-1", category: "Littérature Africaine" }),
        makeHistory({ id: "af-2", category: "Littérature Africaine" }),
      ];
      expect(getBadge("senegalais", [], h).unlocked).toBe(false);
    });
    it("déverrouillé avec 3 livres africains", () => {
      const h = [
        makeHistory({ id: "af-1", category: "Littérature Africaine" }),
        makeHistory({ id: "af-2", category: "Littérature Africaine" }),
        makeHistory({ id: "af-3", category: "Littérature Africaine" }),
      ];
      expect(getBadge("senegalais", [], h).unlocked).toBe(true);
    });
  });

  // ── Nombre total de badges ────────────────────────────────────────────────
  it("retourne exactement 12 badges", () => {
    const data = computeGamificationFromActivity([], []);
    expect(data.badges).toHaveLength(12);
    expect(data.totalCount).toBe(12);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// XP et compteurs
// ══════════════════════════════════════════════════════════════════════════════
describe("computeGamificationFromActivity — XP et compteurs", () => {
  it("XP = 0 sans aucune activité", () => {
    const data = computeGamificationFromActivity([], []);
    expect(data.xp).toBe(0);
  });

  it("XP = 10 par livre + 50 par badge déverrouillé", () => {
    // 1 livre → premier-pas déverrouillé + actif non déverrouillé si pas actif
    const data = computeGamificationFromActivity([], [makeHistory()]);
    const expectedBadges = data.unlockedCount;
    expect(data.xp).toBe(1 * 10 + expectedBadges * 50);
  });

  it("totalBorrows = actifs + historique", () => {
    const data = computeGamificationFromActivity(
      [makeBorrow()],
      makeHistories(3)
    );
    expect(data.totalBorrows).toBe(4);
    expect(data.activeBorrows).toBe(1);
    expect(data.returnedBooks).toBe(3);
  });

  it("africanBooks compte les livres actifs ET de l'historique", () => {
    const active = [makeBorrow({ id: "af-001" })];
    const history = [makeHistory({ id: "af-002", category: "Littérature Africaine" })];
    const data = computeGamificationFromActivity(active, history);
    expect(data.africanBooks).toBe(2);
  });

  it("unlockedCount correspond au nombre de badges déverrouillés", () => {
    const data = computeGamificationFromActivity([], [makeHistory()]);
    const actualUnlocked = data.badges.filter((b) => b.unlocked).length;
    expect(data.unlockedCount).toBe(actualUnlocked);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// hasLateReturn
// ══════════════════════════════════════════════════════════════════════════════
describe("computeGamificationFromActivity — hasLateReturn", () => {
  it("false si aucun emprunt actif", () => {
    const data = computeGamificationFromActivity([], []);
    expect(data.hasLateReturn).toBe(false);
  });

  it("false si tous les emprunts actifs sont dans les temps", () => {
    const active = [makeBorrow({ dueDate: "2099-01-01" })];
    const data = computeGamificationFromActivity(active, []);
    expect(data.hasLateReturn).toBe(false);
  });

  it("true si au moins un emprunt actif est en retard", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
    const active = [
      makeBorrow({ id: "b1", dueDate: "2099-01-01" }), // à temps
      makeBorrow({ id: "b2", dueDate: "2024-06-01" }), // en retard
    ];
    const data = computeGamificationFromActivity(active, []);
    expect(data.hasLateReturn).toBe(true);
    vi.useRealTimers();
  });
});
