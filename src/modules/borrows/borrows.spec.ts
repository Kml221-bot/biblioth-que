import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import {
  BookStatus,
  BorrowStatus,
  SubscriptionPlan,
  TypeAcces,
} from "@prisma/client";
import { BorrowsRepository } from "./borrows.repository";
import { BorrowsService } from "./borrows.service";
import { QuotaService } from "./quota.service";
import { calculerAmende } from "./utils/penalty.util";

describe("calculerAmende", () => {
  it("retourne 0 sans retard, puis 300/500/800 FCFA selon les paliers", () => {
    expect(calculerAmende(0)).toBe(0);
    expect(calculerAmende(1)).toBe(300);
    expect(calculerAmende(7)).toBe(300);
    expect(calculerAmende(8)).toBe(500);
    expect(calculerAmende(14)).toBe(500);
    expect(calculerAmende(15)).toBe(800);
  });
});

describe("QuotaService", () => {
  const repository = {
    getActiveSubscription: jest.fn(),
    resetFreeQuotas: jest.fn(),
  } as unknown as jest.Mocked<BorrowsRepository>;

  let service: QuotaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QuotaService(repository);
  });

  it("autorise un plan premium sans decrementer le quota", async () => {
    repository.getActiveSubscription.mockResolvedValue({
      id: "sub-1",
      plan: SubscriptionPlan.PREMIUM,
      empruntsRestants: 0,
    });

    await expect(service.canBorrow("user-1")).resolves.toEqual({
      allowed: true,
      plan: SubscriptionPlan.PREMIUM,
      decrementFreeQuota: false,
    });
  });

  it("refuse un plan free sans emprunts restants", async () => {
    repository.getActiveSubscription.mockResolvedValue({
      id: "sub-1",
      plan: SubscriptionPlan.FREE,
      empruntsRestants: 0,
    });

    const decision = await service.canBorrow("user-1");

    expect(decision.allowed).toBe(false);
    expect(decision.decrementFreeQuota).toBe(true);
  });
});

describe("BorrowsService", () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const book = {
    id: "book-1",
    titre: "Cybersecurite",
    typeAcces: TypeAcces.BORROW_OR_BUY,
    prixLocation7j: 500,
    prixLocation30j: 800,
  };
  const borrow = {
    id: "borrow-1",
    userId: "user-1",
    bookId: "book-1",
    statut: BorrowStatus.ACTIVE,
    debut: new Date(),
    finPrevue: futureDate,
    finReelle: null,
    dureeJours: 14,
    pageActuelle: 1,
    pourcentageLu: 0,
    nbRenouvellements: 0,
    book: {
      id: "book-1",
      titre: "Cybersecurite",
      auteur: "Awa Ndiaye",
      categorie: "Informatique & Cybersecurite",
      typeAcces: TypeAcces.BORROW_OR_BUY,
      coverUrl: null,
    },
    penalties: [],
  };

  const repository = {
    findPublishedBook: jest.fn(),
    findActiveBorrowByUserAndBook: jest.fn(),
    createBorrowWithQuota: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<BorrowsRepository>;

  const quotaService = {
    canBorrow: jest.fn(),
  } as unknown as jest.Mocked<QuotaService>;

  let service: BorrowsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BorrowsService(repository, quotaService);
  });

  it("cree un emprunt si le quota est disponible et le livre empruntable", async () => {
    repository.findPublishedBook.mockResolvedValue(book);
    repository.findActiveBorrowByUserAndBook.mockResolvedValue(null);
    repository.createBorrowWithQuota.mockResolvedValue(borrow as never);
    quotaService.canBorrow.mockResolvedValue({
      allowed: true,
      plan: SubscriptionPlan.FREE,
      decrementFreeQuota: true,
    });

    const result = await service.createBorrow("user-1", {
      bookId: "book-1",
      dureeJours: 14,
    });

    expect(repository.createBorrowWithQuota).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        bookId: "book-1",
        dureeJours: 14,
        decrementFreeQuota: true,
      })
    );
    expect(result.id).toBe("borrow-1");
  });

  it("refuse la creation si le quota est epuise", async () => {
    repository.findPublishedBook.mockResolvedValue(book);
    quotaService.canBorrow.mockResolvedValue({
      allowed: false,
      reason: "Quota mensuel free epuise",
      plan: SubscriptionPlan.FREE,
      decrementFreeQuota: true,
    });

    await expect(
      service.createBorrow("user-1", {
        bookId: "book-1",
        dureeJours: 14,
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse un livre disponible uniquement a l’achat", async () => {
    repository.findPublishedBook.mockResolvedValue({
      ...book,
      typeAcces: TypeAcces.BUY_ONLY,
    });

    await expect(
      service.createBorrow("user-1", {
        bookId: "book-1",
        dureeJours: 14,
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuse un double emprunt actif du meme livre", async () => {
    repository.findPublishedBook.mockResolvedValue(book);
    quotaService.canBorrow.mockResolvedValue({
      allowed: true,
      plan: SubscriptionPlan.FREE,
      decrementFreeQuota: true,
    });
    repository.findActiveBorrowByUserAndBook.mockResolvedValue({
      id: "borrow-existing",
    });

    await expect(
      service.createBorrow("user-1", {
        bookId: "book-1",
        dureeJours: 14,
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
