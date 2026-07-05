// @vitest-environment jsdom
//
// Tests unitaires pour borrowStore.ts
// Vérifie : emprunts, renouvellements, retours, historique, calcul des jours

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getActiveBorrows,
  addBorrow,
  renewBorrow,
  returnBorrow,
  isBookBorrowed,
  getHistory,
  getDaysLeft,
} from "@/services/borrowStore";

// ─── Constantes ────────────────────────────────────────────────────────────────
const MOCK_USER_ID = "user-test-456";
const BORROWS_KEY = `activeBorrows:${MOCK_USER_ID}`;
const HISTORY_KEY = `borrowHistory:${MOCK_USER_ID}`;

// Date de référence : 15 juin 2024 à midi UTC
const NOW = new Date("2024-06-15T12:00:00.000Z");

const mockBook = {
  id: "book-1",
  title: "Le Petit Prince",
  author: "Antoine de Saint-Exupéry",
  cover: "cover.jpg",
  category: "Littérature",
};

const mockBook2 = { ...mockBook, id: "book-2", title: "L'Étranger" };

// ─── Setup / Teardown ──────────────────────────────────────────────────────────
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("bibliotech:currentUserId", MOCK_USER_ID);
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ══════════════════════════════════════════════════════════════════════════════
// getActiveBorrows
// ══════════════════════════════════════════════════════════════════════════════
describe("getActiveBorrows", () => {
  it("retourne [] si le localStorage est vide", () => {
    expect(getActiveBorrows()).toEqual([]);
  });

  it("retourne [] si le JSON est corrompu", () => {
    localStorage.setItem(BORROWS_KEY, "invalid{{{json");
    expect(getActiveBorrows()).toEqual([]);
  });

  it("retourne [] pour un autre utilisateur (clé scopée)", () => {
    localStorage.setItem("activeBorrows:other-user", JSON.stringify([mockBook]));
    expect(getActiveBorrows()).toEqual([]);
  });

  it("retourne les emprunts stockés pour l'utilisateur courant", () => {
    localStorage.setItem(BORROWS_KEY, JSON.stringify([mockBook]));
    expect(getActiveBorrows()).toHaveLength(1);
    expect(getActiveBorrows()[0].id).toBe("book-1");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// addBorrow
// ══════════════════════════════════════════════════════════════════════════════
describe("addBorrow", () => {
  it("ajoute un emprunt avec borrowDate = aujourd'hui", () => {
    const borrow = addBorrow(mockBook);
    expect(borrow.borrowDate).toBe("2024-06-15");
  });

  it("ajoute un emprunt avec dueDate = aujourd'hui + 30 jours", () => {
    const borrow = addBorrow(mockBook);
    expect(borrow.dueDate).toBe("2024-07-15");
  });

  it("initialise renewCount à 0 et maxRenews à 3", () => {
    const borrow = addBorrow(mockBook);
    expect(borrow.renewCount).toBe(0);
    expect(borrow.maxRenews).toBe(3);
  });

  it("persiste dans localStorage sous la bonne clé", () => {
    addBorrow(mockBook);
    const stored = JSON.parse(localStorage.getItem(BORROWS_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("book-1");
  });

  it("permet d'emprunter plusieurs livres différents", () => {
    addBorrow(mockBook);
    addBorrow(mockBook2);
    expect(getActiveBorrows()).toHaveLength(2);
  });

  it("lève une erreur si le livre est déjà emprunté", () => {
    addBorrow(mockBook);
    expect(() => addBorrow(mockBook)).toThrow("déjà emprunté");
  });

  it("déclenche l'événement 'borrowsUpdated' sur window", () => {
    const handler = vi.fn();
    window.addEventListener("borrowsUpdated", handler);
    addBorrow(mockBook);
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener("borrowsUpdated", handler);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// renewBorrow
// ══════════════════════════════════════════════════════════════════════════════
describe("renewBorrow", () => {
  beforeEach(() => {
    addBorrow(mockBook);
  });

  it("retourne null si le livre n'est pas emprunté", () => {
    expect(renewBorrow("inexistant")).toBeNull();
  });

  it("incrémente renewCount de 1", () => {
    const renewed = renewBorrow("book-1");
    expect(renewed!.renewCount).toBe(1);
  });

  it("étend la dueDate de 30 jours (2024-07-15 → 2024-08-14)", () => {
    const renewed = renewBorrow("book-1");
    // Juillet a 31 jours : 15 juillet + 30 jours = 14 août
    expect(renewed!.dueDate).toBe("2024-08-14");
  });

  it("permet exactement 3 renouvellements", () => {
    expect(renewBorrow("book-1")).not.toBeNull(); // 1
    expect(renewBorrow("book-1")).not.toBeNull(); // 2
    expect(renewBorrow("book-1")).not.toBeNull(); // 3
    expect(renewBorrow("book-1")).toBeNull();      // 4 → refusé
  });

  it("retourne null dès que maxRenews est atteint", () => {
    renewBorrow("book-1");
    renewBorrow("book-1");
    renewBorrow("book-1");
    expect(renewBorrow("book-1")).toBeNull();
  });

  it("persiste la mise à jour dans localStorage", () => {
    renewBorrow("book-1");
    const stored = JSON.parse(localStorage.getItem(BORROWS_KEY)!);
    expect(stored[0].renewCount).toBe(1);
    expect(stored[0].dueDate).toBe("2024-08-14");
  });

  it("déclenche l'événement 'borrowsUpdated'", () => {
    const handler = vi.fn();
    window.addEventListener("borrowsUpdated", handler);
    renewBorrow("book-1");
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener("borrowsUpdated", handler);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// returnBorrow
// ══════════════════════════════════════════════════════════════════════════════
describe("returnBorrow", () => {
  beforeEach(() => {
    addBorrow(mockBook);
  });

  it("retourne null si le livre n'est pas emprunté", () => {
    expect(returnBorrow("inexistant")).toBeNull();
  });

  it("supprime le livre des emprunts actifs", () => {
    returnBorrow("book-1");
    expect(getActiveBorrows()).toHaveLength(0);
  });

  it("ajoute le livre à l'historique", () => {
    returnBorrow("book-1");
    expect(getHistory()).toHaveLength(1);
  });

  it("calcule daysKept = 1 si retour le jour même (valeur minimale)", () => {
    const item = returnBorrow("book-1");
    expect(item!.daysKept).toBeGreaterThanOrEqual(1);
  });

  it("calcule daysKept = 10 si retour 10 jours après", () => {
    vi.setSystemTime(new Date("2024-06-25T12:00:00.000Z"));
    const item = returnBorrow("book-1");
    expect(item!.daysKept).toBe(10);
  });

  it("status = 'returned' si retourné dans les 30 jours", () => {
    vi.setSystemTime(new Date("2024-06-25T12:00:00.000Z")); // J+10
    const item = returnBorrow("book-1");
    expect(item!.status).toBe("returned");
  });

  it("status = 'overdue' si retourné après 30 jours", () => {
    vi.setSystemTime(new Date("2024-08-01T12:00:00.000Z")); // J+47
    const item = returnBorrow("book-1");
    expect(item!.status).toBe("overdue");
  });

  it("conserve les métadonnées du livre dans l'historique", () => {
    const item = returnBorrow("book-1");
    expect(item!.title).toBe("Le Petit Prince");
    expect(item!.author).toBe("Antoine de Saint-Exupéry");
    expect(item!.category).toBe("Littérature");
    expect(item!.borrowDate).toBe("2024-06-15");
  });

  it("persiste l'historique dans localStorage", () => {
    returnBorrow("book-1");
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)!);
    expect(history).toHaveLength(1);
  });

  it("accumule l'historique sur plusieurs retours", () => {
    addBorrow(mockBook2);
    returnBorrow("book-1");
    returnBorrow("book-2");
    expect(getHistory()).toHaveLength(2);
  });

  it("insère l'entrée en tête de l'historique (plus récent en premier)", () => {
    addBorrow(mockBook2);
    returnBorrow("book-1");
    vi.setSystemTime(new Date("2024-06-20T12:00:00.000Z"));
    returnBorrow("book-2");
    const history = getHistory();
    // L'Étranger (book-2) a été rendu en dernier → doit être en tête
    expect(history[0].title).toBe("L'Étranger");
    expect(history[1].title).toBe("Le Petit Prince");
  });

  it("déclenche l'événement 'borrowsUpdated'", () => {
    const handler = vi.fn();
    window.addEventListener("borrowsUpdated", handler);
    returnBorrow("book-1");
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener("borrowsUpdated", handler);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// isBookBorrowed
// ══════════════════════════════════════════════════════════════════════════════
describe("isBookBorrowed", () => {
  it("retourne false si aucun emprunt", () => {
    expect(isBookBorrowed("book-1")).toBe(false);
  });

  it("retourne true après un emprunt", () => {
    addBorrow(mockBook);
    expect(isBookBorrowed("book-1")).toBe(true);
  });

  it("retourne false après un retour", () => {
    addBorrow(mockBook);
    returnBorrow("book-1");
    expect(isBookBorrowed("book-1")).toBe(false);
  });

  it("ne confond pas deux livres différents", () => {
    addBorrow(mockBook);
    expect(isBookBorrowed("book-2")).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getDaysLeft
// ══════════════════════════════════════════════════════════════════════════════
describe("getDaysLeft", () => {
  // Date de référence : 2024-06-15T12:00:00Z

  it("retourne ~10 jours pour une date à J+10 (arrondi au plafond)", () => {
    // new Date('2024-06-25') = 00:00 UTC → diff = 9,5j → ceil = 10
    expect(getDaysLeft("2024-06-25")).toBe(10);
  });

  it("retourne une valeur négative pour une date passée", () => {
    // new Date('2024-06-10') = 00:00 UTC, Now = 12:00 UTC → diff = -5,5j → ceil = -5
    expect(getDaysLeft("2024-06-10")).toBe(-5);
  });

  it("retourne ~30 pour la dueDate standard (J+30)", () => {
    const days = getDaysLeft("2024-07-15");
    // 2024-07-15 00:00 UTC - 2024-06-15 12:00 UTC = 29,5j → ceil = 30
    expect(days).toBe(30);
  });
});
