import {
  BookStatus,
  BorrowStatus,
  NotificationChannel,
  PaymentType,
  SubscriptionPlan,
  UserStatus,
} from "@prisma/client";
import { AdminRepository } from "./admin.repository";
import { AdminService } from "./admin.service";
import { RevenuePeriod } from "./dto";

describe("AdminService", () => {
  const repository = {
    countActiveUsersSince: jest.fn(),
    countNewUsersSince: jest.fn(),
    countActiveBorrows: jest.fn(),
    sumCompletedTransactionsBetween: jest.fn(),
    sumPendingPenalties: jest.fn(),
    groupActiveSubscriptionsByPlan: jest.fn(),
    findCompletedTransactionsSince: jest.fn(),
    findOverdueBorrows: jest.fn(),
    updateBookStatus: jest.fn(),
    waivePenalty: jest.fn(),
    countUsers: jest.fn(),
    findUsers: jest.fn(),
    suspendUser: jest.fn(),
    approveAuthor: jest.fn(),
    findActiveUserIds: jest.fn(),
    createNotifications: jest.fn(),
  } as unknown as jest.Mocked<AdminRepository>;

  const cacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(repository, cacheManager as never);
  });

  it("retourne les KPIs overview et les met en cache", async () => {
    cacheManager.get.mockResolvedValue(undefined);
    repository.countActiveUsersSince.mockResolvedValue(12);
    repository.countNewUsersSince.mockResolvedValue(4);
    repository.countActiveBorrows.mockResolvedValue(9);
    repository.sumCompletedTransactionsBetween
      .mockResolvedValueOnce(2_000)
      .mockResolvedValueOnce(8_000)
      .mockResolvedValueOnce(25_000);
    repository.sumPendingPenalties.mockResolvedValue(1_500);
    repository.groupActiveSubscriptionsByPlan.mockResolvedValue([
      { plan: SubscriptionPlan.FREE, _count: { plan: 7 } },
      { plan: SubscriptionPlan.PREMIUM, _count: { plan: 3 } },
    ]);

    const result = await service.getOverviewStats();

    expect(result).toMatchObject({
      activeUsersThisMonth: 12,
      newUsersThisWeek: 4,
      activeBorrows: 9,
      revenueThisMonth: 25_000,
      pendingPenaltiesTotal: 1_500,
      activeSubscriptionsByPlan: [
        { plan: SubscriptionPlan.FREE, count: 7 },
        { plan: SubscriptionPlan.PREMIUM, count: 3 },
      ],
    });
    expect(cacheManager.set).toHaveBeenCalledWith(
      "admin:stats:overview",
      result,
      300_000
    );
  });

  it("aggrege les revenus par jour et source", async () => {
    repository.findCompletedTransactionsSince.mockResolvedValue([
      {
        id: "tx-1",
        type: PaymentType.BORROW,
        montantTotal: 800,
        createdAt: new Date("2026-05-27T08:00:00.000Z"),
      },
      {
        id: "tx-2",
        type: PaymentType.BORROW,
        montantTotal: 800,
        createdAt: new Date("2026-05-27T10:00:00.000Z"),
      },
      {
        id: "tx-3",
        type: PaymentType.SUBSCRIPTION,
        montantTotal: 2_000,
        createdAt: new Date("2026-05-27T11:00:00.000Z"),
      },
    ]);

    await expect(service.getRevenueStats(RevenuePeriod.MONTH)).resolves.toEqual([
      { date: "2026-05-27", montant: 1_600, source: "borrow" },
      { date: "2026-05-27", montant: 2_000, source: "subscription" },
    ]);
  });

  it("calcule les amendes dynamiques pour les emprunts en retard", async () => {
    repository.findOverdueBorrows.mockResolvedValue([
      {
        id: "borrow-1",
        statut: BorrowStatus.OVERDUE,
        finPrevue: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        user: {
          id: "user-1",
          email: "awa@example.com",
          nom: "Ndiaye",
          prenom: "Awa",
          whatsappNumber: "+221771234567",
        },
        book: {
          id: "book-1",
          titre: "Cybersecurite",
          auteur: "BiblioTech",
        },
      },
    ]);

    const [borrow] = await service.getOverdueBorrows();

    expect(borrow.montantAmendeFcfa).toBe(500);
  });

  it("publie un livre et invalide le cache admin", async () => {
    repository.updateBookStatus.mockResolvedValue({
      id: "book-1",
      titre: "Cybersecurite",
      status: BookStatus.PUBLISHED,
      publishedAt: new Date("2026-05-27T12:00:00.000Z"),
    });

    await expect(service.approveBook("book-1")).resolves.toMatchObject({
      id: "book-1",
      status: BookStatus.PUBLISHED,
      publishedAt: "2026-05-27T12:00:00.000Z",
    });
    expect(repository.updateBookStatus).toHaveBeenCalledWith(
      "book-1",
      BookStatus.PUBLISHED
    );
    expect(cacheManager.del).toHaveBeenCalledWith("admin:stats:overview");
  });

  it("cree un broadcast pour tous les utilisateurs actifs", async () => {
    repository.findActiveUserIds.mockResolvedValue([
      { id: "user-1" },
      { id: "user-2" },
    ]);
    repository.createNotifications.mockResolvedValue({ count: 2 });

    const result = await service.broadcastNotification({
      title: "Selection de la semaine",
      message: "Trois livres cyber a decouvrir.",
      channel: NotificationChannel.IN_APP,
    });

    expect(result).toEqual({
      totalRecipients: 2,
      channel: NotificationChannel.IN_APP,
      title: "Selection de la semaine",
    });
    expect(repository.createNotifications).toHaveBeenCalledWith([
      expect.objectContaining({ userId: "user-1" }),
      expect.objectContaining({ userId: "user-2" }),
    ]);
  });

  it("suspend un utilisateur", async () => {
    repository.suspendUser.mockResolvedValue({
      id: "user-1",
      email: "awa@example.com",
      nom: "Ndiaye",
      prenom: "Awa",
      role: "STUDENT",
      status: UserStatus.SUSPENDED,
      lastLoginAt: null,
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
    } as never);

    await expect(service.suspendUser("user-1")).resolves.toMatchObject({
      id: "user-1",
      status: UserStatus.SUSPENDED,
      createdAt: "2026-05-01T00:00:00.000Z",
    });
  });
});
